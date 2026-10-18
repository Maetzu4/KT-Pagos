import { useState, useMemo, useCallback } from 'react';
import { TrendingUp, DollarSign, Users, CheckCircle2, Calendar, Plus } from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer, CartesianGrid,
} from 'recharts';
import { MetricCard } from '../components/ui/Card';
import { Table } from '../components/ui/Table';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { Modal } from '../components/ui/Modal';
import { GrupoDetailModal } from '../components/ui/GrupoDetailModal';
import { PeriodoModal } from '../components/ui/PeriodoModal';
import { ClaseExtraModal } from '../components/modals/ClaseExtraModal';
import { ReprogramarClaseModal } from '../components/modals/ReprogramarClaseModal';
import { useGrupos } from '../hooks/useGrupos';
import { usePeriodos } from '../hooks/usePeriodos';
import { useClases } from '../hooks/useClases';
import { useCountUp } from '../hooks/useCountUp';
import { formatCurrency } from '../lib/utils';

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Precio efectivo de una clase.
 * Si precio_cobrado está seteado lo usa; si no, cae al precio_regular de la tarifa del grupo.
 */
const getPrecio = (c) => {
  if (c?.estado_clase === 'Cancelada') return 0;
  return Number(c?.precio_cobrado ?? c?.grupos?.tarifas?.precio_regular ?? 0);
};

/** Formatea 'YYYY-MM-DD' → 'DD/MM/YYYY' */
function fmtFecha(str) {
  if (!str) return '—';
  const clean = str.split('T')[0].split(' ')[0];
  const [y, m, d] = clean.split('-');
  return `${d}/${m}/${y}`;
}

// ─── Custom Tooltip (gráfica) ─────────────────────────────────────────────────
function CustomTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-xl px-4 py-3 shadow-xl border border-zinc-200 dark:border-zinc-800
                    bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white text-sm">
      <p className="text-xs text-zinc-500 dark:text-zinc-400 mb-2 font-medium">{label}</p>
      {payload.map((p) => (
        <p key={p.name} className="font-medium" style={{ color: p.color }}>
          {p.name}: {formatCurrency(p.value)}
        </p>
      ))}
    </div>
  );
}

