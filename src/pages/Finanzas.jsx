import { useState } from 'react';
import { AlertTriangle, ChevronDown, ChevronUp, Save, TrendingDown, TrendingUp, CheckCircle2, RotateCcw } from 'lucide-react';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { FormField, Input, Textarea } from '../components/ui/FormField';
import { Badge } from '../components/ui/Badge';
import { usePeriodos } from '../hooks/usePeriodos';
import { formatCurrency } from '../lib/utils';
import { formatDate } from '../lib/dateUtils';

// ── Sub-componente: Desglose del Rollover ────────────────────────────────────
function RolloverDesglose({ periodo }) {
  const { estimado_real, deuda_anterior, total_a_cobrar, deuda_resuelta, pagado_real } = periodo;
  if (!deuda_anterior || deuda_anterior === 0) return null;

  return (
    <div className={`rounded-xl p-4 border ${
      deuda_resuelta
        ? 'bg-emerald-500/8 border-emerald-500/20'
        : 'bg-amber-500/8 border-amber-500/20'
    }`}>
      <div className="flex items-center gap-2 mb-3">
        {deuda_resuelta
          ? <CheckCircle2 size={14} className="text-emerald-400" />
          : <RotateCcw size={14} className="text-amber-400" />
        }
        <span className={`text-xs font-semibold uppercase tracking-wide ${
          deuda_resuelta ? 'text-emerald-400' : 'text-amber-400'
        }`}>
          {deuda_resuelta ? 'Deuda anterior resuelta' : 'Deuda arrastrada del mes anterior'}
        </span>
      </div>

      <div className="space-y-1.5 text-sm font-mono">
        <div className="flex justify-between text-zinc-400">
          <span>Clases del mes</span>
          <span>{formatCurrency(estimado_real)}</span>
        </div>
        <div className={`flex justify-between ${deuda_resuelta ? 'text-emerald-400 line-through opacity-60' : 'text-amber-300'}`}>
          <span>+ Deuda arrastrada</span>
          <span>+ {formatCurrency(deuda_anterior)}</span>
        </div>
        <div className="border-t border-white/10 pt-1.5 flex justify-between font-semibold text-white">
          <span>= Total a cobrar</span>
          <span>{formatCurrency(total_a_cobrar)}</span>
        </div>
        {deuda_resuelta && (
          <p className="text-xs text-emerald-500 mt-1">
            ✓ Pagado {formatCurrency(pagado_real)} — deuda cubierta
          </p>
        )}
      </div>
    </div>
  );
}

