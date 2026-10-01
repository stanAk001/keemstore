import { Link } from 'react-router-dom';
import Img from '../ui/Img.jsx';
import { HeroMedia } from '../motion/index.jsx';
import { DemoBadge } from '../ui/Badge.jsx';
import { formatDate } from '../../lib/format.js';
import { trackEvent } from '../../lib/track.js';

const track = (g) => () => trackEvent('guide_click', { entity_type: 'guide', entity_id: g.id });

/** variant: "card" (default grid), "lead" (large), "row" (compact list item) */
export default function GuideCard({ guide, variant = 'card', priority = false }) {
  const href = `/guides/${guide.slug}`;
  const meta = (
    <p className="eyebrow flex flex-wrap items-center gap-x-3 gap-y-1 text-[0.62rem]">
      {guide.category_name && <span className="text-accent-ink">{guide.category_name}</span>}
      <span>{formatDate(guide.published_at, { month: 'short', day: 'numeric', year: 'numeric' })}</span>
      {guide.product_count > 0 && <span>{guide.product_count} picks</span>}
    </p>
  );

  if (variant === 'row') {
    return (
      <article className="group grid grid-cols-[88px_1fr] gap-4 border-t border-line py-5 sm:grid-cols-[120px_1fr]">
        <Link to={href} onClick={track(guide)} tabIndex={-1} aria-hidden>
          <Img src={guide.hero_image} alt="" aspect={1} width={240} sizes="120px" imgClassName="group-hover:scale-[1.04]" />
        </Link>
        <div className="min-w-0">
          {meta}
          <h3 className="mt-2 font-serif text-[1.35rem] leading-[1.1] sm:text-[1.5rem]">
            <Link to={href} onClick={track(guide)} className="link-underline">{guide.title}</Link>
          </h3>
        </div>
      </article>
    );
  }

  if (variant === 'lead') {
    return (
      <article className="group">
        <Link to={href} onClick={track(guide)} className="relative block">
          <HeroMedia motion={guide.hero_motion} src={guide.hero_image} alt={guide.hero_image_alt || ''} aspect={4 / 3} width={1200} sizes="(min-width: 1024px) 55vw, 100vw" priority={priority} imgClassName="group-hover:scale-[1.02]" />
          <div className="absolute top-3 left-3"><DemoBadge show={guide.is_demo} /></div>
        </Link>
        <div className="mt-5">
          {meta}
          <h3 className="mt-3 font-serif text-title">
            <Link to={href} onClick={track(guide)} className="link-underline">{guide.title}</Link>
          </h3>
          {guide.excerpt && <p className="mt-3 max-w-xl leading-relaxed text-muted">{guide.excerpt}</p>}
        </div>
      </article>
    );
  }

  // Phones: compact row (square thumbnail beside the text). sm and up: full card.
  return (
    <article className="group grid grid-cols-[104px_1fr] items-start gap-4 border-t border-line pt-4 sm:flex sm:flex-col sm:gap-0 sm:border-0 sm:pt-0">
      <Link to={href} onClick={track(guide)} className="relative block aspect-square overflow-hidden sm:aspect-[3/2]">
        <HeroMedia motion={guide.hero_motion} src={guide.hero_image} alt={guide.hero_image_alt || ''} width={800} sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 104px" imgClassName="group-hover:scale-[1.03]" />
        <div className="absolute top-2 left-2 hidden sm:block"><DemoBadge show={guide.is_demo} /></div>
      </Link>
      <div className="min-w-0 sm:mt-4">
        {meta}
        <h3 className="mt-1.5 font-serif text-[1.25rem] leading-[1.1] sm:mt-2 sm:text-[1.55rem] sm:leading-[1.08]">
          <Link to={href} onClick={track(guide)} className="link-underline">{guide.title}</Link>
        </h3>
        {guide.excerpt && <p className="mt-2 hidden text-[0.95rem] leading-relaxed text-muted sm:line-clamp-2">{guide.excerpt}</p>}
      </div>
    </article>
  );
}
