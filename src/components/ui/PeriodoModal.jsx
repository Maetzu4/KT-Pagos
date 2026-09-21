import { useState, useMemo } from 'react';
import { AlertTriangle, Save, CheckCircle2, RotateCcw } from 'lucide-react';
import { Button } from './Button';
import { Modal } from './Modal';
import { FormField, Input, Textarea } from './FormField';
import { formatCurrency } from '../../lib/utils';
import { formatCurrency } from '../../lib/utils';
import { formatDate } from '../../lib/dateUtils';
import { ClaseDetailModal } from './ClaseDetailModal';

// ── Sub-componente: Desglose del Rollover ────────────────────────────────────
export function RolloverDesglose({ periodo }) {
  const { estimado_real, deuda_anterior, total_a_cobrar, deuda_resuelta, pagado_real } = periodo;
  if (!deuda_anterior || deuda_anterior === 0) return null;

  return (
    <div className="space-y-1.5 px-3">
      <div className="flex items-center gap-2 mb-3">
        {deuda_resuelta
          ? <CheckCircle2 size={14} className="text-[var(--accent-color)]" />
          : <RotateCcw size={14} className="text-[var(--accent-color)]" />
        }
        <span className="text-xs font-semibold uppercase tracking-wide text-[var(--accent-color)]">
          {deuda_resuelta ? 'Deuda anterior resuelta' : 'Deuda arrastrada del mes anterior'}
        </span>
      </div>

      <div className="space-y-1.5 text-sm font-mono">
        <div className="flex justify-between text-zinc-600 dark:text-zinc-400">
          <span>Clases del mes</span>
          <span>{formatCurrency(estimado_real)}</span>
        </div>
        <div className={`flex justify-between ${deuda_resuelta ? 'text-zinc-500 line-through opacity-60' : 'text-zinc-700 dark:text-zinc-300'}`}>
          <span>+ Deuda arrastrada</span>
          <span>+ {formatCurrency(deuda_anterior)}</span>
        </div>
        <div className="border-t border-zinc-200 dark:border-zinc-700/50 pt-1.5 flex justify-between font-semibold text-zinc-900 dark:text-white">
          <span>= Total a cobrar</span>
          <span>{formatCurrency(total_a_cobrar)}</span>
        </div>
        {deuda_resuelta && (
          <p className="text-xs text-[var(--accent-color)] mt-1">
            ✓ Pagado {formatCurrency(pagado_real)} — deuda cubierta
          </p>
        )}
      </div>
    </div>
  );
}

