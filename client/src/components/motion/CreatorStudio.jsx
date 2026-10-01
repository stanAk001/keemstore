// Creator studio: a phone filming under a ring light. Ready → recording (live
// timer, audio levels, Dynamic Island activity) → clip saved. 12s loop.
import { useRef } from 'react';
import { useTicker, PhoneFrame, DynamicIsland, StatusBar, Stage, FloatCard, CardLabel } from './device.jsx';

const RED = '#ff453a';
const TICKS = 120; // 100ms each
const REC_START = 15;
const REC_END = 105;

function state(t) {
  if (t < REC_START) return { phase: 'ready', secs: 0 };
  if (t < REC_END) return { phase: 'recording', secs: Math.floor((t - REC_START) / 10) };
  return { phase: 'saved', secs: Math.floor((REC_END - REC_START) / 10) };
}

const clock = (s) => `00:${String(s).padStart(2, '0')}`;

/** Level meter: bars bounce only while recording. */
function Levels({ live }) {
  const bars = [0.5, 0.8, 0.35, 0.95, 0.6, 0.75, 0.4, 0.9, 0.55, 0.7, 0.3, 0.85];
  return (
    <div className="flex h-[1.6em] items-center gap-[0.18em]" aria-hidden>
      {bars.map((h, i) => (
        <span
          key={i}
          className="w-[0.22em] origin-center rounded-full bg-white/85"
          style={{
            height: `${h * 100}%`,
            animation: live ? `eq-bar ${0.7 + (i % 4) * 0.18}s ease-in-out ${i * 0.07}s infinite` : 'none',
            transform: live ? undefined : 'scaleY(0.2)',
          }}
        />
      ))}
    </div>
  );
}

function Viewfinder({ phase, secs }) {
  const recording = phase === 'recording';
  return (
    <div className="absolute inset-0">
      {/* Warm, ring-lit backdrop with a subject silhouette. */}
      <div className="absolute inset-0" style={{ background: 'radial-gradient(60% 45% at 50% 42%, #6b4a3a 0%, #2a1d17 55%, #120d0b 100%)' }} />
      <div className="absolute left-1/2 top-[27%] h-[7.2em] w-[6em] -translate-x-1/2 rounded-full" style={{ background: 'radial-gradient(circle at 45% 38%, #c99a7c, #7a5442 70%)' }} />
      <div className="absolute left-1/2 top-[43%] h-[14em] w-[15em] -translate-x-1/2 rounded-t-[7em]" style={{ background: 'linear-gradient(180deg, #3b3f52, #23252f)' }} />
      {/* Catchlight from the ring light. */}
      <div className="absolute left-1/2 top-[18%] h-[11em] w-[11em] -translate-x-1/2 rounded-full border-[0.35em] border-white/10" />
      {/* Rule-of-thirds grid. */}
      <div className="absolute inset-0 opacity-25" aria-hidden
        style={{ backgroundImage: 'linear-gradient(90deg, transparent 33%, #fff 33%, #fff calc(33% + 1px), transparent calc(33% + 1px), transparent 66%, #fff 66%, #fff calc(66% + 1px), transparent calc(66% + 1px)), linear-gradient(180deg, transparent 33%, #fff 33%, #fff calc(33% + 1px), transparent calc(33% + 1px), transparent 66%, #fff 66%, #fff calc(66% + 1px), transparent calc(66% + 1px))' }} />
      {/* Face-tracking frame. */}
      <div className="absolute left-1/2 top-[24%] h-[9em] w-[8.4em] -translate-x-1/2 rounded-[0.6em] border-[0.14em] border-[#ffd60a] transition-opacity duration-500"
        style={{ opacity: phase === 'ready' ? 0.9 : 0.55 }} />

      {/* Top overlay */}
      <div className="absolute inset-x-0 top-[6.4em] flex items-center justify-between px-[1.2em] text-[0.72em] font-semibold text-white">
        <span className="rounded-[0.4em] bg-black/45 px-[0.6em] py-[0.25em]">4K · 30</span>
        <span className="flex items-center gap-[0.4em] rounded-[0.4em] px-[0.6em] py-[0.25em] tabular-nums transition-colors duration-300"
          style={{ background: recording ? RED : 'rgba(0,0,0,.45)' }}>
          {recording && <span className="h-[0.55em] w-[0.55em] animate-pulse rounded-full bg-white" />}
          {clock(secs)}
        </span>
      </div>

      {/* Saved toast */}
      <div className="absolute inset-x-[1.2em] top-[45%] flex items-center gap-[0.6em] rounded-[0.9em] bg-black/70 px-[0.9em] py-[0.7em] text-white backdrop-blur-sm transition-all duration-500"
        style={{ opacity: phase === 'saved' ? 1 : 0, transform: phase === 'saved' ? 'none' : 'translateY(0.8em)' }}>
        <span className="flex h-[1.9em] w-[1.9em] items-center justify-center rounded-full bg-[#34c759]">
          <svg viewBox="0 0 24 24" width="1em" height="1em" fill="none" stroke="#fff" strokeWidth="2.6" strokeLinecap="round"><path d="M5 12.5l4.5 4.5L19 7.5" /></svg>
        </span>
        <span className="leading-tight">
          <span className="block text-[0.82em] font-semibold">Clip saved</span>
          <span className="block text-[0.7em] text-white/65">{clock(secs)} · 4K</span>
        </span>
      </div>

      {/* Bottom controls */}
      <div className="absolute inset-x-0 bottom-[1.6em] flex flex-col items-center gap-[0.9em]">
        <Levels live={recording} />
        <div className="flex h-[4.2em] w-[4.2em] items-center justify-center rounded-full border-[0.3em] border-white">
          <span className="block transition-all duration-300"
            style={{ width: recording ? '1.5em' : '3.1em', height: recording ? '1.5em' : '3.1em', borderRadius: recording ? '0.35em' : '50%', background: RED }} />
        </div>
      </div>
    </div>
  );
}

