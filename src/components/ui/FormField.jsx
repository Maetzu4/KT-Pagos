import { cn } from '../../lib/utils';

export function FormField({ label, error, required, children, className }) {
  return (
    <div className={cn('flex flex-col gap-1.5 w-full', className)}>
      {label && (
        <label className="text-xs font-medium text-zinc-400 uppercase tracking-wide min-h-[1.25rem] flex items-center">
          <span>{label}</span>
          {required && <span className="text-[var(--accent-color)] ml-1 font-bold">*</span>}
        </label>
      )}
      <div className="w-full flex-1 flex flex-col justify-start">
        {children}
      </div>
      {error && <p className="text-xs text-red-400 mt-0.5">{error}</p>}
    </div>
  );
}

const inputBase = [
  'w-full h-10 rounded-lg px-3 py-2 text-sm bg-white/5 border border-white/10',
  'text-zinc-900 dark:text-white placeholder:text-zinc-600',
  'focus:outline-none focus:border-[var(--accent-color)] focus:ring-1 focus:ring-[var(--accent-color)]/30',
  'transition-all duration-200 ease-in-out',
  'disabled:opacity-40 disabled:cursor-not-allowed',
].join(' ');

export function Input({ className, ...props }) {
  return <input className={cn(inputBase, className)} {...props} />;
}

export function Select({ className, children, ...props }) {
  return (
    <select
      className={cn(inputBase, 'bg-zinc-900 dark:bg-zinc-900 cursor-pointer', className)}
      {...props}
    >
      {children}
    </select>
  );
}

export function Textarea({ className, ...props }) {
  return (
    <textarea
      className={cn(inputBase, 'h-auto resize-none min-h-[80px]', className)}
      {...props}
    />
  );
}
