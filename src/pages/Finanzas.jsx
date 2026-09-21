import { useState, useMemo } from 'react';
import {
  AlertTriangle, Save, TrendingDown, TrendingUp,
  CheckCircle2, RotateCcw, Search, DollarSign,
} from 'lucide-react';
import { Card, MetricCard } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Modal } from '../components/ui/Modal';
import { PeriodoModal } from '../components/ui/PeriodoModal';
import { FormField, Input, Textarea } from '../components/ui/FormField';
import { CustomSelect } from '../components/ui/CustomSelect';
import { usePeriodos } from '../hooks/usePeriodos';
import { formatCurrency } from '../lib/utils';
import { formatDate } from '../lib/dateUtils';


// ── Fila de periodo en tabla ──────────────────────────────────────────────────
function PeriodoRow({ periodo, onClick }) {
  const totalACobrar  = periodo.total_a_cobrar ?? periodo.estimado_real;
  const errorPago     = (periodo.pagado_real || 0) - totalACobrar;
  const errorPositivo = errorPago >= 0;

  return (
    <div
      onClick={onClick}
      role="button"
      className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-sm px-5 py-4
                 hover:border-[var(--accent-color)]/40 hover:bg-zinc-50 dark:hover:bg-zinc-800/60
                 cursor-pointer transition-all duration-200 group"
    >
      <div className="flex items-center justify-between gap-4">
        {/* Nombre + fechas */}
        <div className="min-w-0">
          <p className="font-semibold text-zinc-900 dark:text-white group-hover:text-[var(--accent-color)] transition-colors truncate">
            {periodo.nombre_periodo}
          </p>
          <p className="text-xs text-zinc-500 mt-0.5">
            {formatDate(periodo.fecha_inicio)} — {formatDate(periodo.fecha_fin)}
          </p>
        </div>

        {/* Mini métricas */}
        <div className="hidden sm:flex items-center gap-10 shrink-0">
          <div className="text-right">
            <p className="text-[10px] text-zinc-500 uppercase tracking-wide">Total</p>
            <p className="text-sm font-mono font-semibold text-zinc-900 dark:text-white">
              {formatCurrency(totalACobrar)}
            </p>
          </div>
          <div className="text-right">
            <p className="text-[10px] text-zinc-500 uppercase tracking-wide">Pagado</p>
            <p className="text-sm font-mono font-semibold text-zinc-900 dark:text-white">
              {formatCurrency(periodo.pagado_real)}
            </p>
          </div>
          <div className="text-right">
            <p className="text-[10px] text-zinc-500 uppercase tracking-wide">Diferencia</p>
            <p className={`text-sm font-mono font-semibold ${errorPositivo ? 'text-zinc-900 dark:text-zinc-300' : 'text-[var(--accent-color)]'}`}>
              {errorPositivo
                ? <TrendingUp size={11} className="inline mr-0.5 text-zinc-400" />
                : <TrendingDown size={11} className="inline mr-0.5" />}
              {errorPositivo ? '+' : ''}{formatCurrency(errorPago)}
            </p>
          </div>
          <div className="flex flex-col items-end text-right w-[80px]">
            <p className="text-[10px] text-zinc-500 uppercase tracking-wide">Deuda</p>
            <div className="flex items-center justify-end gap-1 text-sm font-mono font-semibold text-[var(--accent-color)] mt-0.5">
              {(periodo.deuda_reclamos > 0 || (periodo.deuda_anterior > 0 && !periodo.deuda_resuelta)) ? (
                <>
                  {periodo.deuda_reclamos > 0 ? (
                    <AlertTriangle size={11} />
                  ) : (
                    <RotateCcw size={11} />
                  )}
                  <span>{formatCurrency((periodo.deuda_reclamos || 0) + (!periodo.deuda_resuelta ? (periodo.deuda_anterior || 0) : 0))}</span>
                </>
              ) : (
                <span className="text-zinc-400 font-sans font-normal">—</span>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Vista Principal ────────────────────────────────────────────────────────────
export default function Finanzas() {
  const { periodos, loading, updatePeriodo } = usePeriodos();

  const [selectedPeriodo, setSelectedPeriodo] = useState(null);
  const [search,          setSearch]          = useState('');
  const [filtroAnio,      setFiltroAnio]      = useState('');
  const [filtroMes,       setFiltroMes]       = useState('');

  // Totales globales
  const totalEstimado = periodos.reduce((s, p) => s + (p.total_a_cobrar ?? p.estimado_real ?? 0), 0);
  const totalPagado   = periodos.reduce((s, p) => s + (p.pagado_real ?? 0), 0);
  const totalDeuda    = periodos.reduce((s, p) => s + (p.deuda_reclamos ?? 0), 0);
  const totalRollover = periodos.reduce((s, p) => s + (p.deuda_anterior ?? 0), 0);

  // ── Opciones de filtros Año y Mes ─────────────────────────────────
  const aniosDisponibles = useMemo(() => {
    const set = new Set(periodos.map((p) => p.fecha_inicio?.slice(0, 4)).filter(Boolean));
    return [
      { value: '', label: 'Todos los años' },
      ...[...set].sort((a, b) => b.localeCompare(a)).map((a) => ({ value: a, label: a })),
    ];
  }, [periodos]);

  const MESES = [
    { value: '', label: 'Todos los meses' },
    { value: '01', label: 'Enero'  }, { value: '02', label: 'Febrero' },
    { value: '03', label: 'Marzo'  }, { value: '04', label: 'Abril'   },
    { value: '05', label: 'Mayo'   }, { value: '06', label: 'Junio'   },
    { value: '07', label: 'Julio'  }, { value: '08', label: 'Agosto'  },
    { value: '09', label: 'Septiembre' }, { value: '10', label: 'Octubre'  },
    { value: '11', label: 'Noviembre'  }, { value: '12', label: 'Diciembre' },
  ];

  // ── Filtrado combinado ────────────────────────────────────────────
  const periodosFiltrados = useMemo(() => {
    const q = search.trim().toLowerCase();
    return periodos.filter((p) => {
      // Filtro por año
      if (filtroAnio && !p.fecha_inicio?.startsWith(filtroAnio)) return false;
      // Filtro por mes
      if (filtroMes && p.fecha_inicio?.slice(5, 7) !== filtroMes) return false;
      // Filtro por texto / número
      if (q) {
        const totalACobrar = String(p.total_a_cobrar ?? p.estimado_real ?? '');
        const pagado       = String(p.pagado_real ?? '');
        const deuda        = String(p.deuda_reclamos ?? '');
        const notas        = (p.notas_reclamo ?? '').toLowerCase();
        const nombre       = (p.nombre_periodo ?? '').toLowerCase();
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

  const hayFiltros = search || filtroAnio || filtroMes;

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-semibold text-zinc-900 dark:text-white">Finanzas</h1>
        <p className="text-sm text-zinc-500 mt-1">Cortes mensuales y seguimiento de pagos</p>
      </div>

      {/* ── Totales globales — MetricCards uniformes ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <MetricCard
          label="Total a Cobrar"
          value={formatCurrency(totalEstimado)}
          icon={TrendingUp}
        />
        <MetricCard
          label="Total Pagado"
          value={formatCurrency(totalPagado)}
          icon={DollarSign}
        />
        <MetricCard
          label="Deuda Reclamos"
          value={formatCurrency(totalDeuda)}
          icon={AlertTriangle}
        />
        <MetricCard
          label="Deuda Arrastrada"
          value={formatCurrency(totalRollover)}
          icon={RotateCcw}
        />
      </div>

      {/* ── Barra de búsqueda y filtros ── */}
      <div className="flex flex-wrap gap-3 items-center">
        {/* Búsqueda */}
        <div className="relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por cifra o texto…"
            className="h-9 pl-9 pr-3 w-56 text-sm rounded-lg bg-white dark:bg-white/5 border border-zinc-300 dark:border-white/10 text-zinc-900 dark:text-white placeholder:text-zinc-400 dark:placeholder:text-zinc-500 focus:outline-none focus:border-[var(--accent-color)] focus:ring-1 focus:ring-[var(--accent-color)]/30 transition-all duration-200"
          />
        </div>

        {/* Filtro Año */}
        <div className="min-w-[140px]">
          <CustomSelect
            value={filtroAnio}
            onChange={setFiltroAnio}
            options={aniosDisponibles}
            placeholder="Año"
          />
        </div>

        {/* Filtro Mes */}
        <div className="w-44">
          <CustomSelect
            value={filtroMes}
            onChange={setFiltroMes}
            options={MESES}
            placeholder="Mes"
          />
        </div>

        {hayFiltros && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => { setSearch(''); setFiltroAnio(''); setFiltroMes(''); }}
          >
            Limpiar filtros
          </Button>
        )}

        {hayFiltros && (
          <span className="ml-auto text-xs text-zinc-500">
            {periodosFiltrados.length} de {periodos.length} periodos
          </span>
        )}
      </div>

      {/* ── Lista de periodos ── */}
      {loading ? (
        <div className="flex justify-center py-16">
          <div className="w-6 h-6 border-2 border-[var(--accent-color)] border-t-transparent rounded-full animate-spin" />
        </div>
      ) : periodosFiltrados.length === 0 ? (
        <div className="text-center py-16 text-zinc-500">
          {hayFiltros
            ? <p>Sin periodos que coincidan con los filtros.</p>
            : <>
                <p>No hay periodos registrados aún.</p>
                <p className="text-sm mt-1">Se crean automáticamente al registrar clases.</p>
              </>
          }
        </div>
      ) : (
        <div className="space-y-2">
          {periodosFiltrados.map((p) => (
            <PeriodoRow
              key={p.id}
              periodo={p}
              onClick={() => setSelectedPeriodo(p)}
            />
          ))}
        </div>
      )}

      {/* ── Modal de detalle ── */}
      <PeriodoModal
        periodo={selectedPeriodo}
        open={!!selectedPeriodo}
        onClose={() => setSelectedPeriodo(null)}
        onUpdate={async (id, values) => {
          await updatePeriodo(id, values);
          setSelectedPeriodo(null);
        }}
      />
    </div>
  );
}
