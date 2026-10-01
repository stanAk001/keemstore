import { Link } from 'react-router-dom';
import Icon from './Icon.jsx';
import { errorMessage } from '../../lib/api.js';

export function EmptyState({ title = 'Nothing here yet', body, action, compact = false }) {
  return (
    <div className={`flex flex-col items-start border border-dashed border-line-strong ${compact ? 'p-6' : 'p-8 md:p-12'}`}>
      <span className="font-serif text-4xl italic leading-none text-accent">—</span>
      <h3 className="mt-3 font-serif text-2xl">{title}</h3>
      {body && <p className="mt-2 max-w-md text-muted">{body}</p>}
      {action && (
        <Link to={action.url} className="group mt-5 inline-flex items-center gap-2 text-sm font-medium">
          <span className="link-underline">{action.label}</span>
          <Icon name="arrow" size={16} />
        </Link>
      )}
    </div>
  );
}

export function ErrorState({ error, onRetry, title = "That didn't load" }) {
  return (
    <div className="flex flex-col items-start gap-3 border-l-2 border-accent bg-card p-6" role="alert">
      <h3 className="font-serif text-2xl">{title}</h3>
      <p className="text-muted">{errorMessage(error)}</p>
      {onRetry && (
        <button onClick={onRetry} className="text-sm font-medium underline decoration-accent underline-offset-4">
          Try again
        </button>
      )}
    </div>
  );
}

export function Skeleton({ className = '' }) {
  return <div className={`skeleton rounded-xs ${className}`} aria-hidden />;
}

export function CardGridSkeleton({ count = 8, aspect = 'aspect-[4/5]' }) {
  return (
    <div className="grid grid-cols-2 gap-x-4 gap-y-10 md:grid-cols-3 lg:grid-cols-4" aria-busy="true" aria-label="Loading">
      {Array.from({ length: count }, (_, i) => (
        <div key={i}>
          <Skeleton className={`${aspect} w-full`} />
          <Skeleton className="mt-4 h-4 w-3/4" />
          <Skeleton className="mt-2 h-4 w-1/2" />
        </div>
      ))}
    </div>
  );
}

export function PageSkeleton() {
  return (
    <div className="container-x animate-fade-in py-12" aria-busy="true" aria-label="Loading">
      <Skeleton className="h-3 w-40" />
      <Skeleton className="mt-6 h-16 w-3/4 max-w-3xl" />
      <Skeleton className="mt-4 h-5 w-1/2 max-w-xl" />
      <div className="mt-14">
        <CardGridSkeleton count={4} />
      </div>
    </div>
  );
}
