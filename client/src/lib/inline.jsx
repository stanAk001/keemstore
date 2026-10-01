// Safe inline formatting for editor text: **bold**, *italic*, [label](url).
// Produces React elements — no HTML strings, so nothing can inject markup.
import { Link } from 'react-router-dom';
import { safeHref, isExternal } from './format.js';

const TOKEN = /(\*\*[^*]+\*\*|\*[^*\s][^*]*\*|\[[^\]]+\]\([^)\s]+\))/g;

export function Inline({ text }) {
  if (!text) return null;
  const parts = String(text).split(TOKEN);
  return parts.map((part, i) => {
    if (!part) return null;
    if (part.startsWith('**') && part.endsWith('**')) return <strong key={i}>{part.slice(2, -2)}</strong>;
    if (part.startsWith('*') && part.endsWith('*') && part.length > 2) return <em key={i}>{part.slice(1, -1)}</em>;
    const link = part.match(/^\[([^\]]+)\]\(([^)\s]+)\)$/);
    if (link) {
      const href = safeHref(link[2]);
      if (!href) return <span key={i}>{link[1]}</span>;
      if (isExternal(href)) {
        return (
          <a key={i} href={href} target="_blank" rel="noopener noreferrer nofollow">
            {link[1]}
          </a>
        );
      }
      return (
        <Link key={i} to={href}>
          {link[1]}
        </Link>
      );
    }
    return <span key={i}>{part}</span>;
  });
}

/** Plain text version (for meta descriptions, TOC labels). */
export function stripInline(text = '') {
  return String(text).replace(/\*\*([^*]+)\*\*/g, '$1').replace(/\*([^*]+)\*/g, '$1').replace(/\[([^\]]+)\]\([^)]+\)/g, '$1');
}
