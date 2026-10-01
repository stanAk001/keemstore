import { useEffect, useId, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../../lib/api.js';
import Img from '../ui/Img.jsx';
import Icon from '../ui/Icon.jsx';

const TYPE_LABEL = { guide: 'Guide', category: 'Category', trend: 'Trending', product: 'Product' };

/**
 * Search input with debounced autocomplete and full keyboard support
 * (arrows, enter, escape) following the ARIA combobox pattern.
 */
export default function SearchBox({ autoFocus = false, onDone, size = 'md', initial = '' }) {
  const [q, setQ] = useState(initial);
  const [items, setItems] = useState([]);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const navigate = useNavigate();
  const listId = useId();
  const inputRef = useRef(null);
  const reqId = useRef(0);

  useEffect(() => {
    if (autoFocus) inputRef.current?.focus();
  }, [autoFocus]);

  useEffect(() => {
    const term = q.trim();
    if (term.length < 2) {
      setItems([]);
      return;
    }
    const id = ++reqId.current;
    const t = setTimeout(async () => {
      try {
        const { data } = await api.get('/search/suggest', { params: { q: term } });
        if (id === reqId.current) {
          setItems(data);
          setActive(-1);
          setOpen(true);
        }
      } catch {
        /* suggestions are optional */
      }
    }, 160);
    return () => clearTimeout(t);
  }, [q]);

  const go = (url) => {
    setOpen(false);
    onDone?.();
    navigate(url);
  };

  const submit = (e) => {
    e.preventDefault();
    if (active >= 0 && items[active]) return go(items[active].url);
    if (q.trim()) go(`/search?q=${encodeURIComponent(q.trim())}`);
  };

  const onKey = (e) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setOpen(true);
      setActive((a) => Math.min(a + 1, items.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActive((a) => Math.max(a - 1, -1));
    } else if (e.key === 'Escape') {
      setOpen(false);
      onDone?.();
    }
  };

  const big = size === 'lg';
  return (
    <form onSubmit={submit} role="search" className="relative w-full">
      <div className={`flex items-center gap-3 border-b ${big ? 'border-ink pb-3' : 'border-line-strong pb-2'}`}>
        <Icon name="search" size={big ? 24 : 18} className="text-muted" />
        <input
          ref={inputRef}
          type="search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onKeyDown={onKey}
          onFocus={() => items.length && setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 150)}
          placeholder="Search guides, products, trends…"
          aria-label="Search"
          role="combobox"
          aria-expanded={open && items.length > 0}
          aria-controls={listId}
          aria-activedescendant={active >= 0 ? `${listId}-${active}` : undefined}
          autoComplete="off"
          className={`w-full bg-transparent placeholder:text-faint focus:outline-none ${big ? 'font-serif text-[2rem] md:text-[2.6rem]' : 'text-[0.95rem]'}`}
        />
        {q && (
          <button type="button" onClick={() => setQ('')} className="text-muted hover:text-ink" aria-label="Clear search">
            <Icon name="close" size={18} />
          </button>
        )}
      </div>
      {open && items.length > 0 && (
        <ul id={listId} role="listbox" className="absolute inset-x-0 top-full z-50 mt-2 max-h-[60vh] overflow-auto border border-line bg-card py-2 shadow-pop">
          {items.map((item, i) => (
            <li
              key={`${item.type}-${item.url}`}
              id={`${listId}-${i}`}
              role="option"
              aria-selected={i === active}
              onMouseDown={(e) => {
                e.preventDefault();
                go(item.url);
              }}
              onMouseEnter={() => setActive(i)}
              className={`flex cursor-pointer items-center gap-3 px-3 py-2 ${i === active ? 'bg-paper-2' : ''}`}
            >
              <Img src={item.image} alt="" aspect={1} width={96} sizes="40px" className="w-10 shrink-0" label=" " />
              <span className="min-w-0 flex-1 truncate text-[0.93rem]">{item.label}</span>
              <span className="eyebrow text-[0.58rem]">{TYPE_LABEL[item.type]}</span>
            </li>
          ))}
          <li
            role="option"
            aria-selected={false}
            onMouseDown={(e) => {
              e.preventDefault();
              go(`/search?q=${encodeURIComponent(q.trim())}`);
            }}
            className="mt-1 cursor-pointer border-t border-line px-3 pt-2.5 pb-1 text-[0.85rem] font-medium hover:text-accent-ink"
          >
            See all results for “{q.trim()}” →
          </li>
        </ul>
      )}
    </form>
  );
}
