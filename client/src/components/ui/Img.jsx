import { useEffect, useRef, useState } from 'react';
import { sized, srcSet } from '../../lib/image.js';
import { isVideo, posterFor, sizedVideo } from '../../lib/media.js';

const reducedMotion = () =>
  typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

/**
 * Muted looping video used wherever an image URL points at a video.
 * Plays only while on screen; shows its poster frame for reduced-motion users.
 */
function LoopVideo({ src, alt, width, className, onError }) {
  const ref = useRef(null);
  const [ready, setReady] = useState(false);
  const poster = posterFor(src, width);
  const still = reducedMotion();

  useEffect(() => {
    const el = ref.current;
    if (!el || still || typeof IntersectionObserver === 'undefined') return;
    const io = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) el.play().catch(() => {});
      else el.pause();
    }, { threshold: 0.15 });
    io.observe(el);
    return () => io.disconnect();
  }, [still]);

  return (
    <>
      {poster && <img src={poster} alt="" aria-hidden className={`absolute inset-0 h-full w-full object-cover ${className}`} />}
      {!still && (
        <video
          ref={ref}
          src={sizedVideo(src, width)}
          muted
          loop
          playsInline
          preload="metadata"
          aria-label={alt || undefined}
          onLoadedData={() => setReady(true)}
          onError={onError}
          className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-700 ${ready ? 'opacity-100' : 'opacity-0'} ${className}`}
        />
      )}
    </>
  );
}

/**
 * Responsive image with a fixed aspect box (no layout shift), lazy loading,
 * a soft fade-in, and a designed fallback if the image fails.
 * Video URLs (.mp4/.webm, Cloudinary video) render as a silent looping video.
 */
export default function Img({
  src,
  alt = '',
  aspect, // width / height, e.g. 4/5. Omit to fill the parent.
  sizes = '100vw',
  width = 1080,
  priority = false,
  className = '',
  imgClassName = '',
  label,
}) {
  const [status, setStatus] = useState(src ? 'loading' : 'error');
  const [tall, setTall] = useState(false);
  const box = aspect ? { aspectRatio: String(aspect) } : undefined;
  const video = isVideo(src);

  return (
    <div className={`relative overflow-hidden bg-paper-2 ${aspect ? '' : 'h-full w-full'} ${className}`} style={box}>
      {status !== 'error' && video && <LoopVideo src={src} alt={alt} width={Math.min(width * 1.4, 1920)} className={imgClassName} onError={() => setStatus('error')} />}
      {status !== 'error' && !video && (
        <img
          src={sized(src, width, aspect ? { height: Math.round(width / aspect) } : {})}
          srcSet={srcSet(src, 1800, aspect)}
          sizes={sizes}
          alt={alt}
          loading={priority ? 'eager' : 'lazy'}
          fetchPriority={priority ? 'high' : undefined}
          decoding="async"
          onLoad={(e) => {
            // Tall portrait photos (people, outfits) crop from the top, keeping faces in frame.
            const im = e.currentTarget;
            if (im.naturalWidth && im.naturalHeight / im.naturalWidth > 1.25) setTall(true);
            setStatus('loaded');
          }}
          onError={() => setStatus('error')}
          className={`absolute inset-0 h-full w-full object-cover transition-[opacity,transform] duration-700 ease-[var(--ease-out-soft)] ${
            status === 'loaded' ? 'opacity-100' : 'opacity-0'
          } ${tall ? 'object-top' : ''} ${imgClassName}`}
        />
      )}
      {status === 'error' && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-1 text-faint" role={alt ? 'img' : undefined} aria-label={alt || undefined}>
          <span className="font-serif text-3xl italic leading-none">k.</span>
          <span className="eyebrow text-[0.6rem] text-faint">{label || 'Image unavailable'}</span>
        </div>
      )}
    </div>
  );
}
