import { Link } from 'react-router-dom';
import Img from '../ui/Img.jsx';
import Icon from '../ui/Icon.jsx';
import { trackEvent } from '../../lib/track.js';

/** Image-led category tile. `tall` stretches it to fill a taller grid cell. */
export default function CategoryCard({ category, tall = false, index, sizes = '(min-width: 1024px) 25vw, 50vw' }) {
  return (
    <Link
      to={category.path}
      onClick={() => trackEvent('category_click', { entity_type: 'category', entity_id: category.id })}
      className="group relative flex h-full min-h-[160px] flex-col sm:min-h-[220px] justify-end overflow-hidden bg-ink text-paper"
    >
      <div className="absolute inset-0">
        <Img src={category.image_url} alt={category.image_alt || ''} sizes={sizes} width={tall ? 1000 : 700} imgClassName="opacity-80 group-hover:scale-[1.04] group-hover:opacity-70" />
      </div>
      <div className="absolute inset-0 bg-gradient-to-t from-ink/85 via-ink/20 to-transparent" aria-hidden />
      <div className="relative flex items-end justify-between gap-3 p-3.5 sm:p-5 md:p-6">
        <div>
          {index != null && <span className="font-mono text-[0.7rem] text-paper/70">{String(index).padStart(2, '0')}</span>}
          <h3 className={`font-serif leading-none ${tall ? 'text-[2.3rem] md:text-[3.4rem]' : 'text-[1.45rem] sm:text-[1.9rem] md:text-[2.2rem]'}`}>{category.name}</h3>
          {category.description && <p className={`mt-2 max-w-xs text-[0.85rem] leading-snug text-paper/80 sm:text-[0.9rem] ${tall ? '' : 'hidden sm:line-clamp-2'}`}>{category.description}</p>}
        </div>
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-paper/40 sm:h-10 sm:w-10 transition-colors group-hover:border-accent group-hover:bg-accent">
          <Icon name="arrow" size={16} />
        </span>
      </div>
    </Link>
  );
}