// ── Sub-componente: Tarjeta de período acordeón ───────────────────────────────
function PeriodoCard({ periodo, onUpdate }) {
  const [expanded,      setExpanded]      = useState(false);
  const [pagadoReal,    setPagadoReal]    = useState(periodo.pagado_real ?? 0);
  const [notasReclamo,  setNotasReclamo]  = useState(periodo.notas_reclamo ?? '');
  const [saving,        setSaving]        = useState(false);

  const totalACobrar  = periodo.total_a_cobrar ?? periodo.estimado_real;
  const errorPago     = (Number(pagadoReal) || 0) - totalACobrar;
  const errorPositivo = errorPago >= 0;

  // Clases en reclamo del período (ya vienen del join en el hook)
  const clasesEnReclamo = (periodo.clases || []).filter((c) => c.en_reclamo);

  const handleSave = async () => {
    setSaving(true);
    try {
      await onUpdate(periodo.id, {
        pagado_real:   parseFloat(pagadoReal) || 0,
        notas_reclamo: notasReclamo,
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card className="transition-all duration-200">
      {/* ── Cabecera (siempre visible) ─────────────────────────────────── */}
      <div
        className="flex items-center justify-between cursor-pointer select-none"
        onClick={() => setExpanded((p) => !p)}
        role="button"
        aria-expanded={expanded}
      >
        <div className="min-w-0">
          <p className="font-semibold text-white truncate">{periodo.nombre_periodo}</p>
          <p className="text-xs text-zinc-500 mt-0.5">
            {formatDate(periodo.fecha_inicio)} — {formatDate(periodo.fecha_fin)}
          </p>
        </div>

        <div className="flex items-center gap-4 shrink-0">
          {/* Mini resumen financiero */}
          <div className="hidden sm:flex gap-5 text-right">
            <div>
              <p className="text-[10px] text-zinc-500 uppercase tracking-wide">Total</p>
              <p className="text-sm font-mono font-semibold text-white">
                {formatCurrency(totalACobrar)}
              </p>
            </div>
            <div>
              <p className="text-[10px] text-zinc-500 uppercase tracking-wide">Pagado</p>
              <p className="text-sm font-mono font-semibold text-white">
                {formatCurrency(periodo.pagado_real)}
              </p>
            </div>
            <div>
              <p className="text-[10px] text-zinc-500 uppercase tracking-wide">Diferencia</p>
              <p className={`text-sm font-mono font-semibold ${errorPositivo ? 'text-emerald-400' : 'text-red-400'}`}>
                {errorPositivo ? <TrendingUp size={12} className="inline mr-0.5" /> : <TrendingDown size={12} className="inline mr-0.5" />}
                {errorPositivo ? '+' : ''}{formatCurrency(errorPago)}
              </p>
            </div>
          </div>

          {/* Badges de estado */}
          <div className="flex items-center gap-1.5">
            {periodo.deuda_anterior > 0 && !periodo.deuda_resuelta && (
              <span className="hidden sm:flex items-center gap-1 text-amber-400 text-xs bg-amber-500/10 px-2 py-0.5 rounded-full border border-amber-500/20">
                <RotateCcw size={10} /> Deuda
              </span>
            )}
            {periodo.deuda_anterior > 0 && periodo.deuda_resuelta && (
              <span className="hidden sm:flex items-center gap-1 text-emerald-400 text-xs bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                <CheckCircle2 size={10} /> Resuelta
              </span>
            )}
            {periodo.deuda_reclamos > 0 && (
              <span className="flex items-center gap-1 text-amber-400 text-xs font-medium">
                <AlertTriangle size={12} /> {formatCurrency(periodo.deuda_reclamos)}
              </span>
            )}
          </div>

          {expanded
            ? <ChevronUp size={16} className="text-zinc-400 ml-1" />
            : <ChevronDown size={16} className="text-zinc-400 ml-1" />
          }
        </div>
      </div>

      {/* ── Detalle expandido ─────────────────────────────────────────── */}
      {expanded && (
        <div className="mt-5 pt-5 border-t border-white/8 space-y-5 animate-slide-up">
          {/* Resumen en mobile */}
          <div className="sm:hidden grid grid-cols-3 gap-3 text-center">
            {[
              { l: 'Total', v: formatCurrency(totalACobrar), c: 'text-white' },
              { l: 'Pagado', v: formatCurrency(periodo.pagado_real), c: 'text-white' },
              {
                l: 'Dif.',
                v: (errorPositivo ? '+' : '') + formatCurrency(errorPago),
                c: errorPositivo ? 'text-emerald-400' : 'text-red-400',
              },
            ].map(({ l, v, c }) => (
              <div key={l} className="bg-white/5 rounded-xl p-3">
                <p className="text-xs text-zinc-500 mb-1">{l}</p>
                <p className={`text-sm font-mono font-semibold ${c}`}>{v}</p>
              </div>
            ))}
          </div>

          {/* Desglose del rollover (si aplica) */}
          <RolloverDesglose periodo={periodo} />

          {/* Campo editable: Pagado Real */}
          <FormField label="Pagado Real (editable)">
            <Input
              type="number"
              step="0.01"
              value={pagadoReal}
              onChange={(e) => setPagadoReal(e.target.value)}
              placeholder="0.00"
            />
          </FormField>

          {/* Deuda de reclamos */}
          {periodo.deuda_reclamos > 0 && (
            <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-2">
                <AlertTriangle size={14} className="text-amber-400" />
                <span className="text-xs font-semibold text-amber-400 uppercase tracking-wide">
                  Deuda por Reclamos
                </span>
                <span className="ml-auto text-lg font-mono font-semibold text-amber-300">
                  {formatCurrency(periodo.deuda_reclamos)}
                </span>
              </div>

              {/* Lista de clases en reclamo */}
              {clasesEnReclamo.length > 0 && (
                <div className="mt-3 space-y-1.5">
                  <p className="text-xs text-amber-500/70 mb-2">Clases marcadas con ⚠️:</p>
                  {clasesEnReclamo.map((c) => (
                    <div key={c.id ?? Math.random()} className="flex justify-between text-xs text-zinc-300 bg-white/3 rounded-lg px-3 py-2">
                      <span className="truncate">{c.nombre_clase || formatDate(c.fecha_clase) || 'Clase sin nombre'}</span>
                      <span className="font-mono text-amber-300 ml-2 shrink-0">{formatCurrency(c.precio_cobrado)}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Notas de reclamo */}
          <FormField label="Notas de Reclamo (opcional)">
            <Textarea
              value={notasReclamo}
              onChange={(e) => setNotasReclamo(e.target.value)}
              placeholder="Describe el motivo del reclamo, discrepancias de pago, etc."
              rows={3}
            />
          </FormField>

          <div className="flex justify-end">
            <Button onClick={handleSave} loading={saving} id={`btn-save-periodo-${periodo.id}`}>
              <Save size={14} /> Guardar periodo
            </Button>
          </div>
        </div>
      )}
    </Card>
  );
}

// ── Vista Principal ────────────────────────────────────────────────────────────
export default function Finanzas() {
  const { periodos, loading, updatePeriodo } = usePeriodos();

  // Totales globales usando total_a_cobrar para incluir deuda arrastrada
  const totalEstimado = periodos.reduce((s, p) => s + (p.total_a_cobrar ?? p.estimado_real ?? 0), 0);
  const totalPagado   = periodos.reduce((s, p) => s + (p.pagado_real ?? 0), 0);
  const totalDeuda    = periodos.reduce((s, p) => s + (p.deuda_reclamos ?? 0), 0);
  const totalRollover = periodos.reduce((s, p) => s + (p.deuda_anterior ?? 0), 0);

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-semibold text-white">Finanzas</h1>
        <p className="text-sm text-zinc-500 mt-1">Cortes mensuales y seguimiento de pagos</p>
      </div>

      {/* ── Totales globales ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { l: 'Total a Cobrar', v: formatCurrency(totalEstimado), c: 'text-white' },
          { l: 'Total Pagado',   v: formatCurrency(totalPagado),   c: 'text-emerald-400' },
          { l: 'Deuda Reclamos', v: formatCurrency(totalDeuda),    c: totalDeuda > 0 ? 'text-amber-400' : 'text-zinc-500' },
          { l: 'Deuda Arrastrada', v: formatCurrency(totalRollover), c: totalRollover > 0 ? 'text-red-400' : 'text-zinc-500' },
        ].map(({ l, v, c }) => (
          <div key={l} className="rounded-2xl border border-white/8 bg-white/3 p-4 text-center">
            <p className="text-xs text-zinc-500 mb-1">{l}</p>
            <p className={`text-base font-mono font-semibold ${c}`}>{v}</p>
          </div>
        ))}
      </div>

      {/* ── Lista de periodos ── */}
      {loading ? (
        <div className="flex justify-center py-16">
          <div className="w-6 h-6 border-2 border-[var(--accent-color)] border-t-transparent rounded-full animate-spin" />
        </div>
      ) : periodos.length === 0 ? (
        <div className="text-center py-16 text-zinc-500">
          <p>No hay periodos registrados aún.</p>
          <p className="text-sm mt-1">Se crean automáticamente al registrar clases.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {periodos.map((p) => (
            <PeriodoCard key={p.id} periodo={p} onUpdate={updatePeriodo} />
          ))}
        </div>
      )}
    </div>
  );
}
