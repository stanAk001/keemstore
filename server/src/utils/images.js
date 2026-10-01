/** Return a resized, compressed variant URL for known image CDNs. */
export function sizedImage(url, width = 1200) {
  if (!url) return url;
  try {
    const u = new URL(url);
    if (u.hostname === 'images.unsplash.com') {
      u.searchParams.set('w', String(width));
      u.searchParams.set('q', '80');
      u.searchParams.set('auto', 'format');
      u.searchParams.set('fit', 'crop');
      return u.toString();
    }
    if (u.hostname === 'res.cloudinary.com' && u.pathname.includes('/image/upload/')) {
      return url.replace('/image/upload/', `/image/upload/c_limit,w_${width},q_auto,f_auto/`);
    }
  } catch {
    /* not a URL we can transform */
  }
  return url;
}

/**
 * Social previews need a still: map a video URL to a poster frame.
 * `siteUrl` makes the site's own /media/*.mp4 videos absolute (their .jpg sits beside them).
 */
export function stillImage(url, siteUrl = '') {
  if (!url || !/\.(mp4|webm|mov)(\?|#|$)/i.test(url)) return url;
  if (/^\/media\/[\w-]+\.mp4$/.test(url)) return `${siteUrl}${url.replace(/\.mp4$/, '.jpg')}`;
  const mixkit = url.match(/assets\.mixkit\.co\/videos\/(\d+)\//);
  if (mixkit) return `https://assets.mixkit.co/videos/${mixkit[1]}/${mixkit[1]}-thumb-720-0.jpg`;
  const cld = url.match(/^(https:\/\/res\.cloudinary\.com\/[^/]+\/video\/upload\/)(.+?)\.[a-z0-9]+$/i);
  if (cld) return `${cld[1]}so_0,w_1200,q_auto,f_jpg/${cld[2]}.jpg`;
  return null; // unknown video host: better no image than a broken one
}
