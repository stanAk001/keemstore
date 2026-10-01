import { v2 as cloudinary } from 'cloudinary';
import { env, cloudinaryConfigured } from '../config/env.js';
import { many, one, query } from '../config/db.js';
import { HttpError } from '../utils/httpError.js';

if (cloudinaryConfigured) {
  cloudinary.config({
    cloud_name: env.cloudinary.cloudName,
    api_key: env.cloudinary.apiKey,
    api_secret: env.cloudinary.apiSecret,
    secure: true,
  });
}

export const IMAGE_MIME = ['image/jpeg', 'image/png', 'image/webp', 'image/avif', 'image/gif'];
export const VIDEO_MIME = ['video/mp4', 'video/webm', 'video/quicktime'];
export const ALLOWED_MIME = [...IMAGE_MIME, ...VIDEO_MIME];
export const MAX_IMAGE_BYTES = 8 * 1024 * 1024;
export const MAX_VIDEO_BYTES = 60 * 1024 * 1024;
export const MAX_BYTES = MAX_VIDEO_BYTES; // multer's hard ceiling; per-type limits below

// Check magic bytes so a renamed file can't masquerade as media.
export function sniffType(buf) {
  if (!buf || buf.length < 12) return null;
  const hex = buf.subarray(0, 12).toString('hex');
  const box = buf.subarray(4, 12).toString('latin1');
  if (hex.startsWith('ffd8ff') || hex.startsWith('89504e47') || hex.startsWith('47494638')) return 'image';
  if (hex.startsWith('52494646') && buf.subarray(8, 12).toString() === 'WEBP') return 'image';
  if (box.startsWith('ftypavi')) return 'image';
  if (box.startsWith('ftyp')) return 'video'; // mp4 / mov family
  if (hex.startsWith('1a45dfa3')) return 'video'; // webm / matroska
  return null;
}

const NOT_CONFIGURED =
  'Cloudinary is not configured. Add CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY and CLOUDINARY_API_SECRET to the server environment.';

function uploadBuffer(buffer, filename, resourceType) {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      { folder: env.cloudinary.folder, resource_type: resourceType, use_filename: true, unique_filename: true, filename_override: filename },
      (err, result) => (err ? reject(err) : resolve(result)),
    );
    stream.end(buffer);
  });
}

function saveUpload(r, { filename, alt, caption, credit }, userId) {
  return one(
    `insert into media (public_id, url, filename, alt, caption, credit, type, format, width, height, bytes, duration, uploaded_by)
     values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13) returning *`,
    [r.public_id, r.secure_url, String(filename || r.original_filename || 'file').slice(0, 200), alt ?? null, caption ?? null,
      credit ?? null, r.resource_type === 'video' ? 'video' : 'image', r.format, r.width, r.height, r.bytes, r.duration ?? null, userId],
  );
}

export async function uploadFile(file, meta, userId) {
  if (!cloudinaryConfigured) throw new HttpError(503, NOT_CONFIGURED);
  const kind = sniffType(file.buffer);
  if (!ALLOWED_MIME.includes(file.mimetype) || !kind) {
    throw new HttpError(400, 'Only images (JPEG, PNG, WebP, AVIF, GIF) or videos (MP4, WebM, MOV) are allowed');
  }
  if (kind === 'image' && file.size > MAX_IMAGE_BYTES) throw new HttpError(400, 'Images must be under 8 MB');
  const r = await uploadBuffer(file.buffer, file.originalname, kind);
  return saveUpload(r, { ...meta, filename: file.originalname }, userId);
}

/**
 * Add media from a URL. With Cloudinary configured, the file is copied into
 * your Cloudinary account (Cloudinary fetches it, not this server), so the
 * site no longer depends on the original host. Otherwise the URL is stored as-is.
 */
