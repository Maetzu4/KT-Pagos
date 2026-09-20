import { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { AlertTriangle } from 'lucide-react';
import { Button } from './Button';

/**
 * ConfirmDialog — Reemplazo de window.confirm nativo.
 *
 * Props:
 *  - open        : boolean
 *  - title       : string
 *  - message     : string
 *  - onConfirm   : () => void
 *  - onCancel    : () => void
 *  - confirmText : string  (default: 'Confirmar')
 *  - cancelText  : string  (default: 'Cancelar')
 *  - destructive : boolean — usa variante danger en el botón de confirmar
 */
export function ConfirmDialog({
  open,
  title = '¿Estás seguro?',
  message,
  onConfirm,
  onCancel,
  confirmText = 'Confirmar',
  cancelText = 'Cancelar',
  destructive = false,
}) {
  const overlayRef = useRef(null);

  useEffect(() => {
    const onKey = (e) => {
      if (!open) return;
      if (e.key === 'Escape') onCancel();
      if (e.key === 'Enter')  onConfirm();
    };
    if (open) document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onCancel, onConfirm]);

  if (!open) return null;

  return createPortal(
    <div
      ref={overlayRef}
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4 sm:p-6 bg-zinc-900/30 dark:bg-black/60 backdrop-blur-sm animate-fade-in"
      onClick={(e) => { if (e.target === overlayRef.current) onCancel(); }}
    >
      <div className="w-full max-w-sm bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-2xl animate-slide-up">
        {/* Header */}
        <div className="flex items-start gap-3 px-6 pt-5 pb-3">
          <div className="shrink-0 w-9 h-9 rounded-xl bg-red-500/10 flex items-center justify-center mt-0.5">
            <AlertTriangle size={16} className="text-red-500 dark:text-red-400" />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-zinc-900 dark:text-white">{title}</h2>
            {message && (
              <p className="text-xs text-zinc-500 mt-1 leading-relaxed">{message}</p>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 px-6 py-4 border-t border-zinc-200 dark:border-zinc-800">
          <Button variant="ghost" size="sm" onClick={onCancel}>
            {cancelText}
          </Button>
          <Button
            variant={destructive ? 'danger' : 'primary'}
            size="sm"
            onClick={onConfirm}
          >
            {confirmText}
          </Button>
        </div>
      </div>
    </div>,
    document.body
  );
}
