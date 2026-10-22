import { useState, useMemo } from 'react';
import {
  AlertTriangle, TrendingUp,
  CheckCircle2, RotateCcw, Search, DollarSign,
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
  const totalACobrar = periodo.total_a_cobrar ?? periodo.estimado_real ?? 0;
  const pagado = periodo.pagado_real || 0;
  const errorPago = pagado - totalACobrar;
  const errorPositivo = errorPago >= 0;
  const tieneDeuda = (periodo.deuda_reclamos > 0) || (periodo.deuda_anterior > 0 && !periodo.deuda_resuelta);

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
          {tieneDeuda && (
            <span className="px-2 py-0.5 rounded-md bg-amber-500/10 text-amber-500 text-[10px] font-bold uppercase tracking-wide flex items-center gap-1">
              <AlertTriangle size={10} />
              Deuda
            </span>
          )}
          <ChevronRight size={14} className="text-zinc-400 group-hover:text-[var(--accent-color)] group-hover:translate-x-0.5 transition-all" />
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2 pt-3 border-t border-zinc-200/50 dark:border-zinc-700/40">
        <div>
          <p className="text-[10px] text-zinc-500 uppercase tracking-wide">Total</p>
          <p className="text-sm font-mono font-semibold text-zinc-900 dark:text-white mt-0.5">
            {formatCurrency(totalACobrar)}
          </p>
        </div>
        <div>
          <p className="text-[10px] text-zinc-500 uppercase tracking-wide">Pagado</p>
          <p className="text-sm font-mono font-semibold text-[var(--accent-color)] mt-0.5">
            {formatCurrency(pagado)}
          </p>
        </div>
        <div>
          <p className="text-[10px] text-zinc-500 uppercase tracking-wide">Diferencia</p>
          <p className={`text-sm font-mono font-semibold mt-0.5 ${errorPositivo ? 'text-zinc-700 dark:text-zinc-300' : 'text-amber-500'}`}>
            {errorPositivo ? '+' : ''}{formatCurrency(errorPago)}
          </p>
        </div>
      </div>
    </div>
  );
}

