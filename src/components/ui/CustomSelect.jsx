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
          'bg-white/5 border text-left',
          'transition-all duration-200 ease-in-out',
          'focus:outline-none',
          'disabled:opacity-40 disabled:cursor-not-allowed',
          open
            ? 'border-[var(--accent-color)] ring-1 ring-[var(--accent-color)]/30'
            : 'border-white/10 hover:border-white/25',
          selectedOption ? 'text-white dark:text-white' : 'text-zinc-500',
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
            'absolute z-50 w-full mt-1.5 rounded-xl border border-white/12',
            'bg-zinc-950 dark:bg-zinc-950 shadow-2xl shadow-black/60',
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
                      ? 'bg-[var(--accent-color)]/15 text-[var(--accent-color)] font-medium'
                      : 'text-zinc-200 hover:bg-white/5 hover:text-white'
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