// ─── Dashboard ────────────────────────────────────────────────────────────────
export default function Dashboard() {
  const { gruposActivos, grupos, loading: loadingGrupos } = useGrupos();
  const {
    periodos, periodoActual, periodoAnterior,
    updatePeriodo,
    refetch: fetchPeriodos,
    loading: loadingPeriodos,
  } = usePeriodos();

  // Clases del periodo actual — incluye estado_clase y precio/tarifa
  const {
    clases: clasesMes,
    loading: loadingClases,
    refetch: refetchClases,
    updateClase,
  } = useClases(
    periodoActual
      ? { fecha_inicio: periodoActual.fecha_inicio, fecha_fin: periodoActual.fecha_fin }
      : {}
  );

  const clasesFiltradas = useMemo(() => {
    if (!periodoActual?.key_periodo || !clasesMes) return [];
    return clasesMes.filter((c) => c.fecha_clase?.startsWith(periodoActual.key_periodo));
  }, [clasesMes, periodoActual]);

  const [detalle,             setDetalle]             = useState(null);
  const [selectedPeriodo,     setSelectedPeriodo]     = useState(null);
  const [chartPeriodos,       setChartPeriodos]       = useState(() => Number(localStorage.getItem('chartPeriodos')) || 8);
  const [isExtraModalOpen,    setIsExtraModalOpen]    = useState(false);
  const [claseAReprogramar,   setClaseAReprogramar]   = useState(null);

  const handleChartChange = (n) => {
    setChartPeriodos(n);
    localStorage.setItem('chartPeriodos', n);
  };

  const hoyStr = new Date().toISOString().split('T')[0];
  const pendientes = useMemo(() => {
    return clasesFiltradas
      .filter((c) => c.fecha_clase <= hoyStr && (c.estado_clase === 'Programada' || c.estado_clase === 'Aplazada'))
      .slice()
      .sort((a, b) => (a.fecha_clase ?? '').localeCompare(b.fecha_clase ?? ''));
  }, [clasesFiltradas, hoyStr]);

  const [updatingClase, setUpdatingClase] = useState(null);

  const handleClassUpdate = useCallback(async () => {
    await Promise.all([
      refetchClases?.(),
      fetchPeriodos?.(),
    ]);
  }, [refetchClases, fetchPeriodos]);

  const handleCambiarEstado = async (claseId, nuevoEstado) => {
    setUpdatingClase(`${claseId}-${nuevoEstado}`);
    try {
      await updateClase(claseId, { estado_clase: nuevoEstado });
      await handleClassUpdate();
    } catch (err) {
      console.error('Error al actualizar estado de clase:', err);
    } finally {
      setUpdatingClase(null);
    }
  };

  const handleAplazarClase = (c) => {
    setClaseAReprogramar(c);
  };

  const handleConfirmarReprogramacion = async (nuevaFecha) => {
    if (!claseAReprogramar) return;
    const c = claseAReprogramar;
    setClaseAReprogramar(null);
    setUpdatingClase(`${c.id}-Aplazada`);
    try {
      await updateClase(c.id, { fecha_clase: nuevaFecha, estado_clase: 'Aplazada' });
      await handleClassUpdate();
    } catch (err) {
      console.error('Error al aplazar clase:', err);
    } finally {
      setUpdatingClase(null);
    }
  };

  // ── Métricas V2 ─────────────────────────────────────────────────────────────
  const { proyectado, ganado, totalMes, completadas } = useMemo(() => {
    const all            = clasesFiltradas;
    const totalMes       = all.length;
    const completadasArr = all.filter((c) => c.estado_clase === 'Completada');

    const proyectado = all.reduce((s, c) => Number(s) + Number(getPrecio(c)), 0);
    const ganado     = completadasArr.reduce((s, c) => Number(s) + Number(getPrecio(c)), 0);

    return { proyectado, ganado, totalMes, completadas: completadasArr.length };
  }, [clasesFiltradas]);

  // Números animados UX
  const animProyectado    = useCountUp(proyectado);
  const animGanado        = useCountUp(ganado);
  const animMesAnterior   = useCountUp(periodoAnterior?.pagado_real ?? 0);
  const animCompletadas   = useCountUp(completadas);
  const animGruposActivos = useCountUp(gruposActivos.length);

  // ── Progreso por grupo (clases completadas en el periodo actual) ───────────
  const progresoByGrupo = useMemo(() => {
    const map = {};
    clasesFiltradas.forEach((c) => {
      if (!map[c.grupo_id]) map[c.grupo_id] = { total: 0, completadas: 0 };
      map[c.grupo_id].total++;
      if (c.estado_clase === 'Completada') map[c.grupo_id].completadas++;
    });
    return map;
  }, [clasesFiltradas]);

  // ── Datos para la gráfica ────────────────────────────────────────────────
  const chartData = useMemo(() =>
    [...periodos]
      .sort((a, b) => a.fecha_inicio?.localeCompare(b.fecha_inicio))
      .slice(-chartPeriodos)
      .map((p) => ({
        name:      p.nombre_periodo?.split(' ')[0] ?? p.nombre_periodo,
        Estimado:  Number(p.total_a_cobrar ?? p.estimado_real ?? 0),
        Cobrado:   Number(p.pagado_real ?? 0),
      })),
    [periodos, chartPeriodos]
  );

  // ── Deuda arrastrada (lógica V1 conservada) ──────────────────────────────
  const deudaAnterior = Number(periodoActual?.deuda_anterior ?? 0);
  const estadoDeuda   = periodoActual?.estado_deuda_anterior ?? 'al_dia';

  // ── Columnas tabla grupos activos (V2) ───────────────────────────────────
  const colsGrupos = [
    {
      key: 'nombre_grupo',
      header: 'Grupo',
      render: (r) => (
        <div className="flex items-center gap-2">
          <span className="font-medium text-zinc-900 dark:text-white">{r.nombre_grupo ?? '—'}</span>
          {r.id_externo?.includes('PRM') && (
            <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold border border-[var(--accent-color)] text-[var(--accent-color)] bg-[var(--accent-color)]/10">
              PRM
            </span>
          )}
        </div>
      ),
    },
    {
      key: 'curso_nombre',
      header: 'Curso',
      render: (r) => (
        <span className="text-zinc-600 dark:text-zinc-400 text-sm truncate max-w-[160px] block">
          {r.curso_nombre ?? <span className="italic text-zinc-400">—</span>}
        </span>
      ),
    },
    {
      key: 'horario',
      header: 'Horario',
      render: (r) => (
        <span className="text-zinc-500 text-sm">
          {r.horario ?? <span className="italic text-zinc-400">—</span>}
        </span>
      ),
    },
    {
      key: 'progreso',
      header: 'Progreso (mes)',
      render: (r) => {
        const p = progresoByGrupo[r.id];
        if (!p) return <span className="text-zinc-400 italic text-xs">Sin clases</span>;
        const pct = p.total > 0 ? Math.round((p.completadas / p.total) * 100) : 0;
        return (
          <div className="flex items-center gap-2 min-w-[100px]">
            <div className="flex-1 h-1.5 rounded-full bg-zinc-200 dark:bg-zinc-700 overflow-hidden">
              <div
                className="h-full rounded-full bg-[var(--accent-color)] transition-all duration-500"
                style={{ width: `${pct}%` }}
              />
            </div>
            <span className="text-xs text-zinc-500 tabular-nums whitespace-nowrap">
              {p.completadas}/{p.total}
            </span>
          </div>
        );
      },
    },
  ];

  return (
    <div className="space-y-8 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-zinc-900 dark:text-white">Dashboard</h1>
          <p className="text-sm text-zinc-500 mt-1">
            {periodoActual?.nombre_periodo
              ? `Resumen de ${periodoActual.nombre_periodo}`
              : 'Resumen financiero de tutorías'}
          </p>
        </div>
        <Button
          onClick={() => setIsExtraModalOpen(true)}
          id="btn-add-clase-extra-dashboard"
          className="shadow-sm"
        >
          <Plus size={16} /> Añadir Extra
        </Button>
      </div>

      {/* ── Hero Banner: Proyectado del Mes (Bloque sólido) ── */}
      <div className="rounded-2xl bg-[var(--accent-color)] p-6 sm:p-8 text-white shadow-lg shadow-[var(--accent-color)]/20">
        <div className="flex items-center gap-2 mb-2">
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-white/20 text-white backdrop-blur-sm">
            <TrendingUp size={13} /> Proyectado del Mes
          </span>
          {periodoActual?.nombre_periodo && (
            <span className="text-xs text-white/80 font-medium">
              · {periodoActual.nombre_periodo}
            </span>
          )}
        </div>
        <div className="text-3xl sm:text-5xl font-bold tracking-tight text-white font-mono mt-1">
          {formatCurrency(animProyectado)}
        </div>
      </div>

      {/* ── KPIs (Grid de 4 tarjetas) ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Ganado este Mes */}
        <MetricCard
          label="Ganado este Mes"
          value={formatCurrency(animGanado)}
          sub="Solo clases completadas"
          icon={DollarSign}
          loading={loadingClases}
        />

        {/* Mes Anterior */}
        <MetricCard
          label="Mes Anterior"
          value={formatCurrency(animMesAnterior)}
          sub={
            periodoAnterior?.error_pago < 0 ? (
              <span className="flex items-center gap-1.5">
                <span className="truncate">Falta {formatCurrency(Math.abs(periodoAnterior.error_pago))}</span>
                <span className="shrink-0 inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold bg-[var(--accent-color)]/10 text-[var(--accent-color)]">
                  {new Date().getDate() > 15 ? 'Atrasado' : 'Pendiente'}
                </span>
              </span>
            ) : (
              periodoAnterior?.nombre_periodo
                ? `${periodoAnterior.nombre_periodo} · Al día`
                : 'Sin periodo anterior'
            )
          }
          icon={DollarSign}
          onClick={() => periodoAnterior && setSelectedPeriodo(periodoAnterior)}
          loading={loadingPeriodos}
        />

        {/* Clases impartidas */}
        <MetricCard
          label="Clases Impartidas"
          value={`${Math.round(animCompletadas)} de ${totalMes}`}
          sub={
            totalMes > 0
              ? `${Math.round((completadas / totalMes) * 100)}% completado este mes`
              : 'Sin clases este mes'
          }
          icon={CheckCircle2}
          loading={loadingClases}
        />

        {/* Grupos activos */}
        <MetricCard
          label="Grupos Activos"
          value={Math.round(animGruposActivos)}
          sub={`de ${grupos.length} grupos totales`}
          icon={Users}
          loading={loadingGrupos}
        />
      </div>

      {/* ── Clases Pendientes ── */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-semibold text-zinc-600 dark:text-zinc-400 uppercase tracking-wider">
              Clases Pendientes
            </h2>
            {pendientes.length > 0 && (
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-[var(--accent-color)]/10 text-[var(--accent-color)]">
                {pendientes.length}
              </span>
            )}
          </div>
        </div>

        {pendientes.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-zinc-200 dark:border-zinc-800 p-6 text-center">
            <p className="text-sm text-zinc-400 dark:text-zinc-500">
              No tienes clases programadas pendientes
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {pendientes.map((c) => {
              const nombreGrupo = c.grupos?.nombre_grupo ?? grupos.find((g) => g.id === c.grupo_id)?.nombre_grupo ?? 'Grupo';
              const tema = c.tema_clase ?? c.nombre_clase ?? 'Clase programada';
              const esAtrasada = c.fecha_clase < hoyStr;

              return (
                <div
                  key={c.id}
                  className="p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-sm hover:border-[var(--accent-color)]/40 transition-colors flex flex-col justify-between gap-3"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                      <span className="text-xs tabular-nums text-zinc-500 dark:text-zinc-400 font-medium">
                        {fmtFecha(c.fecha_clase)}
                      </span>
                      {c.estado_clase === 'Aplazada' && (
                        <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-[var(--accent-color)]/10 text-[var(--accent-color)]">
                          APLAZADA
                        </span>
                      )}
                      {esAtrasada && c.estado_clase !== 'Aplazada' && (
                        <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-[var(--accent-color)]/10 text-[var(--accent-color)]">
                          Atrasada
                        </span>
                      )}
                      {c.es_adicional && (
                        <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-[var(--accent-color)]/10 text-[var(--accent-color)] ring-1 ring-inset ring-[var(--accent-color)]/20">
                          EXTRA
                        </span>
                      )}
                    </div>
                    <p className="text-sm font-semibold text-zinc-900 dark:text-white truncate">
                      {nombreGrupo}
                    </p>
                    <p className="text-xs text-zinc-500 dark:text-zinc-400 truncate mt-0.5">
                      {tema}
                    </p>
                  </div>

                  <div className="flex items-center gap-1.5 pt-2 border-t border-zinc-100 dark:border-zinc-800/60">
                    <button
                      type="button"
                      disabled={!!updatingClase}
                      onClick={() => handleCambiarEstado(c.id, 'Completada')}
                      className="flex-1 py-1.5 px-2 rounded-lg text-xs font-semibold bg-[var(--accent-color)] text-white shadow-sm hover:opacity-90 active:scale-[0.98] transition-all disabled:opacity-50 text-center"
                    >
                      {updatingClase === `${c.id}-Completada` ? '...' : 'Completada'}
                    </button>
                    <button
                      type="button"
                      disabled={!!updatingClase}
                      onClick={() => handleAplazarClase(c)}
                      className="flex-1 py-1.5 px-2 rounded-lg text-xs font-medium border border-[var(--accent-color)] text-[var(--accent-color)] bg-transparent hover:bg-[var(--accent-color)]/10 active:scale-[0.98] transition-all disabled:opacity-50 text-center"
                    >
                      {updatingClase === `${c.id}-Aplazada` ? '...' : 'Aplazada'}
                    </button>
                    <button
                      type="button"
                      disabled={!!updatingClase}
                      onClick={() => handleCambiarEstado(c.id, 'Cancelada')}
                      className="flex-1 py-1.5 px-2 rounded-lg text-xs font-medium text-[var(--accent-color)] hover:bg-[var(--accent-color)]/10 border border-transparent hover:border-[var(--accent-color)]/20 active:scale-[0.98] transition-all disabled:opacity-50 text-center truncate"
                    >
                      {updatingClase === `${c.id}-Cancelada` ? '...' : 'Cancelada/Sustituida'}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* ── Gráfica histórica ── */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-zinc-600 dark:text-zinc-400 uppercase tracking-wider">
            Gráfica Histórica
          </h2>
          <div className="flex items-center gap-1">
            {[4, 6, 8, 12].map((n) => (
              <button
                key={n}
                onClick={() => handleChartChange(n)}
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
              <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(128,128,128,0.06)', radius: 6 }} />
              <Legend wrapperStyle={{ fontSize: '12px', color: '#a1a1aa' }} />
              <Bar dataKey="Estimado" fill="var(--accent-color)"  radius={[4,4,0,0]} maxBarSize={40} />
              <Bar dataKey="Cobrado"  fill="var(--accent-dark)"   radius={[4,4,0,0]} maxBarSize={40} opacity={0.75} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </section>

      {/* ── Tabla de grupos activos (V2) ── */}
      <section>
        <h2 className="text-sm font-semibold text-zinc-600 dark:text-zinc-400 uppercase tracking-wider mb-3">
          Grupos Activos
        </h2>
        <Table
          columns={colsGrupos}
          data={gruposActivos}
          loading={loadingGrupos}
          emptyMessage="No hay grupos activos"
          onRowClick={(g) => setDetalle(g)}
        />
      </section>



      {/* ── Modal de detalle del grupo (clic en fila) ── */}
      <GrupoDetailModal
        grupo={detalle}
        open={!!detalle}
        onClose={() => setDetalle(null)}
        onClassUpdate={handleClassUpdate}
      />

      {/* ── Modal de período ── */}
      <PeriodoModal
        periodo={selectedPeriodo}
        open={!!selectedPeriodo}
        onClose={() => setSelectedPeriodo(null)}
        onUpdate={updatePeriodo}
      />

      {/* ── Modal Clase Extra ── */}
      <ClaseExtraModal
        isOpen={isExtraModalOpen}
        onClose={() => setIsExtraModalOpen(false)}
        onSuccess={() => handleClassUpdate()}
      />

      {/* ── Modal Reprogramar Clase ── */}
      <ReprogramarClaseModal
        isOpen={!!claseAReprogramar}
        clase={claseAReprogramar}
        onClose={() => setClaseAReprogramar(null)}
        onConfirm={handleConfirmarReprogramacion}
      />
    </div>
  );
}
