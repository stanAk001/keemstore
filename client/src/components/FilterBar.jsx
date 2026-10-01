import Icon from './ui/Icon.jsx';
import { useSite } from '../context/SiteContext.jsx';

export const PRICE_RANGES = [
  { value: '', label: 'Any price' },
  { value: '0-25', label: 'Under $25' },
  { value: '25-50', label: '$25 – $50' },
  { value: '50-100', label: '$50 – $100' },
  { value: '100-', label: '$100 and up' },
];

const SORTS = [
  { value: '', label: 'Editor’s order' },
  { value: 'newest', label: 'Newest' },
  { value: 'price_asc', label: 'Price: low to high' },
  { value: 'price_desc', label: 'Price: high to low' },
];

const titleCase = (t) => t.replace(/-/g, ' ').replace(/^\w/, (c) => c.toUpperCase());

function Select({ label, value, onChange, options }) {
  return (
    <label className="relative flex items-center">
      <span className="sr-only">{label}</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={`h-9 appearance-none rounded-full border bg-card py-0 pr-8 pl-3.5 text-[0.85rem] transition-colors focus:outline-none ${
          value ? 'border-ink text-ink' : 'border-line-strong text-ink-2 hover:border-ink'
        }`}
      >
        {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
      <Icon name="chevronDown" size={14} className="pointer-events-none absolute right-3 text-muted" />
    </label>
  );
}

/**
 * Filters live in the URL so results are shareable and survive back/forward.
 * `get(key)` reads a param, `set(patch)` updates several at once.
 */
export default function FilterBar({ facets, get, set, total, showContentType = false }) {
  // Price filters and sorts only make sense when real prices are shown.
  const withPrices = Boolean(useSite()?.affiliate?.show_prices);
  const brands = facets?.brands || [];
  const tags = facets?.tags || [];
  const price = get('price');
  const active = ['price', 'brand', 'tag', 'featured', 'sort'].some((k) => get(k));

  return (
    <div className="flex flex-col gap-4 border-y border-line py-4 md:flex-row md:items-center md:justify-between">
      <div className="-mx-4 flex items-center gap-2 overflow-x-auto px-4 no-scrollbar md:mx-0 md:flex-wrap md:overflow-visible md:px-0">
        <Icon name="filter" size={16} className="shrink-0 text-muted" />
        {showContentType && (
          <Select label="Content type" value={get('type')} onChange={(v) => set({ type: v })}
            options={[{ value: '', label: 'Products' }, { value: 'guides', label: 'Guides' }]} />
        )}
        {get('type') !== 'guides' && (
          <>
            {withPrices && <Select label="Price" value={price} onChange={(v) => set({ price: v, page: '' })} options={PRICE_RANGES} />}
            {brands.length > 1 && (
              <Select label="Brand" value={get('brand')} onChange={(v) => set({ brand: v, page: '' })}
                options={[{ value: '', label: 'All brands' }, ...brands.map((b) => ({ value: b.brand, label: `${b.brand} (${b.count})` }))]} />
            )}
            {tags.length > 0 && (
              <Select label="Use case" value={get('tag')} onChange={(v) => set({ tag: v, page: '' })}
                options={[{ value: '', label: 'Any use' }, ...tags.map((t) => ({ value: t.tag, label: `${titleCase(t.tag)} (${t.count})` }))]} />
            )}
            <button
              onClick={() => set({ featured: get('featured') ? '' : 'true', page: '' })}
              aria-pressed={Boolean(get('featured'))}
              className={`inline-flex h-9 shrink-0 items-center gap-1.5 rounded-full border px-3.5 text-[0.85rem] transition-colors ${
                get('featured') ? 'border-ink bg-ink text-paper' : 'border-line-strong text-ink-2 hover:border-ink'
              }`}
            >
              {get('featured') && <Icon name="check" size={14} />} Editor’s picks
            </button>
            {active && (
              <button onClick={() => set({ price: '', brand: '', tag: '', featured: '', sort: '', page: '' })} className="shrink-0 px-2 text-[0.82rem] text-muted underline underline-offset-2 hover:text-ink">
                Clear
              </button>
            )}
          </>
        )}
      </div>
      {get('type') !== 'guides' && (
        <div className="flex items-center justify-between gap-4 md:justify-end">
          {total != null && <span className="font-mono text-[0.75rem] text-muted">{total} {total === 1 ? 'item' : 'items'}</span>}
          <Select label="Sort" value={get('sort')} onChange={(v) => set({ sort: v, page: '' })} options={withPrices ? SORTS : SORTS.filter((s) => !s.value.startsWith('price'))} />
        </div>
      )}
    </div>
  );
}

/** Convert the "price" param into min/max query params for the API. */
export function priceParams(range) {
  if (!range) return {};
  const [min, max] = range.split('-');
  return { ...(min ? { min_price: min } : {}), ...(max ? { max_price: max } : {}) };
}
