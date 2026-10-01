// Helpers for video URLs used in place of images.

export function isVideo(url) {
  if (!url || typeof url !== 'string') return false;
  return /\.(mp4|webm|mov)(\?|#|$)/i.test(url) || /res\.cloudinary\.com\/[^/]+\/video\/upload\//.test(url);
}

/** A still frame to show before the video plays (and for reduced motion). */
export function posterFor(url, width = 1280) {
  if (!url) return undefined;
  const cld = url.match(/^(https:\/\/res\.cloudinary\.com\/[^/]+\/video\/upload\/)(.+?)(\.[a-z0-9]+)?$/i);
  if (cld) return `${cld[1]}so_0,w_${width},q_auto,f_jpg/${cld[2]}.jpg`;
  const mixkit = url.match(/assets\.mixkit\.co\/videos\/(\d+)\//);
  if (mixkit) return `https://assets.mixkit.co/videos/${mixkit[1]}/${mixkit[1]}-thumb-720-0.jpg`;
  // Videos shipped with the site (client/public/media) have a .jpg still beside them.
  if (/^\/media\/[\w-]+\.mp4$/.test(url)) return url.replace(/\.mp4$/, '.jpg');
  return undefined;
}

/** Smaller, auto-codec delivery for Cloudinary videos. */
export function sizedVideo(url, width = 1280) {
  if (!url) return url;
  if (/res\.cloudinary\.com\/[^/]+\/video\/upload\//.test(url) && !/\/video\/upload\/[a-z]+_/.test(url)) {
    return url.replace('/video/upload/', `/video/upload/w_${width},q_auto,vc_auto/`);
  }
  return url;
}