// ── Modal de Detalle de Periodo ───────────────────────────────────────────────
export function PeriodoModal({ periodo, open, onClose, onUpdate }) {
  const [pagadoReal,   setPagadoReal]   = useState(periodo?.pagado_real ?? 0);
  const [notasReclamo, setNotasReclamo] = useState(periodo?.notas_reclamo ?? '');
  const [saving,       setSaving]       = useState(false);
  const [claseDetalle, setClaseDetalle] = useState(null);

  // Re-sincronizar estado cuando cambia el periodo seleccionado
  const periodoId = periodo?.id;
  useMemo(() => {
    setPagadoReal(periodo?.pagado_real ?? 0);
    setNotasReclamo(periodo?.notas_reclamo ?? '');
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [periodoId]);

  if (!periodo) return null;

  const totalACobrar  = periodo.total_a_cobrar ?? periodo.estimado_real;
  const errorPago     = (Number(pagadoReal) || 0) - totalACobrar;
  const errorPositivo = errorPago >= 0;
  const clasesEnReclamo = (periodo.clases || []).filter((c) => c.en_reclamo);

  const handleSave = async () => {
    setSaving(true);
    try {
      await onUpdate(periodo.id, {
        pagado_real:   parseFloat(pagadoReal) || 0,
        notas_reclamo: notasReclamo,
      });
      onClose();
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
    <Modal open={open} onClose={() => { setClaseDetalle(null); onClose(); }} title={periodo.nombre_periodo} size="md">
          {/* Scroll interior del modal */}
          <div className="overflow-y-auto max-h-[70vh] space-y-7 pr-1">

        {/* Resumen de métricas */}
        <div className="grid grid-cols-3 gap-3 text-center">
          {[
            { l: 'Total', v: formatCurrency(totalACobrar), c: 'text-zinc-900 dark:text-white' },
            { l: 'Pagado', v: formatCurrency(periodo.pagado_real), c: 'text-[var(--accent-color)]' },
            {
              l: 'Diferencia',
              v: formatCurrency(errorPago),
              c: errorPositivo ? 'text-zinc-900 dark:text-white' : 'text-[var(--accent-color)]',
            },
          ].map(({ l, v, c }) => (
            <div key={l} className="bg-zinc-50 dark:bg-zinc-800/40 border border-zinc-200 dark:border-zinc-800 rounded-xl p-3">
              <p className="text-[10px] text-zinc-500 uppercase tracking-wide mb-1">{l}</p>
              <p className={`text-sm font-mono font-semibold ${c}`}>
                {v}
              </p>
            </div>
          ))}
        </div>

        {/* Fechas del periodo */}
        <p className="text-xs text-zinc-500 px-3">
          {formatDate(periodo.fecha_inicio)} — {formatDate(periodo.fecha_fin)}
        </p>

        {/* Desglose rollover */}
        <RolloverDesglose periodo={periodo} />

        {/* Campo editable: Pagado Real */}
        <div className="px-3">
          <FormField label="Pagado Real (editable)">
            <Input
              type="number"
              step="0.01"
              value={pagadoReal}
              onChange={(e) => setPagadoReal(e.target.value)}
              placeholder="0.00"
            />
          </FormField>
        </div>

        {/* Deuda de reclamos */}
        {periodo.deuda_reclamos > 0 && (
          <div className="space-y-1.5 px-3">
            <div className="flex items-center gap-2 mb-2">
              <AlertTriangle size={14} className="text-[var(--accent-color)]" />
              <span className="text-xs font-semibold text-[var(--accent-color)] uppercase tracking-wide">
                Deuda por Reclamos
              </span>
              <span className="ml-auto text-lg font-mono font-semibold text-[var(--accent-color)]">
                {formatCurrency(periodo.deuda_reclamos)}
              </span>
            </div>

            {clasesEnReclamo.length > 0 && (
              <div className="mt-3 space-y-1.5">
                <p className="text-xs text-zinc-500 mb-2">Clases marcadas con reclamo:</p>
                {clasesEnReclamo.map((c) => (
                  <button
                    key={c.id}
                    onClick={() => setClaseDetalle(c)}
                    className="w-full text-left flex justify-between items-center text-xs text-zinc-800 dark:text-zinc-300 bg-white dark:bg-zinc-800/40 border border-zinc-200 dark:border-zinc-800 rounded-lg px-3 py-2 hover:border-[var(--accent-color)]/50 transition-colors"
                  >
                    <span className="truncate">{c.nombre_clase || formatDate(c.fecha_clase) || 'Clase sin nombre'}</span>
                    <span className="font-mono text-[var(--accent-color)] ml-2 shrink-0">{formatCurrency(c.precio_cobrado)}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Notas de reclamo */}
        <div className="px-3">
          <FormField label="Notas de Reclamo (opcional)">
            <Textarea
              value={notasReclamo}
              onChange={(e) => setNotasReclamo(e.target.value)}
              placeholder="Describe el motivo del reclamo, discrepancias de pago, etc."
              rows={3}
            />
          </FormField>
        </div>
      </div>

      {/* Footer sticky */}
      <div className="flex justify-end pt-4 mt-2 border-t border-zinc-200 dark:border-zinc-800">
        <Button onClick={handleSave} loading={saving} id={`btn-save-periodo-${periodo.id}`}>
          <Save size={14} /> Guardar periodo
        </Button>
      </div>
    </Modal>
    <ClaseDetailModal isOpen={!!claseDetalle} onClose={() => setClaseDetalle(null)} clase={claseDetalle} />
    </>
  );
}
