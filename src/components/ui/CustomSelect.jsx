import { useState, useRef, useEffect } from 'react';
import { ChevronDown, Check } from 'lucide-react';
import { cn } from '../../lib/utils';

/**
 * CustomSelect — reemplaza los <select> nativos con un dropdown premium.
 *
 * Props:
 *   value        — valor seleccionado actualmente
 *   onChange     — callback (value: string) => void
 *   options      — [{ value: string, label: string }]
 *   placeholder  — texto cuando no hay selección
 *   disabled     — deshabilita el control
 *   className    — clases extras para el trigger
 *   id           — id del trigger (para labels)
 */
export function CustomSelect({
  value,
  onChange,
  options = [],
  placeholder = 'Selecciona…',
  disabled = false,
  className,
  id,
}) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef(null);

  const selectedOption = options.find((o) => String(o.value) === String(value));

  // Cierre al hacer clic fuera
  useEffect(() => {
    if (!open) return;
    const handler = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  // Soporte navegación por teclado
  const handleKeyDown = (e) => {
    if (disabled) return;
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      setOpen((v) => !v);
    }
    if (e.key === 'Escape') setOpen(false);
    if (e.key === 'ArrowDown' && open) {
      e.preventDefault();
      const idx = options.findIndex((o) => String(o.value) === String(value));
      const next = options[idx + 1];
      if (next) onChange(next.value);
    }
    if (e.key === 'ArrowUp' && open) {
      e.preventDefault();
      const idx = options.findIndex((o) => String(o.value) === String(value));
      const prev = options[idx - 1];
      if (prev) onChange(prev.value);
    }
  };

  return (
    <div ref={containerRef} className="relative w-full">
      {/* ── Trigger ── */}
      <button
        type="button"
        id={id}
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => !disabled && setOpen((v) => !v)}
        onKeyDown={handleKeyDown}
        className={cn(
          'w-full h-10 flex items-center justify-between gap-2 rounded-lg px-3 text-sm',
          'bg-transparent dark:bg-zinc-900/40 border text-left',
          'transition-all duration-200 ease-in-out',
          'outline-none focus:outline-none focus:border-[var(--accent-color)] focus:ring-1 focus:ring-[var(--accent-color)] focus:ring-offset-0 focus:ring-offset-transparent',
          'disabled:opacity-40 disabled:cursor-not-allowed',
          open
            ? 'border-[var(--accent-color)] ring-1 ring-[var(--accent-color)]'
            : 'border-zinc-300 dark:border-white/10 hover:border-zinc-400 dark:hover:border-white/25',
          selectedOption ? 'text-zinc-900 dark:text-white' : 'text-zinc-400 dark:text-zinc-500',
          className
        )}
      >
        <span className="truncate flex-1">
          {selectedOption ? selectedOption.label : placeholder}
        </span>
        <ChevronDown
          size={14}
          className={cn(
            'shrink-0 text-zinc-400 transition-transform duration-200',
            open && 'rotate-180 text-[var(--accent-color)]'
          )}
        />
      </button>

      {/* ── Dropdown ── */}
      {open && (
        <div
          role="listbox"
          className={cn(
            'absolute z-50 w-full mt-1.5 rounded-xl border border-zinc-200 dark:border-zinc-800',
            'bg-white dark:bg-zinc-900 shadow-xl dark:shadow-2xl dark:shadow-black/60',
            'overflow-hidden animate-slide-up',
            'max-h-60 overflow-y-auto'
          )}
        >
          {options.length === 0 ? (
            <div className="px-4 py-3 text-sm text-zinc-500 text-center">Sin opciones</div>
          ) : (
            options.map((option) => {
              const isSelected = String(option.value) === String(value);
              return (
                <button
                  key={option.value}
                  type="button"
                  role="option"
                  aria-selected={isSelected}
                  onClick={() => {
                    onChange(option.value);
                    setOpen(false);
                  }}
                  className={cn(
                    'w-full flex items-center justify-between gap-3 px-4 py-2.5 text-sm text-left',
                    'transition-all duration-150',
                    isSelected
                      ? 'bg-[var(--accent-color)]/10 dark:bg-[var(--accent-color)]/15 text-[var(--accent-color)] font-medium'
                      : 'text-zinc-700 hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-200 dark:hover:bg-zinc-800/60 dark:hover:text-white'
                  )}
                >
                  <span className="truncate">{option.label}</span>
                  {isSelected && (
                    <Check size={13} className="shrink-0 text-[var(--accent-color)]" />
                  )}
                </button>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}
