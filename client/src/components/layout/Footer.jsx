import { Link, useLocation } from 'react-router-dom';
import { useSite } from '../../context/SiteContext.jsx';
import { Logo } from './Header.jsx';
import NewsletterForm from '../NewsletterForm.jsx';
import Reveal from '../ui/Reveal.jsx';
import { safeHref } from '../../lib/format.js';

const COLUMNS = [
  ['footer_shop', 'Shop'],
  ['footer_guides', 'Guides'],
  ['footer_company', 'Company'],
  ['footer_legal', 'Legal'],
];
const SOCIAL = { pinterest: 'Pinterest', instagram: 'Instagram', tiktok: 'TikTok', x: 'X', youtube: 'YouTube', facebook: 'Facebook' };

export default function Footer() {
  const site = useSite() || {};
  const nav = site.navigation || {};
  const onHome = useLocation().pathname === '/';
  const socials = Object.entries(site.social || {}).filter(([k, v]) => SOCIAL[k] && safeHref(v));

  return (
    <footer className="mt-16 bg-ink text-paper md:mt-24">
      <div className="container-x grid gap-10 pt-12 pb-8 md:gap-12 md:pt-16 md:pb-10 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
        <div>
          <p className="max-w-sm text-[1.05rem] leading-relaxed text-paper/75">{site.footer?.blurb}</p>
          {site.site?.contact_email && (
            <p className="mt-4 text-[0.95rem] text-paper/75">
              Contact:{' '}
              <a href={`mailto:${site.site.contact_email}`} className="break-all font-medium text-paper underline decoration-paper/30 underline-offset-4 hover:decoration-accent-soft">{site.site.contact_email}</a>
            </p>
          )}
          {site.newsletter?.enabled && !onHome && (
            <div className="mt-8 max-w-md">
              <p className="eyebrow mb-1 text-paper/60">Newsletter</p>
              <NewsletterForm source="footer" dark />
            </div>
          )}
        </div>
        <nav className="grid grid-cols-2 gap-8 sm:grid-cols-4" aria-label="Footer">
          {COLUMNS.map(([key, label]) =>
            nav[key]?.length ? (
              <div key={key}>
                <p className="eyebrow mb-4 text-paper/50">{label}</p>
                <ul className="space-y-2.5">
                  {nav[key].map((item) => (
                    <li key={item.url + item.label}>
                      <Link to={item.url} className="text-[0.92rem] text-paper/85 hover:text-accent-soft">
                        {item.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null,
          )}
        </nav>
      </div>
      {/* Signature: the wordmark set huge across the foot of every page. */}
      <div className="container-x overflow-hidden pb-6 md:pb-8" aria-hidden>
        <Reveal>
          <Logo light className="!flex !text-[clamp(3.6rem,19vw,17rem)] !leading-[0.85] opacity-95" />
        </Reveal>
      </div>
      <div className="container-x flex flex-col gap-4 border-t border-paper/15 py-6 text-[0.8rem] text-paper/55 md:flex-row md:items-center md:justify-between">
        <p className="max-w-2xl">{site.affiliate?.disclosure_short}</p>
        <div className="flex flex-wrap items-center gap-5">
          {socials.map(([k, v]) => (
            <a key={k} href={v} target="_blank" rel="noopener noreferrer" className="hover:text-paper">
              {SOCIAL[k]}
            </a>
          ))}
          <span>© {new Date().getFullYear()} {site.site?.name}</span>
          {site.footer?.credit_name && (
            <span className="flex items-center gap-1.5">
              {site.footer.credit_label || 'Designed & built by'}{' '}
              {safeHref(site.footer.credit_url) ? (
                <a href={site.footer.credit_url} target={/^https?:/.test(site.footer.credit_url) ? '_blank' : undefined} rel="noopener noreferrer" className="group inline-flex items-center gap-1 font-medium text-paper transition-colors hover:text-accent-soft">
                  <span className="link-underline">{site.footer.credit_name}</span>
                  <span aria-hidden className="transition-transform duration-300 group-hover:-translate-y-0.5 group-hover:translate-x-0.5">↗</span>
                </a>
              ) : (
                <span className="font-medium text-paper">{site.footer.credit_name}</span>
              )}
            </span>
          )}
        </div>
      </div>
    </footer>
  );
}
