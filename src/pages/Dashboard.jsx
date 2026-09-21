import { useState } from 'react';
import { TrendingUp, DollarSign, Users, Plus, BookOpen, Calendar } from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer, CartesianGrid,
} from 'recharts';
import { MetricCard } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Table } from '../components/ui/Table';
import { Badge } from '../components/ui/Badge';
import { Modal } from '../components/ui/Modal';
import { GrupoDetailModal } from '../components/ui/GrupoDetailModal';
import { PeriodoModal } from '../components/ui/PeriodoModal';
import { ClaseForm } from '../components/forms/ClaseForm';
import { useGrupos } from '../hooks/useGrupos';
import { usePeriodos } from '../hooks/usePeriodos';
import { useClases } from '../hooks/useClases';
import { formatCurrency } from '../lib/utils';
import { formatDate, parseISO, calcularProximaClaseEsperada } from '../lib/dateUtils';

// Custom Tooltip para Recharts — adaptable al tema
function CustomTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div
      className="rounded-xl px-4 py-3 shadow-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white text-sm"
    >
      <p className="text-xs text-zinc-500 dark:text-zinc-400 mb-2 font-medium">{label}</p>
      {payload.map((p) => (
        <p key={p.name} className="font-medium" style={{ color: p.color }}>
          {p.name}: {formatCurrency(p.value)}
        </p>
      ))}
    </div>
  );
}

/** Devuelve "Hoy", "Mañana" o la fecha formateada para una fecha ISO string. */
function labelFechaRelativa(fechaISO) {
  if (!fechaISO) return '—';
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = parseISO(fechaISO);
  const diffMs = target.getTime() - today.getTime();
  const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));
  if (diffDays === 0) return 'Hoy';
  if (diffDays === 1) return 'Mañana';
  return formatDate(fechaISO);
}

function ChartPeriodoModal({ data, onClose }) {
  const { clases, loading } = useClases(data ? { periodo_id: data.id } : {});

  if (!data) return null;

  return (
    <Modal open={!!data} onClose={onClose} title={`Clases de ${data.name}`} size="md">
      <div className="max-h-[60vh] overflow-y-auto pr-1 space-y-2">
        {loading ? (
          <p className="text-zinc-500 text-sm italic">Cargando...</p>
        ) : clases.length === 0 ? (
          <p className="text-zinc-500 text-sm italic">No hay clases en este periodo.</p>
        ) : (
          clases.sort((a, b) => b.fecha_clase.localeCompare(a.fecha_clase)).map((c) => (
            <div key={c.id} className="flex justify-between items-center text-sm p-3 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800/40">
              <div>
                <p className="font-semibold text-zinc-900 dark:text-white truncate max-w-[200px]">{c.nombre_clase || 'Sin nombre'}</p>
                <p className="text-xs text-zinc-500 mt-0.5">{formatDate(c.fecha_clase)} — {c.grupos?.nombre_grupo ?? 'Sin grupo'}</p>
              </div>
              <span className="font-mono text-zinc-900 dark:text-zinc-100 font-medium">
                {formatCurrency(c.precio_cobrado)}
              </span>
            </div>
          ))
        )}
      </div>
    </Modal>
  );
}

