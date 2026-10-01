export default function ProsCons({ pros = [], cons = [], compact = false }) {
  if (!pros.length && !cons.length) return null;
  const text = compact ? 'text-[0.84rem] sm:text-[0.88rem]' : 'text-[0.86rem] sm:text-[0.95rem]';
  return (
    <div className={`grid gap-4 sm:gap-5 ${pros.length && cons.length ? 'grid-cols-2' : ''}`}>
      {pros.length > 0 && (
        <div>
          <p className="eyebrow mb-2.5 text-good">What's good</p>
          <ul className="space-y-2">
            {pros.map((p, i) => (
              <li key={i} className={`flex gap-2 leading-snug sm:gap-2.5 text-ink-2 ${text}`}>
                <span className="mt-[0.1em] font-mono text-good" aria-hidden>+</span>
                {p}
              </li>
            ))}
          </ul>
        </div>
      )}
      {cons.length > 0 && (
        <div>
          <p className="eyebrow mb-2.5 text-bad">Worth knowing</p>
          <ul className="space-y-2">
            {cons.map((c, i) => (
              <li key={i} className={`flex gap-2 leading-snug sm:gap-2.5 text-ink-2 ${text}`}>
                <span className="mt-[0.1em] font-mono text-bad" aria-hidden>–</span>
                {c}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

/** "Who it's for / Who should skip it" — the core of every recommendation. */
export function FitNotes({ bestFor, notFor }) {
  if (!bestFor && !notFor) return null;
  return (
    <dl className={`grid gap-px overflow-hidden rounded-xs border border-line bg-line ${bestFor && notFor ? 'grid-cols-2' : ''}`}>
      {bestFor && (
        <div className="bg-card p-3 sm:p-4">
          <dt className="eyebrow mb-1.5 text-ink">Who should buy it</dt>
          <dd className="text-[0.84rem] leading-snug text-ink-2 sm:text-[0.93rem]">{bestFor}</dd>
        </div>
      )}
      {notFor && (
        <div className="bg-card p-3 sm:p-4">
          <dt className="eyebrow mb-1.5 text-ink">Who should skip it</dt>
          <dd className="text-[0.84rem] leading-snug text-ink-2 sm:text-[0.93rem]">{notFor}</dd>
        </div>
      )}
    </dl>
  );
}
