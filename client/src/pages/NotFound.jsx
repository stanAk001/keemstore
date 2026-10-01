import { Link } from 'react-router-dom';
import { Seo } from '../lib/seo.jsx';
import { useFetch } from '../lib/useFetch.js';
import SearchBox from '../components/layout/SearchBox.jsx';
import Icon from '../components/ui/Icon.jsx';

export default function NotFound() {
  const { data: trends } = useFetch('/trends?limit=4');
  return (
    <>
      <Seo title="Page not found" noindex />
      <section className="container-x grid gap-12 py-16 md:py-24 lg:grid-cols-12">
        <div className="lg:col-span-7">
          <p className="eyebrow">Error 404</p>
          <h1 className="mt-4 font-serif text-[clamp(3.4rem,2rem+6vw,8rem)] leading-[0.88] tracking-[-0.03em]">
            Not <em className="text-accent">worth</em> the click.
          </h1>
          <p className="mt-6 max-w-md text-[1rem] leading-relaxed text-ink-2 sm:text-[1.1rem]">
            This page doesn't exist — or it sold out of existence. Either way, here's where the good stuff is.
          </p>
          <div className="mt-10 max-w-lg"><SearchBox /></div>
        </div>
        <div className="lg:col-span-5 lg:pt-10">
          <p className="eyebrow mb-3">Try instead</p>
          <ul className="divide-y divide-line border-y border-line">
            {[{ href: '/', title: 'The homepage' }, { href: '/guides', title: 'Buying guides' }, ...(trends || []).map((t) => ({ href: t.href, title: t.title }))].map((l) => (
              <li key={l.href + l.title}>
                <Link to={l.href} className="group flex items-center justify-between py-4 font-serif text-[1.5rem] leading-none">
                  {l.title}
                  <Icon name="arrow" size={18} className="text-faint transition-all group-hover:translate-x-1 group-hover:text-ink" />
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </section>
    </>
  );
}