export default function Dashboard() {
  const { gruposActivos, grupos, loading: loadingGrupos } = useGrupos();
  const { periodos, periodoActual, periodoAnterior, getOrCreatePeriodo, updatePeriodo, loading: loadingPeriodos } = usePeriodos();
  const { createClase } = useClases();

  // Hook adicional de solo lectura para las clases recientes del periodo actual
  const { clases: clasesPeriodoActual, loading: loadingClasesRecientes } = useClases(
    periodoActual ? { periodo_id: periodoActual.id } : {}
  );

  const [modalGrupo, setModalGrupo] = useState(null);
  const [detalle, setDetalle] = useState(null);
  const [chartDetalle, setChartDetalle] = useState(null);
  const [selectedPeriodo, setSelectedPeriodo] = useState(null);
  const [chartPeriodos, setChartPeriodos] = useState(8); // periodos visibles en la gráfica

  // ── Métricas ─────────────────────────────────────────────────────
  const estimadoActual  = periodoActual?.total_a_cobrar ?? periodoActual?.estimado_real ?? 0;
  const pagadoAnterior  = periodoAnterior?.pagado_real ?? 0;

  // ── Próxima clase futura GLOBAL ──────────────────────────────────────────
  let proximaClaseGlobalStr = null;
  let proximaGrupoObj = null;

  for (const grupo of gruposActivos) {
    const cG = (clasesPeriodoActual || []).filter(c => c.grupo_id === grupo.id);
    const prox = calcularProximaClaseEsperada(grupo, cG);
    if (prox) {
      if (!proximaClaseGlobalStr || prox < proximaClaseGlobalStr) {
        proximaClaseGlobalStr = prox;
        proximaGrupoObj = grupo;
      }
    }
  }

  const proximaLabel = proximaClaseGlobalStr ? labelFechaRelativa(proximaClaseGlobalStr) : 'Sin programar';

  // ── Datos para la gráfica ─────────────────────────────────────────
  const chartData = [...periodos]
    .sort((a, b) => a.fecha_inicio?.localeCompare(b.fecha_inicio))
    .slice(-chartPeriodos)
    .map((p) => ({
      name: p.nombre_periodo?.split(' ')[0] ?? p.nombre_periodo,
      Estimado: p.total_a_cobrar ?? p.estimado_real,
      Pagado: p.pagado_real ?? 0,
    }));

  // ── Todas las clases del periodo actual ─────────────────────────
  const clasesRecientes = [...(clasesPeriodoActual || [])]
    .filter(c => {
      if (!periodoActual) return false;
      return c.fecha_clase >= periodoActual.fecha_inicio && c.fecha_clase <= periodoActual.fecha_fin;
    })
    .sort((a, b) => b.fecha_clase?.localeCompare(a.fecha_clase));

  // ── Columnas de la tabla de grupos activos ────────────────────────
  const cols = [
    { key: 'nombre_grupo', header: 'Grupo' },
    {
      key: 'estado',
      header: 'Estado',
      render: (r) => <Badge variant={r.estado}>{r.estado === 'activo' ? 'Activo' : 'Finalizado'}</Badge>,
    },
    {
      key: 'tarifa',
      header: 'Tarifa',
      render: (r) => r.tarifas ? formatCurrency(r.tarifas.precio_regular) : '—',
    },
    {
      key: 'proxima',
      header: 'Próxima Clase',
      render: (r) => {
        const clasesDelGrupo = (clasesPeriodoActual || []).filter(c => c.grupo_id === r.id);
        const futura = calcularProximaClaseEsperada(r, clasesDelGrupo);
        return <span className="text-xs text-zinc-500">{futura ? labelFechaRelativa(futura) : 'Sin programar'}</span>;
      }
    },
    {
      key: 'actions',
      header: '',
      cellClassName: 'text-right',
      render: (r) => (
        <Button
          size="sm"
          variant="ghost"
          onClick={(e) => { e.stopPropagation(); setModalGrupo(r); }}
          id={`btn-add-clase-${r.id}`}
        >
          <Plus size={14} /> Añadir Clase
        </Button>
      ),
    },
  ];

  // ── Columnas de Clases Recientes ──────────────────────────────────
  const colsClases = [
    { key: 'fecha_clase', header: 'Fecha',  render: (r) => formatDate(r.fecha_clase) },
    { key: 'grupo',       header: 'Grupo',  render: (r) => r.grupos?.nombre_grupo ?? '—' },
    { key: 'nombre_clase',header: 'Clase',  render: (r) => r.nombre_clase || <span className="text-zinc-500 italic">Sin nombre</span> },
    {
      key: 'es_extra',
      header: 'Tipo',
      render: (r) => r.es_extra
        ? <Badge variant="extra">Extra</Badge>
        : <Badge variant="default">Regular</Badge>,
    },
    {
      key: 'precio_cobrado',
      header: 'Precio',
      render: (r) => <span className="font-mono text-xs">{formatCurrency(r.precio_cobrado)}</span>,
    },
    {
      key: 'en_reclamo',
      header: '',
      cellClassName: 'text-center',
      render: (r) => r.en_reclamo
        ? <span className="inline-flex text-[var(--accent-color)]" title="En reclamo">
            <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><path d="M12 9v4"/><path d="M12 17h.01"/></svg>
          </span>
        : null,
    },
  ];

  const handleAddClase = async (values) => {
    const finalGrupoId = values.grupo_id || modalGrupo?.id;
    await createClase({ ...values, grupo_id: finalGrupoId }, getOrCreatePeriodo);
    setModalGrupo(null);
  };

  return (
    <div className="space-y-8 animate-fade-in">
      <div>
        <h1 className="text-2xl font-semibold text-zinc-900 dark:text-white">Dashboard</h1>
        <p className="text-sm text-zinc-500 mt-1">Resumen financiero de tutorías</p>
      </div>

      {/* ── Métricas ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          label="Total Este Mes"
          value={formatCurrency(estimadoActual)}
          sub={periodoActual?.nombre_periodo ?? 'Sin periodo activo'}
          icon={TrendingUp}
          onClick={() => setSelectedPeriodo(periodoActual)}
          loading={loadingPeriodos}
        />
        <MetricCard
          label="Pago Mes Anterior"
          value={formatCurrency(pagadoAnterior)}
          sub={periodoAnterior?.nombre_periodo ?? 'Sin periodo anterior'}
          icon={DollarSign}
          onClick={() => setSelectedPeriodo(periodoAnterior)}
          loading={loadingPeriodos}
        />
        <MetricCard
          label="Grupos Activos"
          value={gruposActivos.length}
          sub={`de ${grupos.length} grupos totales`}
          icon={Users}
          loading={loadingGrupos}
        />
        <MetricCard
          label="Próxima Clase"
          value={proximaLabel}
          sub={proximaGrupoObj?.nombre_grupo ?? (proximaClaseGlobalStr ? '' : 'Sin clases programadas')}
          icon={Calendar}
          onClick={() => proximaGrupoObj && setDetalle(proximaGrupoObj)}
          loading={loadingGrupos || loadingClasesRecientes}
        />
      </div>

      {/* ── Tabla de grupos activos ── */}
      <section>
        <h2 className="text-sm font-semibold text-zinc-600 dark:text-zinc-400 uppercase tracking-wider mb-3">
          Grupos Activos
        </h2>
        <Table
          columns={cols}
          data={gruposActivos}
          loading={loadingGrupos}
          emptyMessage="No hay grupos activos"
          onRowClick={(g) => setDetalle(g)}
        />
      </section>

      {/* ── Gráfica Histórica ── */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-zinc-600 dark:text-zinc-400 uppercase tracking-wider">
            Gráfica Histórica
          </h2>
          {/* Selector de cantidad de periodos */}
          <div className="flex items-center gap-1">
            {[4, 6, 8, 12].map((n) => (
              <button
                key={n}
                onClick={() => setChartPeriodos(n)}
                className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all duration-150 ${
                  chartPeriodos === n
                    ? 'bg-[var(--accent-color)] text-white shadow-sm'
                    : 'text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-800'
                }`}
              >
                {n}
              </button>
            ))}
          </div>
        </div>
        <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-sm p-4">
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={chartData} barGap={4}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(128,128,128,0.15)" vertical={false} />
              <XAxis dataKey="name" tick={{ fill: '#71717a', fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis
                tick={{ fill: '#71717a', fontSize: 11 }}
                axisLine={false}
                tickLine={false}
                tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`}
              />
              <Tooltip
                content={<CustomTooltip />}
                cursor={{ fill: 'rgba(128,128,128,0.06)', radius: 6 }}
              />
              <Legend wrapperStyle={{ fontSize: '12px', color: '#a1a1aa' }} />
              <Bar dataKey="Estimado" fill="var(--accent-color)" radius={[4, 4, 0, 0]} maxBarSize={40} onClick={(data) => setChartDetalle(data.payload)} className="cursor-pointer hover:opacity-80 transition-opacity" />
              <Bar dataKey="Pagado" fill="var(--accent-dark)" opacity={0.75} radius={[4, 4, 0, 0]} maxBarSize={40} onClick={(data) => setChartDetalle(data.payload)} className="cursor-pointer hover:opacity-100 transition-opacity" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </section>

      {/* ── Clases Recientes del Periodo en Curso ── */}
      {periodoActual && (
        <section>
          <div className="flex items-center gap-2 mb-3">
            <BookOpen size={15} className="text-zinc-500 dark:text-zinc-400" />
            <h2 className="text-sm font-semibold text-zinc-600 dark:text-zinc-400 uppercase tracking-wider">
              Clases — {periodoActual.nombre_periodo}
            </h2>
            {clasesRecientes.length > 0 && (
              <span className="ml-auto text-xs text-zinc-500 font-mono">
                {clasesRecientes.length} clases · {formatCurrency(
                  clasesRecientes.reduce((s, c) => s + (c.precio_cobrado || 0), 0)
                )}
              </span>
            )}
          </div>
          <Table
            columns={colsClases}
            data={clasesRecientes}
            loading={loadingClasesRecientes}
            emptyMessage="Sin clases registradas en el periodo actual"
          />
        </section>
      )}

      {/* ── Modal Quick-Add Clase ── */}
      <Modal
        open={!!modalGrupo}
        onClose={() => setModalGrupo(null)}
        title={`Añadir Clase — ${modalGrupo?.nombre_grupo ?? ''}`}
      >
        {modalGrupo && (
          <ClaseForm
            initialGroupId={modalGrupo.id}
            initial={{ grupo_id: modalGrupo.id }}
            grupos={grupos}
            onSubmit={handleAddClase}
            onCancel={() => setModalGrupo(null)}
          />
        )}
      </Modal>

      {/* Modal de detalle (clic en fila) */}
      <GrupoDetailModal
        grupo={detalle}
        open={!!detalle}
        onClose={() => setDetalle(null)}
        readOnly={true}
      />

      <PeriodoModal
        periodo={selectedPeriodo}
        open={!!selectedPeriodo}
        onClose={() => setSelectedPeriodo(null)}
        onUpdate={updatePeriodo}
      />

      <ChartPeriodoModal 
        data={chartDetalle}
        onClose={() => setChartDetalle(null)}
      />
    </div>
  );
}
