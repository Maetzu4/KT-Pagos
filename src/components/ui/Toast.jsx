import { useEffect } from 'react';
import { AlertCircle, X } from 'lucide-react';

export function Toast({ message, type = 'warning', onClose }) {
  useEffect(() => {
    if (!message) return;
    const timer = setTimeout(() => {
      onClose?.();
    }, 4500);
    return () => clearTimeout(timer);
  }, [message, onClose]);

  if (!message) return null;

  return (
    <div className="fixed top-16 sm:top-6 left-1/2 -translate-x-1/2 z-50 max-w-md w-[92%] sm:w-auto flex items-center gap-3 px-4 py-3 rounded-2xl bg-zinc-950/90 text-white shadow-2xl backdrop-blur-xl border border-[var(--accent-color)]/20 text-xs sm:text-sm animate-fade-in pointer-events-auto">
      <div className="w-8 h-8 rounded-xl bg-[var(--accent-color)]/10 text-[var(--accent-color)] flex items-center justify-center shrink-0">
        <AlertCircle size={18} />
      </div>
      <p className="flex-1 font-medium leading-tight text-zinc-100">{message}</p>
      <button
        type="button"
        onClick={onClose}
        className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-white/10 transition-colors"
        aria-label="Cerrar advertencia"
      >
        <X size={15} />
      </button>
    </div>
  );
}

