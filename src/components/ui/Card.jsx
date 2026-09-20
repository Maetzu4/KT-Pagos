import { cn } from '../../lib/utils';

export function Card({ className, children, ...props }) {
  return (
    <div
      className={cn(
        'rounded-2xl border border-white/8 bg-white/3 dark:bg-white/3 backdrop-blur-sm p-5',
        'transition-all duration-200',
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}

export function MetricCard({ label, value, sub, icon: Icon, trend, className }) {
  const isPositive = trend > 0;
  const isNegative = trend < 0;

  return (
    <Card className={cn('group hover:border-[var(--accent)]/30 hover:bg-white/5 cursor-default', className)}>
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <p className="text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wider mb-1">{label}</p>
          <p className="text-2xl font-semibold text-zinc-900 dark:text-white font-mono truncate">{value}</p>
          {sub && <p className="text-xs text-zinc-500 mt-1">{sub}</p>}
          {trend !== undefined && (
            <p className={cn(
              'text-xs font-medium mt-2',
              isPositive && 'text-emerald-400',
              isNegative && 'text-red-400',
              !isPositive && !isNegative && 'text-zinc-400'
            )}>
              {isPositive ? '▲' : isNegative ? '▼' : '—'} {Math.abs(trend).toFixed(2)}%
            </p>
          )}
        </div>
        {Icon && (
          <div className="w-9 h-9 rounded-xl bg-[var(--accent)]/10 flex items-center justify-center ml-3 shrink-0
                         group-hover:bg-[var(--accent)]/20 transition-colors">
            <Icon size={18} className="text-[var(--accent)]" />
          </div>
        )}
      </div>
    </Card>
  );
}
