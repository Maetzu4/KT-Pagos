import { cn } from '../../lib/utils';

export function Badge({ variant = 'default', children, className }) {
  const variants = {
    default:    'bg-white/10 text-zinc-300',
    activo:     'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30',
    finalizado: 'bg-zinc-500/15 text-zinc-400 border border-zinc-500/30',
    reclamo:    'bg-amber-500/15 text-amber-400 border border-amber-500/30',
    extra:      'bg-[var(--accent)]/15 text-[var(--accent)] border border-[var(--accent)]/30',
    danger:     'bg-red-500/15 text-red-400 border border-red-500/30',
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
