import { Link } from 'react-router-dom';
import Icon from './Icon.jsx';

const VARIANTS = {
  primary: 'bg-ink text-paper hover:bg-accent',
  accent: 'bg-accent text-white hover:bg-accent-ink',
  outline: 'border border-ink text-ink hover:bg-ink hover:text-paper',
  ghost: 'text-ink hover:bg-paper-2',
  subtle: 'bg-paper-2 text-ink hover:bg-paper-3',
  danger: 'bg-bad text-white hover:bg-[#7e2e15]',
};
const SIZES = {
  sm: 'h-8 px-3 text-[0.8rem] gap-1.5',
  md: 'h-11 px-5 text-[0.9rem] gap-2',
  lg: 'h-13 px-7 text-[0.95rem] gap-2.5',
};

export function buttonClass({ variant = 'primary', size = 'md', className = '' } = {}) {
  return `inline-flex items-center justify-center rounded-sm font-medium tracking-[-0.005em] whitespace-nowrap transition-colors duration-200 disabled:opacity-50 ${VARIANTS[variant]} ${SIZES[size]} ${className}`;
}

export default function Button({ variant, size, className, icon, iconRight, loading, children, ...props }) {
  return (
    <button className={buttonClass({ variant, size, className })} disabled={loading || props.disabled} {...props}>
      {loading ? <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-r-transparent" aria-hidden /> : icon && <Icon name={icon} size={16} />}
      {children}
      {iconRight && <Icon name={iconRight} size={16} />}
    </button>
  );
}

export function ButtonLink({ to, variant, size, className, icon, iconRight, children, ...props }) {
  return (
    <Link to={to} className={buttonClass({ variant, size, className: `group ${className || ''}` })} {...props}>
      {icon && <Icon name={icon} size={16} />}
      {children}
      {iconRight && <Icon name={iconRight} size={16} className="transition-transform duration-300 group-hover:translate-x-0.5" />}
    </Link>
  );
}
