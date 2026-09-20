import { forwardRef } from 'react';
import { cn } from '../../lib/utils';

const variants = {
  primary: 'bg-[var(--accent-color)] text-white hover:opacity-90 focus-visible:ring-[var(--accent-color)] shadow-sm',
  ghost:   'bg-transparent text-current border border-white/10 hover:border-[var(--accent-color)] hover:text-[var(--accent-color)]',
  danger:  'bg-red-500/10 text-red-400 border border-red-500/20 hover:bg-red-500/20',
  subtle:  'bg-white/5 dark:bg-white/5 hover:bg-white/10 text-current',
};

const sizes = {
  sm: 'px-3 py-1.5 text-xs',
  md: 'px-4 py-2 text-sm',
  lg: 'px-6 py-2.5 text-sm',
  icon: 'p-2',
};

export const Button = forwardRef(function Button(
  { variant = 'primary', size = 'md', className, children, loading, ...props },
  ref
) {
  return (
    <button
      ref={ref}
      disabled={loading || props.disabled}
      className={cn(
        'inline-flex items-center justify-center gap-2 rounded-lg font-medium',
        'transition-all duration-200 ease-in-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2',
        'focus-visible:ring-offset-black disabled:opacity-40 disabled:cursor-not-allowed active:scale-[0.98]',
        variants[variant],
        sizes[size],
        className
      )}
      {...props}
    >
      {loading ? (
        <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
      ) : children}
    </button>
  );
});