export default function CreatorStudio({ label = 'Animated creator setup: a phone recording under a ring light' }) {
  const ref = useRef(null);
  const t = useTicker(ref, { ticks: TICKS, stillAt: 60 });
  const { phase, secs } = state(t);
  const recording = phase === 'recording';

  return (
    <Stage stageRef={ref} label={label} glow="rgba(255,236,210,.14)">
      {/* Ring light behind the phone. */}
      <div aria-hidden className="absolute top-1/2 left-1/2 h-[34em] w-[34em] -translate-x-1/2 -translate-y-1/2 rounded-full"
        style={{
          border: '1.3em solid #fff4e2',
          boxShadow: '0 0 4em rgba(255,236,210,.55), inset 0 0 3em rgba(255,236,210,.35)',
          opacity: recording ? 1 : 0.75,
          transition: 'opacity 600ms ease',
        }} />
      <div className="relative" style={{ animation: 'float-y 7s ease-in-out infinite' }}>
        <PhoneFrame
          statusBar={<div className="relative z-10"><StatusBar /></div>}
          island={
            <DynamicIsland expanded={recording}>
              <span className="h-[0.7em] w-[0.7em] shrink-0 animate-pulse rounded-full" style={{ background: RED }} />
              <span className="text-[0.85em] font-semibold text-white">Recording</span>
              <span className="ml-auto text-[0.9em] font-semibold tabular-nums" style={{ color: RED }}>{clock(secs)}</span>
            </DynamicIsland>
          }
        >
          <Viewfinder phase={phase} secs={secs} />
        </PhoneFrame>
      </div>
      <FloatCard className="top-[16%] left-[9%]" delay={0.5}>
        <CardLabel dot={recording ? RED : '#34c759'}>USB mic</CardLabel>
        <p className="text-[1em] font-semibold">{recording ? 'Input −12 dB' : 'Ready'}</p>
      </FloatCard>
      <FloatCard className="right-[9%] bottom-[18%]" delay={1.3}>
        <CardLabel dot="#ffd60a">Ring light</CardLabel>
        <p className="text-[1em] font-semibold">5600 K · 80%</p>
      </FloatCard>
    </Stage>
  );
}
