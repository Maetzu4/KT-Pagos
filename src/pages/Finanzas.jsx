import { useState, useMemo, useEffect } from 'react';
import {
  AlertTriangle, TrendingUp,
  CheckCircle2, RotateCcw, DollarSign,
  ChevronRight, Sparkles,
} from 'lucide-react';
import { MetricCard } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { PeriodoModal } from '../components/ui/PeriodoModal';
import { CustomSelect } from '../components/ui/CustomSelect';
import { usePeriodos } from '../hooks/usePeriodos';
import { useCountUp } from '../hooks/useCountUp';
import { formatCurrency } from '../lib/utils';
import { formatDate } from '../lib/dateUtils';

// ── Tarjeta compacta para la cuadrícula de periodos pasados ───────────────────
function PeriodoCompactCard({ periodo, onClick }) {
  const pagado = periodo.pagado_real || 0;

  return (
    <div
      onClick={onClick}
      role="button"
      className="rounded-2xl bg-zinc-50 dark:bg-zinc-800/40 p-5 hover:bg-zinc-100 dark:hover:bg-zinc-800/70 transition-all duration-200 cursor-pointer space-y-3 group text-left"
    >
      <div className="flex items-center justify-between gap-2">
        <div className="min-w-0">
          <h3 className="font-semibold text-zinc-900 dark:text-white group-hover:text-[var(--accent-color)] transition-colors truncate">
            {periodo.nombre_periodo}
          </h3>
          <p className="text-[11px] text-zinc-500 mt-0.5 truncate">
            {formatDate(periodo.fecha_inicio)} — {formatDate(periodo.fecha_fin)}
          </p>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          <ChevronRight size={15} className="text-zinc-400 group-hover:text-[var(--accent-color)] group-hover:translate-x-0.5 transition-all" />
        </div>
      </div>

      <div className="pt-2.5 border-t border-zinc-200/50 dark:border-zinc-700/40 flex items-baseline justify-between">
        <span className="text-xs font-medium text-zinc-500 uppercase tracking-wider">
          Pagado
        </span>
        <span className="text-lg font-mono font-bold text-[var(--accent-color)]">
          {formatCurrency(pagado)}
        </span>
      </div>
    </div>
  );
}

