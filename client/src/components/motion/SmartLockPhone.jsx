// Live smart-lock app on a modern phone: locked → tap Unlock → unlocking →
// unlocked (Dynamic Island live activity) → living-room lights on.
import { useRef } from 'react';
import { useTimeline, PhoneFrame, DynamicIsland, Stage, FloatCard, CardLabel } from './device.jsx';

const TIMELINE = [
  ['locked', 2200],
  ['press', 450],
  ['unlocking', 1300],
  ['unlocked', 2600],
  ['lights', 2000],
];
const GREEN = '#34c759';
const ACCENT = '#e2552b';

function LockGlyph({ open, color }) {
  return (
    <svg viewBox="0 0 24 24" width="2.6em" height="2.6em" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" aria-hidden>
      <rect x="5" y="11" width="14" height="10" rx="2.5" />
      <path d={open ? 'M8 11V7.5a4 4 0 0 1 7.6-1.7' : 'M8 11V7.5a4 4 0 0 1 8 0V11'} style={{ transition: 'd 400ms ease' }} />
      <circle cx="12" cy="16" r="1.2" fill={color} stroke="none" />
    </svg>
  );
}

function Ring({ phase }) {
  const r = 44;
  const c = 2 * Math.PI * r;
  const unlocked = phase === 'unlocked' || phase === 'lights';
  const color = unlocked ? GREEN : phase === 'unlocking' ? '#f5f5f7' : ACCENT;
  return (
    <div className="relative mx-auto mt-[1.4em] h-[11.5em] w-[11.5em]">
      <svg viewBox="0 0 100 100" className="h-full w-full -rotate-90" aria-hidden>
        <circle cx="50" cy="50" r={r} fill="none" stroke="#232326" strokeWidth="5" />
        <circle
          cx="50" cy="50" r={r} fill="none" stroke={color} strokeWidth="5" strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c * (phase === 'unlocking' ? 0.38 : 0)}
          style={{ transition: 'stroke-dashoffset 1200ms cubic-bezier(0.65, 0, 0.35, 1), stroke 400ms ease' }}
          className={phase === 'unlocking' ? 'origin-center animate-[spin_1.3s_linear_infinite]' : ''}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center gap-[0.35em]">
        <LockGlyph open={unlocked} color={unlocked ? GREEN : '#f5f5f7'} />
        <span className="text-[0.95em] font-semibold text-white">{unlocked ? 'Unlocked' : phase === 'unlocking' ? 'Unlocking…' : 'Locked'}</span>
      </div>
    </div>
  );
}

function LockApp({ phase }) {
  const unlocked = phase === 'unlocked' || phase === 'lights';
  const lightsOn = phase === 'lights';
  return (
    <div className="px-[1.35em] pt-[4.6em] text-white">
      <p className="text-[0.66em] font-medium tracking-[0.12em] text-white/45 uppercase">Home · 4 devices</p>
      <p className="mt-[0.2em] text-[1.55em] font-semibold tracking-[-0.01em]">Front Door</p>
      <Ring phase={phase} />
      <div className="mt-[1.5em] grid grid-cols-2 gap-[0.6em] text-[0.88em] font-medium">
        <span className="relative flex h-[2.9em] items-center justify-center overflow-hidden rounded-[0.9em]"
          style={{ background: phase === 'press' ? '#3a3a3f' : '#1d1d20', transform: phase === 'press' ? 'scale(0.95)' : 'none', transition: 'transform 180ms ease, background 200ms ease' }}>
          Unlock
          {phase === 'press' && <span className="absolute h-[1.6em] w-[1.6em] animate-ping rounded-full bg-white/40" />}
        </span>
        <span className="flex h-[2.9em] items-center justify-center rounded-[0.9em] bg-[#1d1d20] text-white/70">Lock</span>
      </div>
      <div className="mt-[0.7em] grid grid-cols-2 gap-[0.6em]">
        <div className="rounded-[1em] p-[0.8em] transition-all duration-500" style={{ background: lightsOn ? '#f4c86a' : '#1d1d20', color: lightsOn ? '#1a1406' : '#fff' }}>
          <div className="flex items-center justify-between">
            <svg viewBox="0 0 24 24" width="1.4em" height="1.4em" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><path d="M9 18h6M10 21h4M12 3a6 6 0 0 0-3.5 10.9c.6.4 1 1.1 1 1.9V16h5v-.2c0-.8.4-1.5 1-1.9A6 6 0 0 0 12 3z" /></svg>
            <span className="relative h-[1.1em] w-[1.9em] rounded-full transition-colors duration-300" style={{ background: lightsOn ? '#1a1406' : '#3a3a3f' }}>
              <span className="absolute top-[0.12em] h-[0.86em] w-[0.86em] rounded-full bg-white transition-all duration-300" style={{ left: lightsOn ? '0.92em' : '0.12em' }} />
            </span>
          </div>
          <p className="mt-[0.7em] text-[0.8em] font-semibold">Living room</p>
          <p className="text-[0.7em] opacity-60">{lightsOn ? 'On · 80%' : 'Off'}</p>
        </div>
        <div className="rounded-[1em] bg-[#1d1d20] p-[0.8em]">
          <svg viewBox="0 0 24 24" width="1.4em" height="1.4em" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><path d="M14 14.8V5a2 2 0 1 0-4 0v9.8a4 4 0 1 0 4 0z" /></svg>
          <p className="mt-[0.7em] text-[0.8em] font-semibold">Climate</p>
          <p className="text-[0.7em] text-white/60">21° · {unlocked ? 'Home' : 'Away'}</p>
        </div>
      </div>
    </div>
  );
}

export default function SmartLockPhone({ label = 'Animated smart lock app on a phone' }) {
  const ref = useRef(null);
  const phase = useTimeline(ref, TIMELINE, 3);
  const unlocked = phase === 'unlocked' || phase === 'lights';
  return (
    <Stage stageRef={ref} label={label} glow={unlocked ? 'rgba(52,199,89,.16)' : 'rgba(226,85,43,.18)'}>
      <div style={{ animation: 'float-y 7s ease-in-out infinite' }}>
        <PhoneFrame
          island={
            <DynamicIsland expanded={phase === 'unlocked'}>
              <span className="flex h-[2.1em] w-[2.1em] shrink-0 items-center justify-center rounded-full" style={{ background: GREEN }}>
                <svg viewBox="0 0 24 24" width="1.1em" height="1.1em" fill="none" stroke="#fff" strokeWidth="2.4" strokeLinecap="round"><path d="M5 12.5l4.5 4.5L19 7.5" /></svg>
              </span>
              <span className="min-w-0 leading-tight">
                <span className="block text-[0.72em] text-white/60">Front Door</span>
                <span className="block text-[0.9em] font-semibold text-white">Unlocked</span>
              </span>
              <span className="ml-auto text-[0.7em] text-white/50">now</span>
            </DynamicIsland>
          }
        >
          <LockApp phase={phase} />
        </PhoneFrame>
      </div>
      <FloatCard className="top-[18%] left-[14%]" delay={0.6}>
        <CardLabel>Auto-lock</CardLabel>
        <p className="text-[1em] font-semibold">In 30 seconds</p>
      </FloatCard>
      <FloatCard className="right-[13%] bottom-[20%]" delay={1.4}>
        <CardLabel dot="#e2552b">Porch camera</CardLabel>
        <p className="text-[1em] font-semibold">Live · 1 visitor</p>
      </FloatCard>
    </Stage>
  );
}
