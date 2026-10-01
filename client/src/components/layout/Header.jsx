import { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Link, NavLink, useLocation } from 'react-router-dom';
import { useSite } from '../../context/SiteContext.jsx';
import { useAuth } from '../../context/AuthContext.jsx';
import Icon from '../ui/Icon.jsx';
import SearchBox from './SearchBox.jsx';
import Img from '../ui/Img.jsx';
import { useFetch } from '../../lib/useFetch.js';
import { safeHref } from '../../lib/format.js';

export function Logo({ className = '', light = false }) {
  const site = useSite();
  const name = site?.site?.name || 'keemstore';
  if (site?.site?.logo_url) return <img src={site.site.logo_url} alt={name} className={`h-7 w-auto ${className}`} />;

  // Two-part wordmark for "…store" names: an italic serif first half (the
  // curation, like a signature) against a tight geometric sans "store" (the
  // shop), finished with a persimmon dot like the hole in a price tag.
  const split = name.match(/^(.+?)(store)$/i);
  if (split) {
    return (
      <span aria-label={name} className={`inline-flex items-baseline text-[1.85rem] leading-none select-none ${light ? 'text-paper' : 'text-ink'} ${className}`}>
        <span aria-hidden className="font-serif tracking-[-0.015em] italic">{split[1]}</span>
        <span aria-hidden className="ml-[0.03em] font-sans text-[0.72em] font-semibold tracking-[-0.06em]">{split[2]}</span>
        <span aria-hidden className="relative -top-[0.52em] ml-[0.07em] inline-block h-[0.17em] w-[0.17em] rounded-full bg-accent" />
      </span>
    );
  }
  return (
    <span className={`font-serif text-[1.9rem] leading-none tracking-[-0.02em] ${light ? 'text-paper' : 'text-ink'} ${className}`}>
      {name}
      <span className="text-accent">.</span>
    </span>
  );
}

export function AnnouncementBar() {
  const { announcement: a } = useSite() || {};
  const href = safeHref(a?.url);
  if (!a?.enabled || !a.text) return null;
  const inner = (
    <>
      <span className="eyebrow text-paper/60">{a.label || "What's trending"}</span>
      <span className="font-medium">{a.text}</span>
      {href && <Icon name="arrow" size={14} className="transition-transform duration-300 group-hover:translate-x-1" />}
    </>
  );
  return (
    <div className="bg-ink text-[0.82rem] text-paper">
      <div className="container-x flex h-9 items-center justify-center gap-3">
        {href ? (
          <Link to={href} className="group flex items-center gap-3 hover:text-accent-soft">
            {inner}
          </Link>
        ) : (
          <p className="flex items-center gap-3">{inner}</p>
        )}
      </div>
    </div>
  );
}

