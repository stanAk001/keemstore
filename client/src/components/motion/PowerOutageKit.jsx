// Power-outage kit: grid offline, a phone charging from a power bank.
// The phone's battery climbs, energy pulses along the cable, and the power
// bank's LEDs step down as it gives its charge. Runs only while visible.
import { useEffect, useRef, useState } from 'react';
import { PhoneFrame, DynamicIsland, StatusBar, Stage, FloatCard, CardLabel } from './device.jsx';

const GREEN = '#34c759';
const RED = '#ff5a4e';
const TICKS = 120; // 100ms per tick → 12s loop
const START = 18;

/** 0…TICKS-1 while visible; frozen at a representative frame for reduced motion. */
function useTicker(ref) {
  const still = typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  const [t, setT] = useState(still ? 70 : 0);
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
    const id = setInterval(() => setT((n) => (n + 1) % TICKS), 100);
    return () => clearInterval(id);
  }, [still, visible]);
  return t;
}

function state(t) {
  if (t < 14) return { phase: 'offline', pct: START };
  if (t < 20) return { phase: 'connect', pct: START };
  if (t < 100) return { phase: 'charging', pct: Math.round(START + ((t - 20) / 80) * (100 - START)) };
  return { phase: 'full', pct: 100 };
}

function Bolt({ size = '1em', color = 'currentColor' }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} fill={color} aria-hidden>
      <path d="M13 2 4.5 13.5H11L10 22l8.5-11.5H12L13 2z" />
    </svg>
  );
}

function Tile({ label, value, tone }) {
  return (
    <div className="rounded-[1em] bg-[#1d1d20] p-[0.8em]">
      <p className="text-[0.7em] text-white/50">{label}</p>
      <p className="mt-[0.2em] flex items-center gap-[0.35em] text-[0.85em] font-semibold" style={{ color: tone || '#fff' }}>
        {tone && <span className="h-[0.45em] w-[0.45em] rounded-full" style={{ background: tone }} />}
        {value}
      </p>
    </div>
  );
}

function ChargingApp({ phase, pct }) {
  const charging = phase === 'charging';
  const minutesLeft = Math.max(0, Math.round((100 - pct) * 0.9));
  return (
    <div className="px-[1.35em] pt-[4.6em] text-white">
      <p className="text-[0.66em] font-medium tracking-[0.12em] text-white/45 uppercase">Battery</p>
      <p className="mt-[0.3em] text-[4.2em] leading-none font-semibold tracking-[-0.03em] tabular-nums">
        {pct}<span className="text-[0.45em] text-white/50">%</span>
      </p>
      <p className="mt-[0.5em] flex items-center gap-[0.35em] text-[0.82em] text-white/70">
        {phase === 'offline' && <><span className="h-[0.5em] w-[0.5em] rounded-full" style={{ background: RED }} /> Power cut · not charging</>}
        {phase === 'connect' && <><Bolt color="#f5f5f7" /> Power bank connected</>}
        {charging && <><Bolt color={GREEN} /> Charging from power bank</>}
        {phase === 'full' && <><Bolt color={GREEN} /> Fully charged</>}
      </p>
      {/* battery bar */}
      <div className="mt-[1.3em] h-[3.2em] rounded-[1em] bg-[#1d1d20] p-[0.35em]">
        <div className="relative h-full overflow-hidden rounded-[0.75em] transition-[width] duration-100"
          style={{ width: `${pct}%`, background: pct < 25 ? RED : GREEN }}>
          {charging && <span className="absolute inset-0 animate-[shimmer-x_1.6s_linear_infinite] bg-[linear-gradient(90deg,transparent,rgba(255,255,255,.35),transparent)] bg-[length:50%_100%] bg-no-repeat" />}
        </div>
      </div>
      <div className="mt-[1em] grid grid-cols-2 gap-[0.6em]">
        <Tile label="Grid power" value="Offline" tone={RED} />
        <Tile label="Full in" value={pct >= 100 ? 'Done' : charging ? `${minutesLeft} min` : '—'} />
        <Tile label="Hotspot" value="On · 2 devices" />
        <Tile label="Laptop" value="USB-C · 45 W" />
      </div>
    </div>
  );
}