// ── Vista Principal de Finanzas ───────────────────────────────────────────────
export default function Finanzas() {
  const { periodos, loading, updatePeriodo, metricas, periodoActual } = usePeriodos();

  const [selectedPeriodo, setSelectedPeriodo] = useState(null);

  // ── Opciones de filtro de Año (estrictamente años numéricos válidos) ───────
  const aniosDisponibles = useMemo(() => {
    const set = new Set();
    const currentYear = String(new Date().getFullYear());
    set.add(currentYear);
    periodos.forEach((p) => {
      const anio = p.fecha_inicio?.slice(0, 4) || p.key_periodo?.slice(0, 4);
      if (anio && /^\d{4}$/.test(anio)) set.add(anio);
    });
    const sorted = [...set].sort((a, b) => b.localeCompare(a));
    return sorted.map((a) => ({ value: a, label: a }));
  }, [periodos]);

  // Año actual por defecto garantizado
  const anioDefault = useMemo(() => {
    return periodoActual?.key_periodo?.slice(0, 4) || (aniosDisponibles[0]?.value ?? String(new Date().getFullYear()));
  }, [periodoActual, aniosDisponibles]);

  const [filtroAnio, setFiltroAnio] = useState(anioDefault);

  // Sincronizar y validar que filtroAnio sea siempre un año válido existente
  useEffect(() => {
    if (!filtroAnio || !aniosDisponibles.some((opt) => opt.value === filtroAnio)) {
      if (aniosDisponibles.length > 0) {
        setFiltroAnio(anioDefault);
      }
    }
  }, [periodoActual, aniosDisponibles, filtroAnio, anioDefault]);

  // Totales animados (Total Estimado, Total Pagado, Total Arrastrado)
  const animEstimado = useCountUp(metricas?.totalEstimado ?? 0);
  const animPagado = useCountUp(metricas?.totalCobrado ?? metricas?.totalPagado ?? 0);
  const animRollover = useCountUp(metricas?.totalRollover ?? 0);

  // ── Filtrado por Año ───────────────────────────────────────────────────────
  const periodosFiltrados = useMemo(() => {
    const anio = filtroAnio || anioDefault;
    return periodos.filter((p) => {
      return (
        p.fecha_inicio?.startsWith(anio) ||
        p.key_periodo?.startsWith(anio)
      );
    });
  }, [periodos, filtroAnio, anioDefault]);

  // Derivar Periodo Hero (seleccionado o actual) y los demás periodos para el Grid
  const periodoHero = useMemo(() => {
    if (periodosFiltrados.length === 0) return null;
    const match = periodosFiltrados.find((p) => p.key_periodo === periodoActual?.key_periodo);
    return match || periodosFiltrados[0];
  }, [periodosFiltrados, periodoActual]);

  const periodosGrid = useMemo(() => {
    if (!periodoHero) return [];
    return periodosFiltrados.filter((p) => p.key_periodo !== periodoHero.key_periodo);
  }, [periodosFiltrados, periodoHero]);

  return (
    <div className="space-y-8 animate-fade-in">
      {/* ── Cabecera con Único Selector de Año alineado a la derecha ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-zinc-900 dark:text-white">Finanzas</h1>
          <p className="text-sm text-zinc-500 mt-0.5">Cortes mensuales y seguimiento de pagos</p>
        </div>

        {/* Único Selector: Año */}
        <div className="w-32 sm:w-36">
          <CustomSelect
            value={filtroAnio}
            onChange={setFiltroAnio}
            options={aniosDisponibles}
            placeholder="Año"
            className="bg-zinc-100 dark:bg-zinc-800/50 border-0 rounded-xl font-medium focus:ring-2 focus:ring-[var(--accent-color)] text-xs sm:text-sm"
          />
        </div>
      </div>

      {/* ── Totales Globales Reestructurados (3 KPIs) ── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <MetricCard
          label="Total Estimado"
          value={formatCurrency(animEstimado)}
          icon={TrendingUp}
          className="bg-zinc-50 dark:bg-zinc-800/40 border-0 rounded-2xl"
        />
        <MetricCard
          label="Total Pagado"
          value={<span className="text-[var(--accent-color)]">{formatCurrency(animPagado)}</span>}
          icon={DollarSign}
          className="bg-zinc-50 dark:bg-zinc-800/40 border-0 rounded-2xl"
        />
        <MetricCard
          label="Total Arrastrado"
          value={formatCurrency(animRollover)}
          icon={RotateCcw}
          className="bg-zinc-50 dark:bg-zinc-800/40 border-0 rounded-2xl"
        />
      </div>

      {/* ── Contenido Principal (Hero + Grid) ── */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 gap-3">
          <div className="w-8 h-8 border-4 border-[var(--accent-color)] border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-zinc-500">Cargando registros financieros...</p>
        </div>
      ) : periodosFiltrados.length === 0 ? (
        <div className="text-center py-20 bg-zinc-50 dark:bg-zinc-800/20 rounded-2xl p-6 text-zinc-500">
          <p className="font-medium text-zinc-700 dark:text-zinc-300">No hay periodos registrados para este año.</p>
          <p className="text-xs mt-1">Los periodos se generan automáticamente al programar o completar clases.</p>
        </div>
      ) : (
        <div className="space-y-8">
          {/* ── Hero del Periodo Seleccionado / Actual ── */}
          {periodoHero && (
            <div className="rounded-2xl bg-zinc-50 dark:bg-zinc-800/40 p-6 sm:p-7 space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-2.5 flex-wrap">
                  <h2 className="text-xl sm:text-2xl font-bold text-zinc-900 dark:text-white">
                    {periodoHero.nombre_periodo}
                  </h2>
                  {periodoHero.key_periodo === periodoActual?.key_periodo && (
                    <span className="px-2.5 py-0.5 rounded-md bg-[var(--accent-color)]/10 text-[var(--accent-color)] text-[10px] font-bold uppercase tracking-wider">
                      Periodo Actual
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-3">
                  <span className="text-xs text-zinc-500">
                    {formatDate(periodoHero.fecha_inicio)} — {formatDate(periodoHero.fecha_fin)}
                  </span>
                  <Button
                    size="sm"
                    onClick={() => setSelectedPeriodo(periodoHero)}
                    className="text-xs rounded-xl"
                  >
                    Ver detalles del corte
                  </Button>
                </div>
              </div>

              {/* Cifras Principales del Hero */}
              <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-4 pb-4 border-b border-zinc-200/50 dark:border-zinc-700/40">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500 mb-1">
                    Total Proyectado / A Cobrar
                  </p>
                  <p className="text-3xl sm:text-4xl font-bold font-mono text-zinc-900 dark:text-white">
                    {formatCurrency(periodoHero.total_a_cobrar ?? periodoHero.estimado_real)}
                  </p>
                </div>

                <div className="flex items-center gap-6 sm:gap-8 flex-wrap">
                  <div>
                    <p className="text-xs font-medium text-zinc-500 uppercase tracking-wide">Ganado / Pagado</p>
                    <p className="text-xl sm:text-2xl font-bold font-mono text-[var(--accent-color)]">
                      {formatCurrency(periodoHero.pagado_real)}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-zinc-500 uppercase tracking-wide">Diferencia</p>
                    <p className={`text-xl sm:text-2xl font-bold font-mono ${((periodoHero.pagado_real || 0) - (periodoHero.total_a_cobrar ?? periodoHero.estimado_real)) >= 0 ? 'text-zinc-900 dark:text-zinc-200' : 'text-amber-500'}`}>
                      {((periodoHero.pagado_real || 0) - (periodoHero.total_a_cobrar ?? periodoHero.estimado_real)) >= 0 ? '+' : ''}
                      {formatCurrency((periodoHero.pagado_real || 0) - (periodoHero.total_a_cobrar ?? periodoHero.estimado_real))}
                    </p>
                  </div>
                </div>
              </div>

              {/* Submétricas del Hero */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
                <div className="rounded-xl bg-white/70 dark:bg-zinc-900/50 p-3.5 text-left">
                  <p className="text-xs text-zinc-500 mb-1">Clases Impartidas</p>
                  <p className="text-base sm:text-lg font-semibold font-mono text-zinc-900 dark:text-white">
                    {periodoHero.clases?.length || 0}
                    <span className="text-xs font-normal text-zinc-400 ml-1.5 font-sans">
                      ({periodoHero.clases?.filter(c => !c.es_adicional).length || 0} reg · {periodoHero.clases?.filter(c => c.es_adicional).length || 0} ext)
                    </span>
                  </p>
                </div>

                <div className="rounded-xl bg-white/70 dark:bg-zinc-900/50 p-3.5 text-left">
                  <p className="text-xs text-zinc-500 mb-1">Bono Aplicado</p>
                  <p className="text-base sm:text-lg font-semibold font-mono text-zinc-900 dark:text-white">
                    {formatCurrency(periodoHero.monto_bono || 0)}
                    {periodoHero.multiplicador_bono > 0 && (
                      <span className="text-xs text-[var(--accent-color)] font-sans ml-1 font-bold">
                        (+{(periodoHero.multiplicador_bono * 100).toFixed(0)}%)
                      </span>
                    )}
                  </p>
                </div>

                <div className="rounded-xl bg-white/70 dark:bg-zinc-900/50 p-3.5 text-left">
                  <p className="text-xs text-zinc-500 mb-1">Deuda Arrastrada</p>
                  <p className="text-base sm:text-lg font-semibold font-mono text-zinc-900 dark:text-white">
                    {periodoHero.deuda_anterior > 0 ? (
                      <span className={periodoHero.deuda_resuelta ? 'line-through opacity-60 text-zinc-400' : 'text-amber-500'}>
                        {formatCurrency(periodoHero.deuda_anterior)}
                      </span>
                    ) : (
                      '—'
                    )}
                  </p>
                </div>

                <div className="rounded-xl bg-white/70 dark:bg-zinc-900/50 p-3.5 text-left">
                  <p className="text-xs text-zinc-500 mb-1">Estado de Pago</p>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    {(periodoHero.pagado_real || 0) >= (periodoHero.total_a_cobrar ?? periodoHero.estimado_real) ? (
                      <>
                        <CheckCircle2 size={16} className="text-emerald-500" />
                        <span className="text-sm font-semibold text-emerald-600 dark:text-emerald-400">Cubierto</span>
                      </>
                    ) : (
                      <>
                        <AlertTriangle size={16} className="text-amber-500" />
                        <span className="text-sm font-semibold text-amber-600 dark:text-amber-400">Diferencia Pendiente</span>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ── Grid de Periodos Pasados / Restantes ── */}
          {periodosGrid.length > 0 && (
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Sparkles size={16} className="text-[var(--accent-color)]" />
                <h3 className="text-sm font-semibold uppercase tracking-wider text-zinc-700 dark:text-zinc-300">
                  Otros Periodos
                </h3>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {periodosGrid.map((p) => (
                  <PeriodoCompactCard
                    key={p.key_periodo}
                    periodo={p}
                    onClick={() => setSelectedPeriodo(p)}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Modal de Detalle de Periodo ── */}
      <PeriodoModal
        periodo={selectedPeriodo}
        open={Boolean(selectedPeriodo)}
        onClose={() => setSelectedPeriodo(null)}
        onUpdate={async (targetPeriodo, values) => {
          await updatePeriodo(targetPeriodo, values);
          setSelectedPeriodo(null);
        }}
      />
    </div>
  );
}