function ShopMenu({ categories, onClose }) {
  return (
    <div className="absolute inset-x-0 top-full z-40 animate-fade-in border-b border-line bg-paper shadow-lift">
      <div className="container-x grid grid-cols-4 gap-x-8 gap-y-8 py-10 lg:grid-cols-5">
        {categories.map((c) => (
          <div key={c.id}>
            <Link to={c.path} onClick={onClose} className="font-serif text-[1.45rem] leading-none hover:text-accent-ink">
              {c.name}
            </Link>
            {c.children.length > 0 && (
              <ul className="mt-3 space-y-1.5">
                {c.children.map((k) => (
                  <li key={k.id}>
                    <Link to={k.path} onClick={onClose} className="text-[0.9rem] text-muted hover:text-ink">
                      {k.name}
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

/**
 * Full-screen mobile menu. Rendered through a portal at <body>: the sticky
 * header uses backdrop-filter, which would otherwise trap a fixed-position
 * child inside the header's 64px box.
 */
function MobileMenu({ site, onClose, user }) {
  const { data: trends } = useFetch('/trends?limit=6');
  const panel = useRef(null);

  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    panel.current?.querySelector('button')?.focus();
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const categories = site.categories || [];
  const legal = [...(site.navigation?.footer_company || []), ...(site.navigation?.footer_legal || [])];

  return createPortal(
    <div ref={panel} className="fixed inset-0 z-[60] flex flex-col bg-paper lg:hidden" role="dialog" aria-modal="true" aria-label="Menu"
      style={{ animation: 'menu-in 280ms var(--ease-out-soft) both' }}>
      <div className="flex h-16 shrink-0 items-center justify-between border-b border-line px-4 sm:px-6">
        <Link to="/" onClick={onClose} className="!text-[1.6rem]"><Logo className="!text-[1.6rem]" /></Link>
        <button onClick={onClose} className="-mr-1 flex h-10 w-10 items-center justify-center rounded-full hover:bg-paper-2" aria-label="Close menu">
          <Icon name="close" size={22} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto overscroll-contain px-4 pb-10 sm:px-6">
        <div className="pt-5"><SearchBox onDone={onClose} /></div>

        <nav aria-label="Main" className="mt-6">
          <ul className="divide-y divide-line border-y border-line">
            {(site.navigation?.header || []).map((item) => (
              <li key={item.url}>
                <Link to={item.url} onClick={onClose} className="group flex items-center justify-between py-3.5 text-[1.05rem] font-medium">
                  {item.label}
                  <Icon name="chevronRight" size={18} className="text-faint transition-transform group-active:translate-x-0.5" />
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        {trends?.length > 0 && (
          <section className="mt-8">
            <p className="eyebrow mb-3 flex items-center gap-2"><span className="h-1.5 w-1.5 rounded-full bg-accent" /> Trending now</p>
            <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 no-scrollbar sm:-mx-6 sm:px-6">
              {trends.map((t) => (
                <Link key={t.id} to={t.href} onClick={onClose} className="inline-flex shrink-0 items-center gap-2 rounded-full border border-line-strong bg-card py-1.5 pr-3.5 pl-1.5 text-[0.85rem]">
                  <Img src={t.image_url} alt="" aspect={1} width={80} sizes="28px" className="w-7 rounded-full" />
                  {t.title}
                </Link>
              ))}
            </div>
          </section>
        )}

        <section className="mt-8">
          <p className="eyebrow mb-3">Shop by category</p>
          <div className="grid grid-cols-2 gap-2.5">
            {categories.map((c) => (
              <Link key={c.id} to={c.path} onClick={onClose} className="group relative block overflow-hidden rounded-sm bg-ink odd:last:col-span-2">
                <Img src={c.image_url} alt="" aspect={4 / 3} width={360} sizes="45vw" imgClassName="opacity-75" />
                <span className="absolute inset-0 bg-gradient-to-t from-ink/80 via-ink/10 to-transparent" aria-hidden />
                <span className="absolute inset-x-0 bottom-0 p-3">
                  <span className="block font-serif text-[1.35rem] leading-none text-paper">{c.name}</span>
                  {c.children.length > 0 && (
                    <span className="mt-1 block truncate text-[0.72rem] text-paper/70">{c.children.map((k) => k.name).join(' · ')}</span>
                  )}
                </span>
              </Link>
            ))}
          </div>
        </section>

        <footer className="mt-10 border-t border-line pt-5">
          {user && ['admin', 'editor'].includes(user.role) && (
            <Link to="/admin" onClick={onClose} className="mb-4 inline-flex items-center gap-2 rounded-sm bg-ink px-3.5 py-2 text-[0.85rem] font-medium text-paper">
              Admin dashboard <Icon name="arrow" size={14} />
            </Link>
          )}
          <div className="flex flex-wrap gap-x-5 gap-y-2 text-[0.82rem] text-muted">
            {legal.map((l) => <Link key={l.url} to={l.url} onClick={onClose} className="hover:text-ink">{l.label}</Link>)}
          </div>
        </footer>
      </div>
    </div>,
    document.body,
  );
}

export default function Header() {
  const site = useSite();
  const { user, isStaff } = useAuth();
  const [shopOpen, setShopOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const closeMenu = useCallback(() => setMenuOpen(false), []);
  const [searchOpen, setSearchOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const location = useLocation();
  const headerRef = useRef(null);

  useEffect(() => {
    setShopOpen(false);
    setMenuOpen(false);
    setSearchOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    document.body.style.overflow = menuOpen ? 'hidden' : '';
    return () => (document.body.style.overflow = '');
  }, [menuOpen]);

  useEffect(() => {
    if (!shopOpen && !searchOpen) return;
    const onKey = (e) => e.key === 'Escape' && (setShopOpen(false), setSearchOpen(false));
    const onClick = (e) => headerRef.current && !headerRef.current.contains(e.target) && setShopOpen(false);
    window.addEventListener('keydown', onKey);
    window.addEventListener('mousedown', onClick);
    return () => {
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('mousedown', onClick);
    };
  }, [shopOpen, searchOpen]);

  const navItems = site?.navigation?.header || [];
  const linkCls = ({ isActive }) =>
    `relative py-2 text-[0.9rem] transition-colors hover:text-ink ${isActive ? 'text-ink after:absolute after:inset-x-0 after:bottom-0 after:h-px after:bg-accent' : 'text-ink-2'}`;

  return (
    <header ref={headerRef} className={`sticky top-0 z-40 bg-paper/95 backdrop-blur-md transition-shadow ${scrolled ? 'shadow-[0_1px_0_var(--color-line)]' : ''}`}>
      <div className="container-x flex h-16 items-center gap-6 lg:h-[4.5rem]">
        <Link to="/" className="shrink-0" aria-label={`${site?.site?.name || 'keemstore'} home`}>
          <Logo />
        </Link>

        <nav className="hidden flex-1 items-center gap-7 lg:flex" aria-label="Main">
          <button
            onClick={() => setShopOpen((o) => !o)}
            aria-expanded={shopOpen}
            className={`flex items-center gap-1 py-2 text-[0.9rem] ${shopOpen ? 'text-ink' : 'text-ink-2 hover:text-ink'}`}
          >
            Shop <Icon name="chevronDown" size={14} className={`transition-transform ${shopOpen ? 'rotate-180' : ''}`} />
          </button>
          {navItems.map((item) => (
            <NavLink key={item.url} to={item.url} className={linkCls}>
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="ml-auto flex items-center gap-1 lg:gap-3">
          {searchOpen ? null : (
            <button onClick={() => setSearchOpen(true)} className="flex items-center gap-2 p-2 text-ink-2 hover:text-ink" aria-label="Open search">
              <Icon name="search" size={19} />
              <span className="hidden text-[0.88rem] xl:inline">Search</span>
            </button>
          )}
          {isStaff && (
            <Link to="/admin" className="hidden items-center gap-1.5 rounded-xs border border-line-strong px-2.5 py-1 font-mono text-[0.68rem] tracking-wider uppercase hover:border-ink lg:flex">
              Admin
            </Link>
          )}
          <button onClick={() => setMenuOpen(true)} className="-mr-2 p-2 lg:hidden" aria-label="Open menu">
            <Icon name="menu" size={24} />
          </button>
        </div>
      </div>

      {searchOpen && (
        <div className="absolute inset-x-0 top-full z-40 animate-fade-in border-b border-line bg-paper shadow-lift">
          <div className="container-x flex items-start gap-4 py-6 md:py-10">
            <SearchBox autoFocus size="lg" onDone={() => setSearchOpen(false)} />
            <button onClick={() => setSearchOpen(false)} className="mt-2 p-1 text-muted hover:text-ink" aria-label="Close search">
              <Icon name="close" size={24} />
            </button>
          </div>
        </div>
      )}
      {shopOpen && <ShopMenu categories={site?.categories || []} onClose={() => setShopOpen(false)} />}
      {menuOpen && <MobileMenu site={site || {}} user={user} onClose={closeMenu} />}
    </header>
  );
}