export async function addFromUrl(data, userId) {
  const filename = data.filename || decodeURIComponent(new URL(data.url).pathname.split('/').pop() || 'file');
  const isOwnCloudinary = cloudinaryConfigured && data.url.includes(`res.cloudinary.com/${env.cloudinary.cloudName}/`);

  if (cloudinaryConfigured && !isOwnCloudinary) {
    try {
      const r = await cloudinary.uploader.upload(data.url, {
        folder: env.cloudinary.folder,
        resource_type: 'auto',
        use_filename: true,
        unique_filename: true,
        filename_override: filename,
      });
      if (!['image', 'video'].includes(r.resource_type)) {
        await cloudinary.uploader.destroy(r.public_id, { resource_type: r.resource_type }).catch(() => {});
        throw new HttpError(400, 'That link is not an image or video');
      }
      return { ...(await saveUpload(r, { ...data, filename }, userId)), uploaded: true };
    } catch (err) {
      if (err instanceof HttpError) throw err;
      const reason = err?.error?.message || err?.message || 'unknown error';
      if (/invalid signature|invalid api_key|unknown api_key|cloud_name|disabled account/i.test(reason)) {
        throw new HttpError(502, 'Cloudinary rejected the account details. Check CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY and CLOUDINARY_API_SECRET on the server.');
      }
      throw new HttpError(400, `Couldn't copy that file into Cloudinary (${reason}). Make sure the link opens the image or video itself, not a web page.`);
    }
  }

  const type = /\.(mp4|webm|mov)(\?|$)/i.test(data.url) ? 'video' : 'image';
  const row = await one(
    `insert into media (url, filename, alt, caption, credit, type, uploaded_by)
     values ($1, $2, $3, $4, $5, $6, $7) returning *`,
    [data.url, filename.slice(0, 200), data.alt ?? null, data.caption ?? null, data.credit ?? null, type, userId],
  );
  return { ...row, uploaded: false };
}

export async function listMedia({ q, limit = 60, offset = 0 }) {
  const params = [];
  let where = '';
  if (q) {
    params.push(`%${q}%`);
    where = 'where filename ilike $1 or alt ilike $1 or caption ilike $1';
  }
  const [items, total] = await Promise.all([
    many(`select * from media ${where} order by created_at desc limit ${Number(limit)} offset ${Number(offset)}`, params),
    one(`select count(*)::int as total from media ${where}`, params),
  ]);
  return { items, total: total.total };
}

/** Find everywhere an image URL is referenced across content. */
export async function mediaUsage(url) {
  const like = `%${url}%`;
  return many(
    `select 'product' as type, p.id, p.name as title from products p
       where exists (select 1 from product_images i where i.product_id = p.id and i.url = $1)
     union all select 'guide', id, title from guides
       where hero_image = $1 or content::text like $2 or seo::text like $2 or buying_considerations::text like $2
     union all select 'category', id, name from categories where image_url = $1 or seo::text like $2
     union all select 'trend', id, title from trends where image_url = $1 or seo::text like $2
     union all select 'collection', id, title from collections where image_url = $1
     union all select 'seasonal_page', id, title from seasonal_pages where hero_image = $1
     union all select 'seasonal_section', s.page_id, p.title from seasonal_sections s join seasonal_pages p on p.id = s.page_id
       where s.config::text like $2
     union all select 'homepage_section', id, coalesce(title, key) from homepage_sections where config::text like $2
     union all select 'pinterest', id, entity_type || ' #' || entity_id from pinterest_metadata where image_url = $1
     union all select 'setting', 0, key from site_settings where value::text like $2`,
    [url, like],
  );
}

export async function deleteMedia(id) {
  const item = await one('select * from media where id = $1', [id]);
  if (!item) return null;
  if (item.public_id && cloudinaryConfigured) {
    await cloudinary.uploader.destroy(item.public_id, { resource_type: item.type === 'video' ? 'video' : 'image' }).catch((err) => console.warn('[media] cloudinary destroy failed', err.message));
  }
  await query('delete from media where id = $1', [id]);
  return item;
}