function PowerBank({ leds, active }) {
  return (
    <div className="relative shrink-0 rounded-[1.7em] p-[0.2em]"
      style={{ width: '9.6em', height: '17.5em', background: 'linear-gradient(150deg, #3b3b3f, #1e1e21 55%, #2c2c30)', boxShadow: '0 2em 4em -1.5em rgba(0,0,0,.7), inset 0 0 0 0.07em rgba(255,255,255,.12)' }}>
      <div className="flex h-full flex-col items-center justify-between rounded-[1.5em] py-[1.4em]">
        <div className="flex flex-col items-center gap-[0.55em]">
          {[3, 2, 1, 0].map((n) => (
            <span key={n} className="h-[0.5em] w-[0.5em] rounded-full transition-all duration-500"
              style={{ background: n < leds ? '#e9e6df' : '#3a3a3e', boxShadow: n < leds && active ? '0 0 0.6em rgba(233,230,223,.8)' : 'none' }} />
          ))}
        </div>
        <div className="text-center">
          <p className="text-[0.62em] font-semibold tracking-[0.18em] text-white/55 uppercase">20,000 mAh</p>
          <p className="mt-[0.2em] text-[0.55em] tracking-[0.1em] text-white/30 uppercase">USB-C PD</p>
        </div>
        <span className="h-[0.45em] w-[1.9em] rounded-full bg-black/70 ring-1 ring-white/10" />
      </div>
    </div>
  );
}

export default function PowerOutageKit({ label = 'Animated power outage kit: a phone charging from a power bank' }) {
  const ref = useRef(null);
  const t = useTicker(ref);
  const { phase, pct } = state(t);
  const connected = phase !== 'offline';
  const charging = phase === 'charging';
  const leds = pct < 45 ? 4 : 3; // the bank steps down a light as it gives its charge

  return (
    <Stage stageRef={ref} label={label} glow={phase === 'offline' ? 'rgba(80,110,200,.18)' : 'rgba(52,199,89,.15)'}>
      <div className="relative flex items-end gap-[3em]" style={{ animation: 'float-y 7s ease-in-out infinite' }}>
        <PhoneFrame
          statusBar={<StatusBar battery={pct} charging={connected} />}
          island={
            <DynamicIsland expanded={charging}>
              <span className="flex h-[2.1em] w-[2.1em] shrink-0 items-center justify-center rounded-full bg-[#1f3d27]"><Bolt size="1.1em" color={GREEN} /></span>
              <span className="min-w-0 leading-tight">
                <span className="block text-[0.72em] text-white/60">Power bank</span>
                <span className="block text-[0.9em] font-semibold text-white">Charging</span>
              </span>
              <span className="ml-auto text-[0.95em] font-semibold tabular-nums" style={{ color: GREEN }}>{pct}%</span>
            </DynamicIsland>
          }
        >
          <ChargingApp phase={phase} pct={pct} />
        </PhoneFrame>
        <PowerBank leds={leds} active={connected} />
        {/* cable: phone port → power bank port */}
        <svg viewBox="0 0 319 70" className="pointer-events-none absolute top-full left-0" style={{ width: '31.9em', height: '7em', marginTop: '-0.4em' }} aria-hidden>
          <path d="M97 0 C97 60 271 60 271 0" fill="none" stroke={connected ? '#6b6b70' : 'transparent'} strokeWidth="5" strokeLinecap="round" style={{ transition: 'stroke 400ms ease' }} />
          {charging && (
            <path d="M271 0 C271 60 97 60 97 0" fill="none" stroke={GREEN} strokeWidth="5" strokeLinecap="round"
              strokeDasharray="24 360" style={{ animation: 'cable-flow 1.3s linear infinite', filter: 'drop-shadow(0 0 4px rgba(52,199,89,.9))' }} />
          )}
        </svg>
      </div>
      <FloatCard className="top-[16%] left-[10%]" delay={0.5}>
        <CardLabel dot={RED}>Grid power</CardLabel>
        <p className="text-[1em] font-semibold">Offline · 2h 14m</p>
      </FloatCard>
      <FloatCard className="right-[9%] bottom-[18%]" delay={1.3}>
        <CardLabel dot={GREEN}>Power bank</CardLabel>
        <p className="text-[1em] font-semibold">{leds === 4 ? '4 charges left' : '3 charges left'}</p>
      </FloatCard>
    </Stage>
  );
}