// ── Vista Principal de Finanzas ───────────────────────────────────────────────
export default function Finanzas() {
  const { periodos, loading, updatePeriodo, metricas, periodoActual } = usePeriodos();

  const [selectedPeriodo, setSelectedPeriodo] = useState(null);
  const [search, setSearch] = useState('');
  const [filtroAnio, setFiltroAnio] = useState('');
  const [filtroMes, setFiltroMes] = useState('');

  // Totales animados (Total Estimado, Total Pagado, Total Arrastrado)
  const animEstimado = useCountUp(metricas?.totalEstimado ?? 0);
  const animPagado = useCountUp(metricas?.totalCobrado ?? metricas?.totalPagado ?? 0);
  const animRollover = useCountUp(metricas?.totalRollover ?? 0);

  // ── Opciones de filtros Año y Mes ──────────────────────────────────────────
  const aniosDisponibles = useMemo(() => {
    const set = new Set();
    periodos.forEach((p) => {
      const anio = p.fecha_inicio?.slice(0, 4) || p.key_periodo?.slice(0, 4);
      if (anio) set.add(anio);
    });
    return [
      { value: '', label: 'Año (Todos)' },
      ...[...set].sort((a, b) => b.localeCompare(a)).map((a) => ({ value: a, label: a })),
    ];
  }, [periodos]);

  const MESES = [
    { value: '', label: 'Mes (Todos)' },
    { value: '01', label: 'Enero' }, { value: '02', label: 'Febrero' },
    { value: '03', label: 'Marzo' }, { value: '04', label: 'Abril' },
    { value: '05', label: 'Mayo' }, { value: '06', label: 'Junio' },
    { value: '07', label: 'Julio' }, { value: '08', label: 'Agosto' },
    { value: '09', label: 'Septiembre' }, { value: '10', label: 'Octubre' },
    { value: '11', label: 'Noviembre' }, { value: '12', label: 'Diciembre' },
  ];

  // ── Filtrado combinado ────────────────────────────────────────────────────
  const periodosFiltrados = useMemo(() => {
    const q = search.trim().toLowerCase();
    return periodos.filter((p) => {
      if (filtroAnio && !p.fecha_inicio?.startsWith(filtroAnio) && !p.key_periodo?.startsWith(filtroAnio)) return false;
      if (filtroMes && p.fecha_inicio?.slice(5, 7) !== filtroMes && p.key_periodo?.slice(5, 7) !== filtroMes) return false;
      if (q) {
        const totalACobrar = String(p.total_a_cobrar ?? p.estimado_real ?? '');
        const pagado = String(p.pagado_real ?? '');
        const deuda = String(p.deuda_reclamos ?? '');
        const notas = (p.notas_reclamo ?? '').toLowerCase();
        const nombre = (p.nombre_periodo ?? '').toLowerCase();
        return (
          totalACobrar.includes(q) ||
          pagado.includes(q) ||
          deuda.includes(q) ||
          notas.includes(q) ||
          nombre.includes(q)
        );
      }
      return true;
    });
  }, [periodos, search, filtroAnio, filtroMes]);

  // Derivar Periodo Hero (seleccionado o actual) y los demás periodos para el Grid
  const periodoHero = useMemo(() => {
    if (periodosFiltrados.length === 0) return null;
    if (filtroAnio || filtroMes || search) {
      return periodosFiltrados[0];
    }
    const match = periodosFiltrados.find((p) => p.key_periodo === periodoActual?.key_periodo);
    return match || periodosFiltrados[0];
  }, [periodosFiltrados, periodoActual, filtroAnio, filtroMes, search]);

  const periodosGrid = useMemo(() => {
    if (!periodoHero) return [];
    return periodosFiltrados.filter((p) => p.key_periodo !== periodoHero.key_periodo);
  }, [periodosFiltrados, periodoHero]);

  const hayFiltros = Boolean(search || filtroAnio || filtroMes);

  return (
    <div className="space-y-8 animate-fade-in">
      {/* ── Cabecera con Selectores de Año y Mes alineados a la derecha ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-zinc-900 dark:text-white">Finanzas</h1>
          <p className="text-sm text-zinc-500 mt-0.5">Cortes mensuales y seguimiento de pagos</p>
        </div>

        {/* Selectores Año y Mes estilizados (CustomSelect) */}
        <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
          <div className="w-32 sm:w-36">
            <CustomSelect
              value={filtroAnio}
              onChange={setFiltroAnio}
              options={aniosDisponibles}
              placeholder="Año"
              className="bg-zinc-100 dark:bg-zinc-800/50 border-0 rounded-xl font-medium focus:ring-2 focus:ring-[var(--accent-color)] text-xs sm:text-sm"
            />
          </div>

          <div className="w-36 sm:w-44">
            <CustomSelect
              value={filtroMes}
              onChange={setFiltroMes}
              options={MESES}
              placeholder="Mes"
              className="bg-zinc-100 dark:bg-zinc-800/50 border-0 rounded-xl font-medium focus:ring-2 focus:ring-[var(--accent-color)] text-xs sm:text-sm"
            />
          </div>

          {hayFiltros && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => { setSearch(''); setFiltroAnio(''); setFiltroMes(''); }}
              className="text-xs"
            >
              Limpiar
            </Button>
          )}
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

      {/* ── Barra de Búsqueda ── */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="relative">
          <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por cifra o texto…"
            className="h-10 pl-9 pr-4 w-64 text-sm rounded-xl bg-zinc-100 dark:bg-zinc-800/50 border-0 text-zinc-900 dark:text-white placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-[var(--accent-color)] transition-all"
          />
        </div>

        {hayFiltros && (
          <span className="text-xs text-zinc-500">
            {periodosFiltrados.length} de {periodos.length} periodos
          </span>
        )}
      </div>

      {/* ── Contenido Principal (Hero + Grid) ── */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 gap-3">
          <div className="w-8 h-8 border-4 border-[var(--accent-color)] border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-zinc-500">Cargando registros financieros...</p>
        </div>
      ) : periodosFiltrados.length === 0 ? (
        <div className="text-center py-20 bg-zinc-50 dark:bg-zinc-800/20 rounded-2xl p-6 text-zinc-500">
          {hayFiltros ? (
            <p className="text-sm">Sin periodos que coincidan con los filtros seleccionados.</p>
          ) : (
            <>
              <p className="font-medium text-zinc-700 dark:text-zinc-300">No hay periodos con clases registradas aún.</p>
              <p className="text-xs mt-1">Los periodos se generan automáticamente al programar o completar clases.</p>
            </>
          )}
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
                  Otros Cortes y Periodos ({periodosGrid.length})
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
