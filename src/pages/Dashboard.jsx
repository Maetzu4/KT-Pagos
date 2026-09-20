import { useState } from 'react';
import { TrendingUp, DollarSign, Users, Plus, BookOpen } from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer, CartesianGrid,
} from 'recharts';
import { MetricCard } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Table } from '../components/ui/Table';
import { Badge } from '../components/ui/Badge';
import { Modal } from '../components/ui/Modal';
import { ClaseForm } from '../components/forms/ClaseForm';
import { useGrupos } from '../hooks/useGrupos';
import { usePeriodos } from '../hooks/usePeriodos';
import { useClases } from '../hooks/useClases';
import { formatCurrency } from '../lib/utils';
import { formatDate } from '../lib/dateUtils';

// Custom Tooltip para Recharts — respeta el tema oscuro
function CustomTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div
      className="rounded-xl px-4 py-3 shadow-2xl border text-sm"
      style={{
        backgroundColor: '#18181b',
        borderColor: 'var(--accent-color)',
        color: '#fff',
      }}
    >
      <p className="text-xs text-zinc-400 mb-2 font-medium">{label}</p>
      {payload.map((p) => (
        <p key={p.name} className="font-medium" style={{ color: p.color }}>
          {p.name}: {formatCurrency(p.value)}
        </p>
      ))}
    </div>
  );
}

export default function Dashboard() {
  const { gruposActivos, grupos, loading: loadingGrupos } = useGrupos();
  const { periodos, periodoActual, periodoAnterior, getOrCreatePeriodo } = usePeriodos();
  const { createClase } = useClases();

  // Hook adicional de solo lectura para las clases recientes del periodo actual
  const { clases: clasesPeriodoActual, loading: loadingClasesRecientes } = useClases(
    periodoActual ? { periodo_id: periodoActual.id } : {}
  );

  const [modalGrupo, setModalGrupo] = useState(null);

  // ── Métricas ─────────────────────────────────────────────────────
  const estimadoActual  = periodoActual?.total_a_cobrar ?? periodoActual?.estimado_real ?? 0;
  const pagadoAnterior  = periodoAnterior?.pagado_real ?? 0;

  // ── Datos para la gráfica ─────────────────────────────────────────
  const chartData = [...periodos]
    .sort((a, b) => a.fecha_inicio?.localeCompare(b.fecha_inicio))
    .slice(-8)
    .map((p) => ({
      name: p.nombre_periodo?.split(' ')[0] ?? p.nombre_periodo,
      Estimado: p.total_a_cobrar ?? p.estimado_real,
      Pagado: p.pagado_real ?? 0,
    }));

  // ── Últimas 10 clases del periodo actual (no totalmente pagado) ─────
  const clasesRecientes = [...(clasesPeriodoActual || [])]
    .sort((a, b) => b.fecha_clase?.localeCompare(a.fecha_clase))
    .slice(0, 10);

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
        ? <span className="text-amber-400 text-sm" title="En reclamo">⚠️</span>
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
        <h1 className="text-2xl font-semibold text-white">Dashboard</h1>
        <p className="text-sm text-zinc-500 mt-1">Resumen financiero de tutorías</p>
      </div>

      {/* ── Métricas ── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <MetricCard
          label="Total a Cobrar (Actual)"
          value={formatCurrency(estimadoActual)}
          sub={periodoActual?.nombre_periodo ?? 'Sin periodo activo'}
          icon={TrendingUp}
        />
        <MetricCard
          label="Pagado Anterior"
          value={formatCurrency(pagadoAnterior)}
          sub={periodoAnterior?.nombre_periodo ?? 'Sin periodo anterior'}
          icon={DollarSign}
        />
        <MetricCard
          label="Grupos Activos"
          value={gruposActivos.length}
          sub={`de ${grupos.length} grupos totales`}
          icon={Users}
        />
      </div>

      {/* ── Tabla de grupos activos ── */}
      <section>
        <h2 className="text-sm font-semibold text-zinc-400 uppercase tracking-wider mb-3">
          Grupos Activos
        </h2>
        <Table
          columns={cols}
          data={gruposActivos}
          loading={loadingGrupos}
          emptyMessage="No hay grupos activos"
        />
      </section>

      {/* ── Gráfica Estimado vs Pagado ── */}
      <section>
        <h2 className="text-sm font-semibold text-zinc-400 uppercase tracking-wider mb-3">
          Estimado vs Pagado — Últimos 8 periodos
        </h2>
        <div className="rounded-2xl border border-white/8 bg-white/3 p-4">
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={chartData} barGap={4}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
              <XAxis dataKey="name" tick={{ fill: '#71717a', fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis
                tick={{ fill: '#71717a', fontSize: 11 }}
                axisLine={false}
                tickLine={false}
                tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`}
              />
              <Tooltip
                content={<CustomTooltip />}
                cursor={{ fill: 'rgba(255,255,255,0.04)', radius: 6 }}
              />
              <Legend wrapperStyle={{ fontSize: '12px', color: '#a1a1aa' }} />
              <Bar dataKey="Estimado" fill="var(--accent-color)" radius={[4, 4, 0, 0]} maxBarSize={40} />
              <Bar dataKey="Pagado" fill="var(--accent-dark)" opacity={0.75} radius={[4, 4, 0, 0]} maxBarSize={40} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </section>

      {/* ── Clases Recientes del Periodo en Curso ── */}
      {periodoActual && (
        <section>
          <div className="flex items-center gap-2 mb-3">
            <BookOpen size={15} className="text-zinc-400" />
            <h2 className="text-sm font-semibold text-zinc-400 uppercase tracking-wider">
              Clases Recientes — {periodoActual.nombre_periodo}
            </h2>
            {clasesRecientes.length > 0 && (
              <span className="ml-auto text-xs text-zinc-600 font-mono">
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
    </div>
  );
}
