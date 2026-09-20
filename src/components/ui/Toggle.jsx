import { cn } from '../../lib/utils';

export function Toggle({ checked, onChange, disabled, id, label, size = 'md' }) {
  const sizes = {
    sm: { track: 'w-8 h-4', thumb: 'w-3 h-3', translate: 'translate-x-4' },
    md: { track: 'w-11 h-6', thumb: 'w-5 h-5', translate: 'translate-x-5' },
  };
  const s = sizes[size] || sizes.md;

  return (
    <label htmlFor={id} className={cn('inline-flex items-center gap-2', !disabled && 'cursor-pointer')}>
      <div className="relative">
        <input
          id={id}
          type="checkbox"
          checked={checked}
          onChange={(e) => onChange(e.target.checked)}
          disabled={disabled}
          className="sr-only"
        />
        <div className={cn(
          s.track,
          'rounded-full transition-colors duration-200',
          checked ? 'bg-[var(--accent)]' : 'bg-zinc-700',
          disabled && 'opacity-40'
        )} />
        <div className={cn(
          s.thumb,
          'absolute top-0.5 left-0.5 bg-white rounded-full shadow-sm',
          'transition-transform duration-200',
          checked ? s.translate : 'translate-x-0'
        )} />
      </div>
      {label && <span className="text-sm text-zinc-300">{label}</span>}
    </label>
  );
}
