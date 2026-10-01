// Shared building blocks for code-rendered motion scenes: a timeline hook,
// the phone (titanium frame + Dynamic Island), a scaling stage and floating
// info cards. Everything is sized in `em`, so a scene scales with its stage.
import { useEffect, useState } from 'react';

const prefersStill = () => typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

/**
 * Step through `timeline` ([name, ms][]) while the stage is on screen.
 * Reduced-motion users get a single representative frame (`stillIndex`).
 */
export function useTimeline(ref, timeline, stillIndex = timeline.length - 1) {
  const still = prefersStill();
  const [i, setI] = useState(still ? stillIndex : 0);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el || typeof IntersectionObserver === 'undefined') return setVisible(true);
    const io = new IntersectionObserver(([e]) => setVisible(e.isIntersecting), { threshold: 0.2 });
    io.observe(el);
    return () => io.disconnect();
  }, [ref]);

  useEffect(() => {
    if (still || !visible) return;
    const t = setTimeout(() => setI((n) => (n + 1) % timeline.length), timeline[i][1]);
    return () => clearTimeout(t);
  }, [i, visible, still, timeline]);

  return timeline[i][0];
}

/**
 * A clock for continuous scenes: counts 0…ticks-1 every `ms` while the stage is
 * on screen. Reduced-motion users get a fixed, representative frame.
 */
export function useTicker(ref, { ticks, ms = 100, stillAt = 0 }) {
  const still = prefersStill();
  const [t, setT] = useState(still ? stillAt : 0);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el || typeof IntersectionObserver === 'undefined') return setVisible(true);
    const io = new IntersectionObserver(([e]) => setVisible(e.isIntersecting), { threshold: 0.2 });
    io.observe(el);
    return () => io.disconnect();
  }, [ref]);
  useEffect(() => {
    if (still || !visible) return undefined;
    const id = setInterval(() => setT((n) => (n + 1) % ticks), ms);
    return () => clearInterval(id);
  }, [still, visible, ticks, ms]);
  return t;
}

export function StatusBar({ battery = 78, charging = false, signal = true }) {
  return (
    <div className="absolute inset-x-0 top-0 flex items-center justify-between px-[1.6em] pt-[0.95em] text-[0.82em] font-semibold text-white">
      <span>9:41</span>
      <span className="flex items-center gap-[0.35em]">
        <span className="flex items-end gap-[0.12em]" style={{ opacity: signal ? 1 : 0.35 }}>
          {[0.35, 0.5, 0.65, 0.8].map((h) => <span key={h} className="w-[0.22em] rounded-[0.1em] bg-white" style={{ height: `${h}em` }} />)}
        </span>
        <span className="relative h-[0.72em] w-[1.5em] rounded-[0.25em] border border-white/60 p-[0.1em]">
          <span className="block h-full rounded-[0.12em] transition-[width] duration-700" style={{ width: `${battery}%`, background: charging ? '#34c759' : '#fff' }} />
        </span>
      </span>
    </div>
  );
}

/** Dynamic Island that can expand into a live-activity pill. */
export function DynamicIsland({ expanded, children }) {
  return (
    <div
      className="absolute left-1/2 top-[0.55em] z-20 flex -translate-x-1/2 items-center overflow-hidden bg-black"
      style={{
        width: expanded ? '15.6em' : '6.4em',
        height: expanded ? '3.5em' : '1.85em',
        borderRadius: expanded ? '1.75em' : '1em',
        transition: 'all 520ms cubic-bezier(0.2, 0.9, 0.25, 1.15)',
      }}
    >
      <div className={`flex w-full items-center gap-[0.6em] px-[0.8em] transition-opacity duration-300 ${expanded ? 'opacity-100 delay-200' : 'opacity-0'}`}>
        {children}
      </div>
    </div>
  );
}

/** Modern phone: brushed natural-titanium frame, thin bezels, home indicator. */
export function PhoneFrame({ children, statusBar, island }) {
  return (
    <div
      className="relative shrink-0 rounded-[3.1em] p-[0.5em]"
      style={{
        width: '19.4em',
        height: '40.6em',
        background: 'linear-gradient(140deg, #8f8a82 0%, #e4e0d9 22%, #8a857d 48%, #d8d3cb 74%, #7f7a72 100%)',
        boxShadow: '0 2.5em 5em -1.5em rgba(0,0,0,.65), inset 0 0 0 0.08em rgba(255,255,255,.35)',
      }}
    >
      <span className="absolute -left-[0.2em] top-[8em] h-[2.2em] w-[0.22em] rounded-l bg-[#8a857d]" />
      <span className="absolute -left-[0.2em] top-[11.4em] h-[3.4em] w-[0.22em] rounded-l bg-[#8a857d]" />
      <span className="absolute -right-[0.2em] top-[10em] h-[5em] w-[0.22em] rounded-r bg-[#8a857d]" />
      <div className="relative h-full w-full overflow-hidden rounded-[2.65em] bg-[#0a0a0b]">
        {statusBar ?? <StatusBar />}
        {island ?? <DynamicIsland expanded={false} />}
        {children}
        <span className="absolute bottom-[0.55em] left-1/2 h-[0.3em] w-[7em] -translate-x-1/2 rounded-full bg-white/80" />
      </div>
    </div>
  );
}

/**
 * Dark stage that scales its contents to the available height. The size
 * container wraps the stage because container units resolve against an ancestor.
 */
export function Stage({ stageRef, label, glow, children }) {
  return (
    <div ref={stageRef} role="img" aria-label={label} className="@container h-full w-full" style={{ containerType: 'size' }}>
      <div className="relative flex h-full w-full items-center justify-center overflow-hidden bg-[#141210]" style={{ fontSize: 'clamp(3px, 1.8cqh, 15px)' }}>
        <div className="pointer-events-none absolute inset-0" aria-hidden
          style={{ background: `radial-gradient(40% 55% at 50% 55%, ${glow}, transparent 70%)`, transition: 'background 800ms ease' }} />
        {children}
      </div>
    </div>
  );
}

/** Small floating info card; only shown when the stage is wide enough. */
export function FloatCard({ className = '', children, delay = 0 }) {
  return (
    <div className={`absolute hidden rounded-[0.9em] bg-[#f4f0e8] px-[1.1em] py-[0.8em] text-[#171411] shadow-[0_1.2em_2.4em_-1em_rgba(0,0,0,.6)] @2xl:block ${className}`}
      style={{ animation: `float-y 6s ease-in-out ${delay}s infinite` }}>
      {children}
    </div>
  );
}

export function CardLabel({ dot, children }) {
  return (
    <p className="flex items-center gap-[0.4em] text-[0.7em] tracking-[0.12em] text-[#6b6358] uppercase">
      {dot && <span className="h-[0.5em] w-[0.5em] animate-pulse rounded-full" style={{ background: dot }} />}
      {children}
    </p>
  );
}
