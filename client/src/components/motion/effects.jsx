// Small, purposeful motion pieces. Each one:
//  - respects prefers-reduced-motion (shows a still, complete state),
//  - never shifts layout (sizes are reserved up front),
//  - pauses when it can't be seen.
import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';

export const prefersReducedMotion = () =>
  typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

/**
 * Cycles through `words` in place. All words share one grid cell, so the box is
 * always as wide as the longest word — surrounding text never jumps.
 */
export function RotatingWord({ words, interval = 2600, className = '' }) {
  const list = words.filter(Boolean);
  const [i, setI] = useState(0);
  const ref = useRef(null);

  useEffect(() => {
    if (list.length < 2 || prefersReducedMotion()) return undefined;
    let visible = true;
    const io = typeof IntersectionObserver !== 'undefined'
      ? new IntersectionObserver(([e]) => { visible = e.isIntersecting; })
      : null;
    if (io && ref.current) io.observe(ref.current);
    const id = setInterval(() => {
      if (visible && !document.hidden) setI((n) => (n + 1) % list.length);
    }, interval);
    return () => { clearInterval(id); io?.disconnect(); };
  }, [list.length, interval]);

  if (!list.length) return null;
  return (
    <>
      {/* Screen readers hear one stable word, not a ticking list. */}
      <span className="sr-only">{list[0]}</span>
      <span ref={ref} aria-hidden className={`inline-grid overflow-hidden pb-[0.12em] align-bottom ${className}`}>
        {list.map((w, n) => {
          const state = n === i ? 'translate-y-0 opacity-100' : n === (i - 1 + list.length) % list.length ? '-translate-y-full opacity-0' : 'translate-y-full opacity-0';
          return (
            // Words are drawn with CSS content (not DOM text) so the page text —
            // what search engines and copy/paste see — stays "…worth keeping."
            <span key={w} data-word={w} className={`[grid-area:1/1] transition-[transform,opacity] duration-700 ease-[var(--ease-out-soft)] before:content-[attr(data-word)] ${state}`} />
          );
        })}
      </span>
    </>
  );
}

/**
 * Endless ticker. The list is rendered twice and the track slides by half its
 * width, so the loop is seamless. Hover (or focus) pauses it.
 */
export function Marquee({ items, speed = 5, label = 'Trending now' }) {
  if (!items?.length) return null;
  const duration = `${Math.max(items.length * speed, 20)}s`;
  const row = (copy) =>
    items.map((it) => (
      <li key={`${copy}-${it.href}-${it.label}`} aria-hidden={copy ? true : undefined} className="flex shrink-0 items-center">
        <Link to={it.href} tabIndex={copy ? -1 : undefined} className="font-serif text-[1.35rem] leading-none whitespace-nowrap text-paper transition-colors hover:text-accent-soft md:text-[1.7rem]">
          {it.label}
        </Link>
        <span className="mx-6 h-1.5 w-1.5 rounded-full bg-accent md:mx-9" aria-hidden />
      </li>
    ));
  return (
    <div className="group relative flex items-center overflow-hidden bg-ink py-4 md:py-5" role="region" aria-label={label}>
      <span className="relative z-10 flex shrink-0 items-center gap-2 bg-ink pr-5 pl-4 font-mono text-[0.62rem] tracking-[0.16em] text-paper/60 uppercase sm:pl-6 lg:pl-10">
        <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-accent" aria-hidden /> {label}
      </span>
      <div className="relative min-w-0 flex-1 overflow-hidden [mask-image:linear-gradient(90deg,transparent,#000_6%,#000_94%,transparent)]">
        <ul className="flex w-max animate-[marquee_var(--d)_linear_infinite] group-focus-within:[animation-play-state:paused] group-hover:[animation-play-state:paused]" style={{ '--d': duration }}>
          {row(0)}
          {row(1)}
        </ul>
      </div>
    </div>
  );
}

/**
 * Pointer-driven depth for a group of tiles (fine pointers only). Sets
 * --px/--py (-1…1) on the container; tiles read them with their own depth.
 */
export function useParallax(ref) {
  useEffect(() => {
    const el = ref.current;
    if (!el || prefersReducedMotion() || !window.matchMedia?.('(pointer: fine)').matches) return undefined;
    el.style.setProperty('--ps', '1.06');
    let frame = 0;
    const move = (e) => {
      const r = el.getBoundingClientRect();
      const x = ((e.clientX - r.left) / r.width) * 2 - 1;
      const y = ((e.clientY - r.top) / r.height) * 2 - 1;
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        el.style.setProperty('--px', x.toFixed(3));
        el.style.setProperty('--py', y.toFixed(3));
      });
    };
    const leave = () => {
      cancelAnimationFrame(frame);
      el.style.setProperty('--px', '0');
      el.style.setProperty('--py', '0');
    };
    el.addEventListener('pointermove', move);
    el.addEventListener('pointerleave', leave);
    return () => {
      cancelAnimationFrame(frame);
      el.removeEventListener('pointermove', move);
      el.removeEventListener('pointerleave', leave);
    };
  }, [ref]);
}

/** Style for a tile inside a useParallax container. depth = max shift in px. */
export const parallaxStyle = (depth) => ({
  transform: `translate3d(calc(var(--px, 0) * ${depth}px), calc(var(--py, 0) * ${depth}px), 0) scale(var(--ps, 1))`,
  transition: 'transform 700ms cubic-bezier(0.22, 1, 0.36, 1)',
});

/** Thin accent bar at the very top showing how far through `targetRef` you've read. */
export function ReadingProgress({ targetRef }) {
  const bar = useRef(null);
  useEffect(() => {
    let frame = 0;
    const update = () => {
      frame = 0;
      const el = targetRef.current;
      if (!el || !bar.current) return;
      const r = el.getBoundingClientRect();
      const total = r.height - window.innerHeight;
      const p = total > 0 ? Math.min(Math.max(-r.top / total, 0), 1) : 1;
      bar.current.style.transform = `scaleX(${p})`;
    };
    const onScroll = () => { if (!frame) frame = requestAnimationFrame(update); };
    update();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
    };
  }, [targetRef]);
  return <div ref={bar} aria-hidden className="fixed inset-x-0 top-0 z-[70] h-[3px] origin-left bg-accent" style={{ transform: 'scaleX(0)' }} />;
}
