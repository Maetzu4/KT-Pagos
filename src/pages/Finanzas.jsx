import { useState, useMemo, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import {
  AlertTriangle, TrendingUp,
  CheckCircle2, RotateCcw, DollarSign,
  ChevronRight, Sparkles, CalendarX,
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
function PeriodoCompactCard({ periodo, onClick, t }) {
  const pagado = Number(periodo?.pagado_real || 0);
  const animPagado = useCountUp(pagado);

  return (
    <div
      onClick={onClick}
      role="button"
      className="rounded-2xl bg-zinc-50 dark:bg-zinc-800/40 p-5 hover:bg-zinc-100 dark:hover:bg-zinc-800/70 transition-all duration-200 cursor-pointer space-y-3 group text-left"
    >
      <div className="flex items-center justify-between gap-2">
        <div className="min-w-0">
          <h3 className="font-semibold text-zinc-900 dark:text-white group-hover:text-[var(--accent-color)] transition-colors truncate">
            {periodo?.nombre_periodo ?? 'Periodo'}
          </h3>
          <p className="text-[11px] text-zinc-500 mt-0.5 truncate">
            {formatDate(periodo?.fecha_inicio)} — {formatDate(periodo?.fecha_fin)}
          </p>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          <ChevronRight size={15} className="text-zinc-400 group-hover:text-[var(--accent-color)] group-hover:translate-x-0.5 transition-all" />
        </div>
      </div>

      <div className="pt-2.5 border-t border-zinc-200/50 dark:border-zinc-700/40 flex items-baseline justify-between">
        <span className="text-xs font-medium text-zinc-500 uppercase tracking-wider">
          {t ? t('finances.paid', 'Pagado') : 'Pagado'}
        </span>
        <span className="text-lg font-mono font-bold text-[var(--accent-color)]">
          {formatCurrency(animPagado)}
        </span>
      </div>
    </div>
  );
}

// ── Vista Principal de Finanzas ───────────────────────────────────────────────
export default function Finanzas() {
  const { t } = useTranslation();
  // ── 1. Hooks de estado y contexto ──────────────────────────────────────────
  const { periodos, loading, updatePeriodo, metricas, periodoActual } = usePeriodos();
  const [selectedPeriodo, setSelectedPeriodo] = useState(null);

  // ── 2. Opciones de filtro de Año ───────────────────────────────────────────
  const aniosDisponibles = useMemo(() => {
    const set = new Set();
    const currentYear = String(new Date().getFullYear());
    set.add(currentYear);
    (periodos || []).forEach((p) => {
      const anio = p?.fecha_inicio?.slice(0, 4) || p?.key_periodo?.slice(0, 4);
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

  // ── 3. Filtrado por Año ────────────────────────────────────────────────────
  const periodosFiltrados = useMemo(() => {
    const anio = filtroAnio || anioDefault;
    return (periodos || []).filter((p) => {
      return (
        p?.fecha_inicio?.startsWith(anio) ||
        p?.key_periodo?.startsWith(anio)
      );
    });
  }, [periodos, filtroAnio, anioDefault]);

  // ── 4. Derivar Periodo Seleccionado / Hero con encadenamiento opcional ──────
  const periodoSeleccionado = useMemo(() => {
    if (!periodosFiltrados || periodosFiltrados.length === 0) return null;
    const match = periodosFiltrados.find((p) => p?.key_periodo === periodoActual?.key_periodo);
    return match || periodosFiltrados[0] || null;
  }, [periodosFiltrados, periodoActual]);

  const periodosGrid = useMemo(() => {
    if (!periodoSeleccionado) return [];
    return (periodosFiltrados || []).filter((p) => p?.key_periodo !== periodoSeleccionado?.key_periodo);
  }, [periodosFiltrados, periodoSeleccionado]);

  // ── 5. Valores numéricos seguros con ?. para animaciones ───────────────────
  const heroTotalACobrar = Number(periodoSeleccionado?.total_a_cobrar ?? periodoSeleccionado?.estimado_real ?? 0);
  const heroPagadoReal = Number(periodoSeleccionado?.pagado_real ?? 0);
  const heroDiferencia = heroPagadoReal - heroTotalACobrar;
  const heroClases = Number(periodoSeleccionado?.clases?.length ?? 0);
  const heroMontoBono = Number(periodoSeleccionado?.monto_bono ?? 0);
  const heroDeudaAnterior = Number(periodoSeleccionado?.deuda_anterior ?? 0);

  // ── 6. Todos los Hooks useCountUp incondicionales al nivel superior ────────
  const animEstimado = useCountUp(loading ? 0 : (metricas?.totalEstimado ?? 0));
  const animPagado = useCountUp(loading ? 0 : (metricas?.totalCobrado ?? metricas?.totalPagado ?? 0));
  const animRollover = useCountUp(loading ? 0 : (metricas?.totalRollover ?? 0));

  const animHeroTotal = useCountUp(loading || !periodoSeleccionado ? 0 : heroTotalACobrar);
  const animHeroPagado = useCountUp(loading || !periodoSeleccionado ? 0 : heroPagadoReal);
  const animHeroDiferencia = useCountUp(loading || !periodoSeleccionado ? 0 : heroDiferencia);
  const animHeroClases = useCountUp(loading || !periodoSeleccionado ? 0 : heroClases);
  const animHeroBono = useCountUp(loading || !periodoSeleccionado ? 0 : heroMontoBono);
  const animHeroDeuda = useCountUp(loading || !periodoSeleccionado ? 0 : heroDeudaAnterior);

  // ── 7. Verificación de datos / clases para empty state ─────────────────────
  const tieneDatos = useMemo(() => {
    if (loading) return true;
    if (!periodos || periodos.length === 0) return false;
    if (!periodosFiltrados || periodosFiltrados.length === 0) return false;
    return periodosFiltrados.some((p) => {
      const hasClases = Array.isArray(p?.clases) && p.clases.length > 0;
      const hasPagado = Number(p?.pagado_real || 0) > 0;
      const hasCobrar = Number(p?.total_a_cobrar || p?.estimado_real || 0) > 0;
      return hasClases || hasPagado || hasCobrar;
    });
  }, [loading, periodos, periodosFiltrados]);

  // ── 8. COMPROBACIÓN TEMPRANA (EMPTY STATE) DESPUÉS DE TODOS LOS HOOKS ──────
  if (!loading && !periodoSeleccionado) {
    return (
      <div className="space-y-6 md:space-y-8 animate-fade-in">
        <div className="flex flex-row justify-between items-start gap-4">
          <div className="hidden md:block">
            <h1 className="text-2xl font-semibold text-zinc-900 dark:text-white">{t('finances.title', 'Finanzas')}</h1>
            <p className="text-sm text-zinc-500 mt-0.5">{t('finances.subtitle', 'Cortes mensuales y seguimiento de pagos')}</p>
          </div>
          <div className="w-full md:w-auto shrink-0">
            <CustomSelect
              value={filtroAnio}
              onChange={setFiltroAnio}
              options={aniosDisponibles}
              placeholder={t('finances.year', 'Año')}
              className="w-full md:w-36 bg-zinc-100 dark:bg-zinc-800/50 border-0 rounded-xl font-medium focus:ring-2 focus:ring-[var(--accent-color)] text-xs sm:text-sm"
            />
          </div>
        </div>

        <div className="flex flex-col items-center justify-center text-center py-12 px-4 rounded-2xl bg-zinc-50 dark:bg-zinc-900/40 border border-zinc-200/60 dark:border-zinc-800/60">
          <div className="w-12 h-12 rounded-2xl bg-[var(--accent-color)]/10 text-[var(--accent-color)] flex items-center justify-center mb-3">
            <CalendarX size={24} />
          </div>
          <p className="text-base font-semibold text-zinc-900 dark:text-white">
            {t('finances.noClassesPeriod', 'Aún no hay clases registradas para este periodo.')}
          </p>
          <p className="text-xs sm:text-sm text-zinc-500 mt-1 max-w-sm">
            {t('finances.noClassesPeriodDesc', 'Completa o añade clases para generar tu reporte financiero.')}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 md:space-y-8 animate-fade-in">
      {/* ── Cabecera con Selector de Año ── */}
      <div className="flex flex-row justify-between items-start gap-4">
        <div className="hidden md:block">
          <h1 className="text-2xl font-semibold text-zinc-900 dark:text-white">{t('finances.title', 'Finanzas')}</h1>
          <p className="text-sm text-zinc-500 mt-0.5">{t('finances.subtitle', 'Cortes mensuales y seguimiento de pagos')}</p>
        </div>

        {/* Selector de Año */}
        <div className="w-full md:w-auto shrink-0">
          <CustomSelect
            value={filtroAnio}
            onChange={setFiltroAnio}
            options={aniosDisponibles}
            placeholder={t('finances.year', 'Año')}
            className="w-full md:w-36 bg-zinc-100 dark:bg-zinc-800/50 border-0 rounded-xl font-medium focus:ring-2 focus:ring-[var(--accent-color)] text-xs sm:text-sm"
          />
        </div>
      </div>

      {/* ── Totales Globales Reestructurados (3 KPIs) o Empty State ── */}
      {!tieneDatos ? (
        <div className="flex flex-col items-center justify-center text-center py-12 px-4 rounded-2xl bg-zinc-50 dark:bg-zinc-900/40 border border-zinc-200/60 dark:border-zinc-800/60">
          <div className="w-12 h-12 rounded-2xl bg-[var(--accent-color)]/10 text-[var(--accent-color)] flex items-center justify-center mb-3">
            <CalendarX size={24} />
          </div>
          <p className="text-base font-semibold text-zinc-900 dark:text-white">
            {t('finances.noClassesPeriod', 'Aún no hay clases registradas para este periodo.')}
          </p>
          <p className="text-xs sm:text-sm text-zinc-500 mt-1 max-w-sm">
            {t('finances.noClassesPeriodDesc', 'Completa o añade clases para generar tu reporte financiero.')}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <MetricCard
            label={t('finances.totalEstimated', 'Total Estimado')}
            value={formatCurrency(animEstimado)}
            icon={TrendingUp}
            className="bg-zinc-50 dark:bg-zinc-800/40 border-0 rounded-2xl"
          />
          <MetricCard
            label={t('finances.totalPaid', 'Total Pagado')}
            value={<span className="text-[var(--accent-color)]">{formatCurrency(animPagado)}</span>}
            icon={DollarSign}
            className="bg-zinc-50 dark:bg-zinc-800/40 border-0 rounded-2xl"
          />
          <MetricCard
            label={t('finances.totalRolledOver', 'Total Arrastrado')}
            value={formatCurrency(animRollover)}
            icon={RotateCcw}
            className="bg-zinc-50 dark:bg-zinc-800/40 border-0 rounded-2xl"
          />
        </div>
      )}

      {/* ── Contenido Principal (Hero + Grid) ── */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 gap-3">
          <div className="w-8 h-8 border-4 border-[var(--accent-color)] border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-zinc-500">{t('finances.loadingRecords', 'Cargando registros financieros...')}</p>
        </div>
      ) : !tieneDatos ? null : (
        <div className="space-y-8">
          {/* ── Hero del Periodo Seleccionado / Actual ── */}
          {periodoSeleccionado && (
            <div className="rounded-2xl bg-zinc-50 dark:bg-zinc-800/40 p-6 sm:p-7 space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex flex-wrap items-center gap-3">
                  <h2 className="text-xl sm:text-2xl font-bold text-zinc-900 dark:text-white">
                    {periodoSeleccionado?.nombre_periodo ?? 'Periodo'}
                  </h2>
                  {periodoSeleccionado?.key_periodo === periodoActual?.key_periodo && (
                    <span className="px-2.5 py-0.5 rounded-md bg-[var(--accent-color)]/10 text-[var(--accent-color)] text-[10px] font-bold uppercase tracking-wider">
                      {t('finances.currentPeriod', 'Periodo Actual')}
                    </span>
                  )}
                  <Button
                    size="sm"
                    onClick={() => setSelectedPeriodo(periodoSeleccionado)}
                    className="text-xs rounded-xl"
                  >
                    {t('finances.viewCutoffDetails', 'Ver detalles del corte')}
                  </Button>
                </div>

                <span className="text-xs text-zinc-500">
                  {formatDate(periodoSeleccionado?.fecha_inicio)} — {formatDate(periodoSeleccionado?.fecha_fin)}
                </span>
              </div>

              {/* Cifras Principales del Hero */}
              <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-4 pb-4 border-b border-zinc-200/50 dark:border-zinc-700/40">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500 mb-1">
                    {t('finances.projectedToCollect', 'Total Proyectado / A Cobrar')}
                  </p>
                  <p className="text-3xl sm:text-4xl font-bold font-mono text-zinc-900 dark:text-white">
                    {formatCurrency(animHeroTotal)}
                  </p>
                </div>

                <div className="flex items-center gap-6 sm:gap-8 flex-wrap">
                  <div>
                    <p className="text-xs font-medium text-zinc-500 uppercase tracking-wide">{t('finances.earnedPaid', 'Ganado / Pagado')}</p>
                    <p className="text-xl sm:text-2xl font-bold font-mono text-[var(--accent-color)]">
                      {formatCurrency(animHeroPagado)}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-zinc-500 uppercase tracking-wide">{t('finances.difference', 'Diferencia')}</p>
                    <p className={`text-xl sm:text-2xl font-bold font-mono ${heroDiferencia >= 0 ? 'text-zinc-900 dark:text-zinc-200' : 'text-[var(--accent-color)]'}`}>
                      {animHeroDiferencia >= 0 ? '+' : ''}
                      {formatCurrency(animHeroDiferencia)}
                    </p>
                  </div>
                </div>
              </div>

              {/* Submétricas del Hero */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
                <div className="rounded-xl bg-white/70 dark:bg-zinc-900/50 p-3.5 text-left">
                  <p className="text-xs text-zinc-500 mb-1">{t('finances.taughtClasses', 'Clases Impartidas')}</p>
                  <p className="text-base sm:text-lg font-semibold font-mono text-zinc-900 dark:text-white">
                    {Math.round(animHeroClases)}
                    <span className="text-xs font-normal text-zinc-400 ml-1.5 font-sans">
                      {t('finances.classesRegExt', '({{reg}} reg · {{ext}} ext)', { reg: periodoSeleccionado?.clases?.filter(c => !c?.es_adicional).length || 0, ext: periodoSeleccionado?.clases?.filter(c => c?.es_adicional).length || 0 })}
                    </span>
                  </p>
                </div>

                <div className="rounded-xl bg-white/70 dark:bg-zinc-900/50 p-3.5 text-left">
                  <p className="text-xs text-zinc-500 mb-1">{t('finances.bonusApplied', 'Bono Aplicado')}</p>
                  <p className="text-base sm:text-lg font-semibold font-mono text-zinc-900 dark:text-white">
                    {formatCurrency(animHeroBono)}
                    {(periodoSeleccionado?.multiplicador_bono ?? 0) > 0 && (
                      <span className="text-xs text-[var(--accent-color)] font-sans ml-1 font-bold">
                        (+{((periodoSeleccionado?.multiplicador_bono ?? 0) * 100).toFixed(0)}%)
                      </span>
                    )}
                  </p>
                </div>

                <div className="rounded-xl bg-white/70 dark:bg-zinc-900/50 p-3.5 text-left">
                  <p className="text-xs text-zinc-500 mb-1">{t('finances.rolledOverDebt', 'Deuda Arrastrada')}</p>
                  <p className="text-base sm:text-lg font-semibold font-mono text-zinc-900 dark:text-white">
                    {(periodoSeleccionado?.deuda_anterior ?? 0) > 0 ? (
                      <span className={periodoSeleccionado?.deuda_resuelta ? 'line-through opacity-60 text-zinc-400' : 'text-[var(--accent-color)]'}>
                        {formatCurrency(animHeroDeuda)}
                      </span>
                    ) : (
                      '—'
                    )}
                  </p>
                </div>

                <div className="rounded-xl bg-white/70 dark:bg-zinc-900/50 p-3.5 text-left">
                  <p className="text-xs text-zinc-500 mb-1">{t('finances.paymentStatus', 'Estado de Pago')}</p>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    {(periodoSeleccionado?.pagado_real || 0) >= (periodoSeleccionado?.total_a_cobrar ?? periodoSeleccionado?.estimado_real ?? 0) ? (
                      <>
                        <CheckCircle2 size={16} className="text-emerald-500" />
                        <span className="text-sm font-semibold text-emerald-600 dark:text-emerald-400">{t('finances.covered', 'Cubierto')}</span>
                      </>
                    ) : (
                      <>
                        <AlertTriangle size={16} className="text-[var(--accent-color)]" />
                        <span className="text-sm font-semibold text-[var(--accent-color)]">{t('finances.pendingDifference', 'Diferencia Pendiente')}</span>
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
                  {t('finances.otherPeriods', 'Otros Periodos')}
                </h3>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {periodosGrid.map((p) => (
                  <PeriodoCompactCard
                    key={p?.key_periodo ?? p?.id}
                    periodo={p}
                    onClick={() => setSelectedPeriodo(p)}
                    t={t}
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
