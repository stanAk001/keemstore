import Icon from './Icon.jsx';

export default function Pagination({ page, pages, onChange }) {
  if (!pages || pages <= 1) return null;
  const nums = [];
  for (let n = Math.max(1, page - 2); n <= Math.min(pages, page + 2); n++) nums.push(n);
  const btn = 'flex h-10 min-w-10 items-center justify-center px-3 font-mono text-sm transition-colors';
  return (
    <nav className="mt-14 flex items-center justify-center gap-1 border-t border-line pt-6" aria-label="Pagination">
      <button className={`${btn} hover:bg-paper-2 disabled:opacity-30`} disabled={page <= 1} onClick={() => onChange(page - 1)} aria-label="Previous page">
        <Icon name="arrowLeft" size={16} />
      </button>
      {nums.map((n) => (
        <button
          key={n}
          onClick={() => onChange(n)}
          aria-current={n === page ? 'page' : undefined}
          className={`${btn} ${n === page ? 'bg-ink text-paper' : 'hover:bg-paper-2'}`}
        >
          {n}
        </button>
      ))}
      <button className={`${btn} hover:bg-paper-2 disabled:opacity-30`} disabled={page >= pages} onClick={() => onChange(page + 1)} aria-label="Next page">
        <Icon name="arrow" size={16} />
      </button>
    </nav>
  );
}
