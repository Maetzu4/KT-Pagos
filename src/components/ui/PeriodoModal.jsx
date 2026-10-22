import { useState, useEffect } from 'react';
import {
  AlertTriangle, Save, CheckCircle2,
  Trophy, Zap, Sparkles,
} from 'lucide-react';
import { Button } from './Button';
import { Modal } from './Modal';
import { useCountUp } from '../../hooks/useCountUp';
import { formatCurrency } from '../../lib/utils';
import { formatDate } from '../../lib/dateUtils';
import { ClaseDetailModal } from './ClaseDetailModal';

function DesgloseFila({ label, value, sub, highlight, icon: Icon }) {
  return (
    <div className="flex items-center justify-between py-2.5">
      <div className="flex items-center gap-2">
        {Icon && <Icon size={14} className="shrink-0 opacity-60 text-[var(--accent-color)]" />}
        <span className={'text-sm ' + (highlight ? 'font-semibold text-[var(--accent-color)]' : 'text-zinc-600 dark:text-zinc-400')}>
          {label}
        </span>
        {sub && <span className="text-xs text-zinc-400">{sub}</span>}
      </div>
      <span className={'font-mono font-semibold text-sm tabular-nums ' + (highlight ? 'text-[var(--accent-color)]' : 'text-zinc-900 dark:text-white')}>
        {value}
      </span>
    </div>
  );
}

