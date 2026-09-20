import { cn } from '../../lib/utils';

export function Badge({ variant = 'default', children, className }) {
  const variants = {
    default:    'bg-zinc-100 dark:bg-white/10 text-zinc-700 dark:text-zinc-300 border border-zinc-200 dark:border-transparent',
    activo:     'bg-[var(--accent-color)]/10 text-[var(--accent-color)]',
    finalizado: 'bg-zinc-100 dark:bg-zinc-500/15 text-zinc-600 dark:text-zinc-400 border border-zinc-200 dark:border-transparent',
    reclamo:    'bg-[var(--accent-color)]/10 text-[var(--accent-color)]',
    extra:      'bg-zinc-100 dark:bg-white/10 text-zinc-700 dark:text-zinc-300 border border-zinc-200 dark:border-transparent',
    danger:     'bg-[var(--accent-color)]/10 text-[var(--accent-color)]',
  };

  return (
    <span className={cn(
      'inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium',
      variants[variant] || variants.default,
      className
    )}>
      {children}
    </span>
  );
}
