import Icon from '../ui/Icon.jsx';
import { Inline } from '../../lib/inline.jsx';

/** Native <details> accordion: accessible, works without JS state. */
export default function FAQ({ items = [] }) {
  if (!items.length) return null;
  return (
    <div className="border-t border-ink">
      {items.map((it, i) => (
        <details key={i} className="group border-b border-line" open={i === 0}>
          <summary className="flex cursor-pointer list-none items-start justify-between gap-6 py-5 text-[1.08rem] font-medium [&::-webkit-details-marker]:hidden">
            {it.q}
            <Icon name="plus" size={18} className="mt-1 transition-transform duration-300 group-open:rotate-45" />
          </summary>
          <p className="pb-6 pr-10 leading-relaxed text-ink-2"><Inline text={it.a} /></p>
        </details>
      ))}
    </div>
  );
}
