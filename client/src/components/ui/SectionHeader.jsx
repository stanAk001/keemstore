import { Link } from 'react-router-dom';
import Icon from './Icon.jsx';

/** Editorial section heading: hairline, mono index, serif title, optional link. */
export default function SectionHeader({ index, eyebrow, title, subtitle, link, as: H = 'h2', align = 'split', dark = false, className = '' }) {
  const muted = dark ? 'text-paper/60' : 'text-muted';
  return (
    <header className={`mb-6 border-t pt-3 md:mb-10 md:pt-4 ${dark ? 'border-paper/20' : 'border-ink'} ${className}`}>
      <div className={`eyebrow mb-3 flex items-center gap-3 md:mb-4 ${dark ? 'text-paper/60' : ''}`}>
        {index != null && <span className={dark ? 'text-paper' : 'text-ink'}>{String(index).padStart(2, '0')}</span>}
        {eyebrow && <span>{eyebrow}</span>}
      </div>
      <div className={align === 'split' ? 'flex flex-col gap-4 md:flex-row md:items-end md:justify-between' : ''}>
        <div className="max-w-3xl">
          <H className="font-serif text-headline tracking-[-0.01em]">{title}</H>
          {subtitle && <p className={`mt-2 max-w-xl text-[0.95rem] leading-relaxed md:mt-3 md:text-[1.02rem] ${muted}`}>{subtitle}</p>}
        </div>
        {link?.url && (
          <Link to={link.url} className={`group inline-flex shrink-0 items-center gap-2 text-sm font-medium ${dark ? 'text-paper' : 'text-ink'}`}>
            <span className="link-underline">{link.label || 'See all'}</span>
            <Icon name="arrow" size={16} className="transition-transform duration-300 group-hover:translate-x-1" />
          </Link>
        )}
      </div>
    </header>
  );
}