// ── Modal de Detalle de Periodo ───────────────────────────────────────────────
export function PeriodoModal({ periodo, open, onClose, onUpdate }) {
  const [pagadoReal,   setPagadoReal]   = useState(periodo?.pagado_real ?? 0);
  const [notasReclamo, setNotasReclamo] = useState(periodo?.notas_reclamo ?? '');
  const [saving,       setSaving]       = useState(false);
  const [claseDetalle, setClaseDetalle] = useState(null);

  // Sincronizar estado cuando cambia periodo
  useEffect(() => {
    if (periodo) {
      setPagadoReal(periodo.pagado_real ?? 0);
      setNotasReclamo(periodo.notas_reclamo ?? '');
    }
  }, [periodo?.id, periodo?.pagado_real, periodo?.notas_reclamo]);

  const totalACobrar    = periodo ? (periodo.total_a_cobrar ?? periodo.estimado_real ?? 0) : 0;
  const numPagado       = Number(pagadoReal) || 0;
  const errorPago       = numPagado - totalACobrar;
  const errorPositivo   = errorPago >= 0;
  const ingresosReg     = Number(periodo?.ingresos_regulares ?? 0);
  const ingresosExt     = Number(periodo?.ingresos_extras ?? 0);
  const montoBono       = Number(periodo?.monto_bono ?? 0);
  const pctBono         = Math.round(Number(periodo?.multiplicador_bono ?? 0) * 100);
  const deudaAnterior   = Number(periodo?.deuda_anterior ?? 0);
  const clasesEnReclamo = (periodo?.clases || []).filter((c) => c.en_reclamo);

  // Animaciones useCountUp
  const animTotalACobrar = useCountUp(open && periodo ? totalACobrar : 0);
  const animPagado       = useCountUp(open && periodo ? numPagado : 0);
  const animDiferencia   = useCountUp(open && periodo ? errorPago : 0);
  const animRegulares    = useCountUp(open && periodo ? ingresosReg : 0);
  const animExtras       = useCountUp(open && periodo ? ingresosExt : 0);
  const animBono         = useCountUp(open && periodo ? montoBono : 0);

  if (!periodo) return null;

  const handleSave = async () => {
    setSaving(true);
    try {
      await onUpdate(periodo, {
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
      <Modal open={open} onClose={() => { setClaseDetalle(null); onClose(); }} title={periodo.nombre_periodo} size="lg" maxWidth="max-w-2xl">
        <div className="space-y-5">
          {/* Rango de fechas */}
          <p className="text-xs text-zinc-500">
            {formatDate(periodo.fecha_inicio)} — {formatDate(periodo.fecha_fin)}
          </p>

          {/* ── Métricas Principales (Bloques sobrios sin bordes) ── */}
          <div className="grid grid-cols-3 gap-3 text-center">
            <div className="bg-zinc-50 dark:bg-zinc-800/40 rounded-2xl p-3.5">
              <p className="text-[10px] text-zinc-500 uppercase tracking-wide mb-1">Total a Cobrar</p>
              <p className="text-base sm:text-lg font-mono font-bold text-zinc-900 dark:text-white">
                {formatCurrency(animTotalACobrar)}
              </p>
            </div>
            <div className="bg-zinc-50 dark:bg-zinc-800/40 rounded-2xl p-3.5">
              <p className="text-[10px] text-zinc-500 uppercase tracking-wide mb-1">Pagado Real</p>
              <p className="text-base sm:text-lg font-mono font-bold text-[var(--accent-color)]">
                {formatCurrency(animPagado)}
              </p>
            </div>
            <div className="bg-zinc-50 dark:bg-zinc-800/40 rounded-2xl p-3.5">
              <p className="text-[10px] text-zinc-500 uppercase tracking-wide mb-1">Diferencia</p>
              <p className={`text-base sm:text-lg font-mono font-bold ${errorPositivo ? 'text-zinc-900 dark:text-white' : 'text-amber-500'}`}>
                {errorPositivo ? '+' : ''}{formatCurrency(animDiferencia)}
              </p>
            </div>
          </div>

          {/* ── Desglose Financiero Obligatorio ── */}
          <div className="rounded-2xl bg-zinc-50 dark:bg-zinc-800/40 p-4 space-y-2">
            <div className="flex items-center gap-2 pb-1">
              <Sparkles size={15} className="text-[var(--accent-color)]" />
              <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-700 dark:text-zinc-300">
                Desglose Financiero del Mes
              </h3>
            </div>

            <div className="divide-y divide-zinc-200/50 dark:divide-zinc-800/50">
              <DesgloseFila
                icon={CheckCircle2}
                label="Clases Regulares"
                value={formatCurrency(animRegulares)}
              />
              <DesgloseFila
                icon={Zap}
                label="Clases Extras"
                value={formatCurrency(animExtras)}
              />
              <DesgloseFila
                icon={Trophy}
                label="Bono Aplicado"
                sub={pctBono > 0 ? `(${pctBono}%)` : undefined}
                value={montoBono > 0 ? `+${formatCurrency(animBono)}` : formatCurrency(0)}
                highlight={montoBono > 0}
              />
            </div>

            {/* Total del Mes / Rollover */}
            {deudaAnterior > 0 ? (
              <div className="pt-2 space-y-1.5 font-mono text-xs">
                <div className="flex justify-between text-zinc-500 pt-2 border-t border-zinc-200/50 dark:border-zinc-800/50">
                  <span>Subtotal Clases del Mes:</span>
                  <span>{formatCurrency(periodo.estimado_real)}</span>
                </div>
                <div className={`flex justify-between ${periodo.deuda_resuelta ? 'text-zinc-400 line-through' : 'text-amber-500 font-semibold'}`}>
                  <span>+ Deuda Arrastrada:</span>
                  <span>+{formatCurrency(deudaAnterior)}</span>
                </div>
                <div className="flex items-center justify-between rounded-xl bg-[var(--accent-color)]/10 px-3.5 py-2.5 mt-2 text-sm font-bold text-[var(--accent-color)]">
                  <span>= Total a Cobrar:</span>
                  <span>{formatCurrency(animTotalACobrar)}</span>
                </div>
              </div>
            ) : (
              <div className="pt-2">
                <div className="flex items-center justify-between rounded-xl bg-[var(--accent-color)]/10 px-3.5 py-2.5 text-sm font-bold text-[var(--accent-color)] font-mono">
                  <span>Total Proyectado:</span>
                  <span>{formatCurrency(animTotalACobrar)}</span>
                </div>
              </div>
            )}
          </div>

          {/* ── Campo Editable: Pagado Real ── */}
          <div className="rounded-2xl bg-zinc-50 dark:bg-zinc-800/40 p-4 space-y-2">
            <label htmlFor="pagado-real-input" className="block text-xs font-semibold uppercase tracking-wider text-zinc-700 dark:text-zinc-300">
              Pagado Real (editable)
            </label>
            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm font-mono text-zinc-400 font-semibold pointer-events-none">
                $
              </span>
              <input
                id="pagado-real-input"
                type="number"
                step="0.01"
                value={pagadoReal}
                onChange={(e) => setPagadoReal(e.target.value)}
                placeholder="0.00"
                className="w-full h-11 pl-8 pr-4 rounded-xl border-0 bg-white dark:bg-zinc-900/70 text-zinc-900 dark:text-white text-base font-mono font-medium placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-[var(--accent-color)] transition-all"
              />
            </div>
          </div>

          {/* ── Deuda por Reclamos (si existe) ── */}
          {periodo.deuda_reclamos > 0 && (
            <div className="rounded-2xl bg-zinc-50 dark:bg-zinc-800/40 p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <AlertTriangle size={15} className="text-amber-500" />
                  <span className="text-xs font-semibold text-amber-500 uppercase tracking-wide">
                    Deuda por Reclamos
                  </span>
                </div>
                <span className="text-sm font-mono font-bold text-amber-500">
                  {formatCurrency(periodo.deuda_reclamos)}
                </span>
              </div>

              {clasesEnReclamo.length > 0 && (
                <div className="space-y-1.5 pt-1">
                  <p className="text-[11px] text-zinc-500">Clases marcadas con reclamo:</p>
                  {clasesEnReclamo.map((c) => (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => setClaseDetalle(c)}
                      className="w-full text-left flex justify-between items-center text-xs text-zinc-800 dark:text-zinc-300 bg-white/70 dark:bg-zinc-900/60 rounded-xl px-3 py-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
                    >
                      <span className="truncate">{c.nombre_clase || formatDate(c.fecha_clase) || 'Clase sin nombre'}</span>
                      <span className="font-mono text-amber-500 ml-2 shrink-0">{formatCurrency(c.precio_cobrado)}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ── Notas de Reclamo (opcional) ── */}
          <div className="rounded-2xl bg-zinc-50 dark:bg-zinc-800/40 p-4 space-y-2">
            <label htmlFor="notas-reclamo-input" className="block text-xs font-semibold uppercase tracking-wider text-zinc-700 dark:text-zinc-300">
              Notas del Periodo / Reclamos (opcional)
            </label>
            <textarea
              id="notas-reclamo-input"
              value={notasReclamo}
              onChange={(e) => setNotasReclamo(e.target.value)}
              placeholder="Describe el motivo del reclamo, discrepancias de pago, etc."
              rows={3}
              className="w-full p-3 rounded-xl border-0 bg-white dark:bg-zinc-900/70 text-zinc-900 dark:text-white text-sm placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-[var(--accent-color)] transition-all resize-none"
            />
          </div>

          {/* ── Footer ── */}
          <div className="flex justify-end pt-2">
            <Button onClick={handleSave} loading={saving} id={`btn-save-periodo-${periodo.id}`} className="px-5">
              <Save size={15} /> Guardar periodo
            </Button>
          </div>
        </div>
      </Modal>
      <ClaseDetailModal isOpen={!!claseDetalle} onClose={() => setClaseDetalle(null)} clase={claseDetalle} />
    </>
  );
}
