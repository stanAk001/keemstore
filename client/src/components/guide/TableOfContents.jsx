import { useEffect, useState } from 'react';

/** Sticky TOC that highlights the section currently in view. */
export default function TableOfContents({ items }) {
  const [active, setActive] = useState(items[0]?.id);

  useEffect(() => {
    if (typeof IntersectionObserver === 'undefined') return;
    const els = items.map((i) => document.getElementById(i.id)).filter(Boolean);
    const io = new IntersectionObserver(
      (entries) => {
        const visible = entries.filter((e) => e.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (visible[0]) setActive(visible[0].target.id);
      },
      { rootMargin: '-20% 0px -70% 0px' },
    );
    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, [items]);

  if (items.length < 2) return null;
  return (
    <nav aria-label="On this page">
      <p className="eyebrow mb-4">On this page</p>
      <ol className="space-y-0.5 border-l border-line">
        {items.map((it) => (
          <li key={it.id}>
            <a
              href={`#${it.id}`}
              className={`-ml-px block border-l py-1.5 pl-4 text-[0.88rem] leading-snug transition-colors ${
                active === it.id ? 'border-accent text-ink' : 'border-transparent text-muted hover:text-ink'
              } ${it.level === 3 ? 'pl-7 text-[0.82rem]' : ''}`}
            >
              {it.label}
            </a>
          </li>
        ))}
      </ol>
    </nav>
  );
}
