// Admin building blocks. Dense, calm and consistent with the public design.
import { useCallback, useContext, useEffect, useRef, useState } from 'react';
import { ToastContext, LookupsContext, ConfirmContext } from './contexts.js';
import { Link } from 'react-router-dom';
import { api, errorMessage } from '../../lib/api.js';
import Icon from '../../components/ui/Icon.jsx';
import Button from '../../components/ui/Button.jsx';

// ---------------------------------------------------------------------------
// Toasts
// ---------------------------------------------------------------------------
export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const push = useCallback((message, tone = 'ok') => {
    const id = Math.random();
    setToasts((t) => [...t, { id, message, tone }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), tone === 'error' ? 6000 : 3000);
  }, []);
  return (
    <ToastContext.Provider value={push}>
      {children}
      <div className="fixed right-4 bottom-4 z-[80] flex flex-col gap-2" role="status" aria-live="polite">
        {toasts.map((t) => (
          <div key={t.id} className={`flex animate-fade-up items-center gap-2 rounded-sm px-4 py-3 text-sm shadow-pop ${t.tone === 'error' ? 'bg-accent text-white' : 'bg-ink text-paper'}`}>
            <Icon name={t.tone === 'error' ? 'close' : 'check'} size={16} />
            {t.message}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}
export const useToast = () => useContext(ToastContext);

// ---------------------------------------------------------------------------
// Data hooks (uncached — admin always wants fresh data)
// ---------------------------------------------------------------------------
export function useAdminData(url) {
  const [state, setState] = useState({ data: null, error: null, loading: Boolean(url) });
  const load = useCallback(async () => {
    if (!url) return;
    setState((s) => ({ ...s, loading: true, error: null }));
    try {
      const { data } = await api.get(url);
      setState({ data, error: null, loading: false });
    } catch (error) {
      setState({ data: null, error, loading: false });
    }
  }, [url]);
  useEffect(() => {
    load();
  }, [load]);
  return { ...state, reload: load, setData: (data) => setState((s) => ({ ...s, data: typeof data === 'function' ? data(s.data) : data })) };
}

/** Wrap an async action with loading state + toast feedback. */
export function useAction() {
  const toast = useToast();
  const [busy, setBusy] = useState(false);
  const run = useCallback(
    async (fn, success) => {
      setBusy(true);
      try {
        const result = await fn();
        if (success) toast(success);
        return result;
      } catch (err) {
        toast(errorMessage(err), 'error');
        // Still rethrow so callers stop (e.g. don't close a modal), but mark it
        // as already reported; AdminApp swallows marked unhandled rejections.
        err.handled = true;
        throw err;
      } finally {
        setBusy(false);
      }
    },
    [toast],
  );
  return [run, busy];
}

// Shared picker data (products, guides, categories...) for all editors.
export function LookupsProvider({ children }) {
  const lookups = useAdminData('/admin/lookups');
  return <LookupsContext.Provider value={lookups}>{children}</LookupsContext.Provider>;
}
export const useLookups = () => useContext(LookupsContext);

// ---------------------------------------------------------------------------
// Layout pieces
// ---------------------------------------------------------------------------
export function PageHeader({ title, subtitle, actions, back }) {
  return (
    <div className="mb-8 flex flex-col gap-4 border-b border-line pb-6 md:flex-row md:items-end md:justify-between">
      <div>
        {back && (
          <Link to={back} className="mb-3 inline-flex items-center gap-1.5 text-[0.8rem] text-muted hover:text-ink">
            <Icon name="arrowLeft" size={14} /> Back
          </Link>
        )}
        <h1 className="font-serif text-[2.4rem] leading-none tracking-[-0.01em]">{title}</h1>
        {subtitle && <p className="mt-2 max-w-2xl text-[0.9rem] text-muted">{subtitle}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}

export function Panel({ title, description, children, className = '', actions }) {
  return (
    <section className={`rounded-sm border border-line bg-card ${className}`}>
      {(title || actions) && (
        <header className="flex items-start justify-between gap-4 border-b border-line px-5 py-3.5">
          <div>
            {title && <h2 className="text-[0.95rem] font-semibold">{title}</h2>}
            {description && <p className="mt-0.5 text-[0.8rem] text-muted">{description}</p>}
          </div>
          {actions}
        </header>
      )}
      <div className="p-5">{children}</div>
    </section>
  );
}

export function Loading({ label = 'Loading…' }) {
  return (
    <div className="flex items-center gap-3 py-16 text-sm text-muted" aria-busy="true">
      <span className="h-4 w-4 animate-spin rounded-full border-2 border-line-strong border-r-transparent" /> {label}
    </div>
  );
}

export function LoadError({ error, onRetry }) {
  return (
    <div className="rounded-sm border-l-2 border-accent bg-card p-5 text-sm" role="alert">
      <p className="font-medium">Couldn't load this.</p>
      <p className="mt-1 text-muted">{errorMessage(error)}</p>
      {onRetry && <button onClick={onRetry} className="mt-3 underline">Try again</button>}
    </div>
  );
}

const PILL = {
  published: 'bg-good-soft text-good',
  active: 'bg-good-soft text-good',
  ready: 'bg-good-soft text-good',
  pinned: 'bg-ink text-paper',
  subscribed: 'bg-good-soft text-good',
  draft: 'bg-paper-2 text-ink-2',
  scheduled: 'bg-accent-soft text-accent-ink',
  archived: 'bg-paper-3 text-muted',
  inactive: 'bg-paper-3 text-muted',
  unsubscribed: 'bg-paper-3 text-muted',
  missing: 'bg-accent-soft text-accent-ink',
};
export function StatusPill({ status }) {
  return <span className={`inline-flex rounded-xs px-1.5 py-0.5 font-mono text-[0.66rem] tracking-wide uppercase ${PILL[status] || 'bg-paper-2'}`}>{status}</span>;
}

// ---------------------------------------------------------------------------
// Table
// ---------------------------------------------------------------------------
/** columns: [{ key, label, render?(row), className? }] */
export function AdminTable({ columns, rows, empty = 'Nothing here yet.', onRowClick, rowKey = 'id' }) {
  if (!rows?.length) return <p className="rounded-sm border border-dashed border-line-strong p-8 text-center text-sm text-muted">{empty}</p>;
  return (
    <div className="overflow-x-auto rounded-sm border border-line bg-card">
      <table className="w-full min-w-[640px] text-left text-[0.86rem]">
        <thead className="border-b border-line bg-paper/60">
          <tr>
            {columns.map((c) => (
              <th key={c.key} scope="col" className={`px-4 py-2.5 font-mono text-[0.66rem] font-medium tracking-wider text-muted uppercase ${c.className || ''}`}>{c.label}</th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-line">
          {rows.map((row) => (
            <tr key={row[rowKey]} onClick={onRowClick ? () => onRowClick(row) : undefined} className={onRowClick ? 'cursor-pointer hover:bg-paper/70' : ''}>
              {columns.map((c) => (
                <td key={c.key} className={`px-4 py-3 align-middle ${c.className || ''}`}>{c.render ? c.render(row) : row[c.key]}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Modal & confirm
// ---------------------------------------------------------------------------
export function AdminModal({ open, title, onClose, children, footer, wide = false }) {
  const ref = useRef(null);
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    const prev = document.activeElement;
    ref.current?.querySelector('input, textarea, select, button')?.focus();
    return () => {
      window.removeEventListener('keydown', onKey);
      prev?.focus?.();
    };
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[70] flex items-end justify-center bg-ink/40 p-0 backdrop-blur-[2px] sm:items-center sm:p-6" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div ref={ref} role="dialog" aria-modal="true" aria-label={title} className={`flex max-h-[92vh] w-full animate-fade-up flex-col rounded-t-md bg-paper shadow-pop sm:rounded-md ${wide ? 'max-w-4xl' : 'max-w-xl'}`}>
        <header className="flex items-center justify-between border-b border-line px-5 py-4">
          <h2 className="font-serif text-[1.6rem] leading-none">{title}</h2>
          <button onClick={onClose} className="p-1 text-muted hover:text-ink" aria-label="Close"><Icon name="close" size={20} /></button>
        </header>
        <div className="overflow-y-auto p-5">{children}</div>
        {footer && <footer className="flex justify-end gap-2 border-t border-line px-5 py-3">{footer}</footer>}
      </div>
    </div>
  );
}

export function ConfirmProvider({ children }) {
  const [state, setState] = useState(null);
  const confirm = useCallback((opts) => new Promise((resolve) => setState({ ...opts, resolve })), []);
  const close = (v) => {
    state?.resolve(v);
    setState(null);
  };
  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      <AdminModal open={Boolean(state)} title={state?.title || 'Are you sure?'} onClose={() => close(false)}
        footer={<>
          <Button variant="ghost" size="sm" onClick={() => close(false)}>Cancel</Button>
          <Button variant={state?.danger === false ? 'primary' : 'danger'} size="sm" onClick={() => close(true)}>{state?.confirmLabel || 'Delete'}</Button>
        </>}>
        <p className="text-[0.95rem] text-ink-2">{state?.message}</p>
      </AdminModal>
    </ConfirmContext.Provider>
  );
}
export const useConfirm = () => useContext(ConfirmContext);

// ---------------------------------------------------------------------------
// Form fields
// ---------------------------------------------------------------------------
export function Field({ label, hint, error, children, className = '' }) {
  return (
    <div className={className}>
      {label && <span className="label">{label}</span>}
      {children}
      {hint && !error && <p className="mt-1 text-[0.75rem] text-muted">{hint}</p>}
      {error && <p className="mt-1 text-[0.75rem] text-accent-ink">{error}</p>}
    </div>
  );
}

export function TextInput({ label, hint, value, onChange, className, counter, ...props }) {
  const len = (value || '').length;
  return (
    <Field label={label} hint={counter ? `${hint ? `${hint} · ` : ''}${len}/${counter}` : hint} className={className}>
      <input className={`input ${counter && len > counter ? '!border-accent' : ''}`} value={value ?? ''} onChange={(e) => onChange(e.target.value)} {...props} />
    </Field>
  );
}

export function TextArea({ label, hint, value, onChange, rows = 3, className, counter, ...props }) {
  const len = (value || '').length;
  return (
    <Field label={label} hint={counter ? `${hint ? `${hint} · ` : ''}${len}/${counter}` : hint} className={className}>
      <textarea className={`input resize-y leading-relaxed ${counter && len > counter ? '!border-accent' : ''}`} rows={rows} value={value ?? ''} onChange={(e) => onChange(e.target.value)} {...props} />
    </Field>
  );
}

export function SelectInput({ label, hint, value, onChange, options, placeholder, className }) {
  return (
    <Field label={label} hint={hint} className={className}>
      <select className="input" value={value ?? ''} onChange={(e) => onChange(e.target.value)}>
        {placeholder !== undefined && <option value="">{placeholder}</option>}
        {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    </Field>
  );
}

export function Toggle({ label, hint, checked, onChange }) {
  return (
    <label className="flex cursor-pointer items-start gap-3">
      <button type="button" role="switch" aria-checked={Boolean(checked)} onClick={() => onChange(!checked)}
        className={`relative mt-0.5 h-5 w-9 shrink-0 rounded-full transition-colors ${checked ? 'bg-ink' : 'bg-line-strong'}`}>
        <span className={`absolute top-0.5 left-0 h-4 w-4 rounded-full bg-paper transition-transform ${checked ? 'translate-x-[18px]' : 'translate-x-0.5'}`} />
      </button>
      <span>
        <span className="text-[0.86rem] font-medium">{label}</span>
        {hint && <span className="block text-[0.75rem] text-muted">{hint}</span>}
      </span>
    </label>
  );
}

/** Editable list of short strings (pros, cons, list items). */
export function ListInput({ label, hint, value = [], onChange, placeholder = 'Add an item and press Enter' }) {
  const [draft, setDraft] = useState('');
  const add = () => {
    if (!draft.trim()) return;
    onChange([...value, draft.trim()]);
    setDraft('');
  };
  return (
    <Field label={label} hint={hint}>
      {value.length > 0 && (
        <ul className="mb-2 space-y-1">
          {value.map((item, i) => (
            <li key={i} className="flex items-center gap-2 rounded-xs bg-paper px-2 py-1 text-[0.86rem]">
              <input className="min-w-0 flex-1 bg-transparent focus:outline-none" value={item} onChange={(e) => onChange(value.map((v, j) => (j === i ? e.target.value : v)))} />
              <button type="button" onClick={() => i > 0 && onChange(swap(value, i, i - 1))} className="text-faint hover:text-ink" aria-label="Move up"><Icon name="chevronUp" size={14} /></button>
              <button type="button" onClick={() => onChange(value.filter((_, j) => j !== i))} className="text-faint hover:text-accent-ink" aria-label="Remove"><Icon name="close" size={14} /></button>
            </li>
          ))}
        </ul>
      )}
      <div className="flex gap-2">
        <input className="input" value={draft} placeholder={placeholder} onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); add(); } }} />
        <Button type="button" variant="subtle" size="sm" className="!h-[38px]" onClick={add}>Add</Button>
      </div>
    </Field>
  );
}

export function swap(arr, i, j) {
  const next = [...arr];
  [next[i], next[j]] = [next[j], next[i]];
  return next;
}

export function CopyButton({ text, label = 'Copy' }) {
  const [done, setDone] = useState(false);
  return (
    <button type="button" onClick={async () => {
      try {
        await navigator.clipboard.writeText(text || '');
        setDone(true);
        setTimeout(() => setDone(false), 1500);
      } catch { /* clipboard blocked */ }
    }} className="inline-flex items-center gap-1 rounded-xs border border-line-strong px-2 py-0.5 text-[0.72rem] hover:border-ink" disabled={!text}>
      <Icon name={done ? 'check' : 'copy'} size={12} /> {done ? 'Copied' : label}
    </button>
  );
}

/** Row of order controls used in reorderable lists. */
export function MoveButtons({ index, length, onMove }) {
  return (
    <span className="flex flex-col">
      <button type="button" disabled={index === 0} onClick={() => onMove(index, index - 1)} className="text-faint hover:text-ink disabled:opacity-30" aria-label="Move up"><Icon name="chevronUp" size={16} /></button>
      <button type="button" disabled={index === length - 1} onClick={() => onMove(index, index + 1)} className="text-faint hover:text-ink disabled:opacity-30" aria-label="Move down"><Icon name="chevronDown" size={16} /></button>
    </span>
  );
}

export function Tabs({ tabs, value, onChange }) {
  return (
    <div className="mb-6 flex gap-1 overflow-x-auto border-b border-line" role="tablist">
      {tabs.map(([key, label]) => (
        <button key={key} role="tab" aria-selected={value === key} onClick={() => onChange(key)}
          className={`-mb-px shrink-0 border-b-2 px-3 py-2 text-[0.86rem] ${value === key ? 'border-ink font-medium text-ink' : 'border-transparent text-muted hover:text-ink'}`}>
          {label}
        </button>
      ))}
    </div>
  );
}

/** Convert ISO timestamps to the value format of <input type="datetime-local"> and back. */
export const toLocalInput = (iso) => {
  if (!iso) return '';
  const d = new Date(iso);
  const off = d.getTimezoneOffset();
  return new Date(d.getTime() - off * 60000).toISOString().slice(0, 16);
};
export const fromLocalInput = (v) => (v ? new Date(v).toISOString() : null);
