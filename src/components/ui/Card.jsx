import { cn } from '../../lib/utils';

export function Card({ className, children, ...props }) {
  return (
    <div
      className={cn(
        'rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-sm p-5',
        'transition-all duration-200',
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}

export function MetricCard({ label, value, sub, icon: Icon, className, onClick }) {
  return (
    <Card 
      onClick={onClick}
      className={cn(
        'group hover:border-[var(--accent-color)]/30 hover:bg-zinc-50 dark:hover:bg-zinc-800/50', 
        onClick ? 'cursor-pointer hover:scale-[1.02] active:scale-[0.98]' : 'cursor-default',
        className
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <p className="text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wider mb-1 truncate">{label}</p>
          <p className="text-xl font-semibold text-zinc-900 dark:text-white font-mono leading-tight break-all">{value}</p>
          {sub && <p className="text-xs text-zinc-500 mt-1 truncate">{sub}</p>}
        </div>
        {Icon && (
          <div className="w-9 h-9 rounded-xl bg-[var(--accent-color)]/10 flex items-center justify-center shrink-0
                         group-hover:bg-[var(--accent-color)]/20 transition-colors">
            <Icon size={18} className="text-[var(--accent-color)]" />
          </div>
        )}
      </div>
    </Card>
  );
}
