import { useState, useMemo } from 'react';
import { Check, X } from 'lucide-react';
import { Modal } from '../ui/Modal';
import { cn } from '../../lib/utils';

/** Formatea 'YYYY-MM-DD' → 'DD/MM/YYYY' */
function fmtFecha(str) {
  if (!str) return '—';
  const clean = str.split('T')[0].split(' ')[0];
  const [y, m, d] = clean.split('-');
  return `${d}/${m}/${y}`;
}

/** Estandarización absoluta de badges con color de acento */
const getBadgeStyles = (estado) => {
  const e = (estado || '').trim().toLowerCase();
  if (e === 'completada') {
    return 'bg-[var(--accent-color)] text-white border-transparent';
  }
  if (e === 'aplazada') {
    return 'border border-[var(--accent-color)] text-[var(--accent-color)] bg-transparent';
  }
  if (e === 'programada') {
    return 'bg-[var(--accent-color)]/10 text-[var(--accent-color)] border-transparent';
  }
  if (e === 'cancelada') {
    return 'text-zinc-500 bg-zinc-100 dark:bg-zinc-800/50 border-transparent';
  }
  return 'bg-[var(--accent-color)]/10 text-[var(--accent-color)] border-transparent';
};

export function ResumenClasesModal({ isOpen, open, onClose, clases = [], updateClase, onAplazar }) {
  const isModalOpen = isOpen ?? open ?? false;
  const [filtroEstado, setFiltroEstado] = useState('todos');
  const [updatingId, setUpdatingId] = useState(null);

  // Ordenar clases por fecha descendente
  const clasesOrdenadas = useMemo(() => {
    return [...(clases || [])].sort((a, b) => (b.fecha_clase ?? '').localeCompare(a.fecha_clase ?? ''));
  }, [clases]);

  // Filtro: 'Aplazada' evalúa c.fue_aplazada === true
  const filtradas = useMemo(() => {
    if (filtroEstado === 'todos') return clasesOrdenadas;
    if (filtroEstado === 'Aplazada') {
      return clasesOrdenadas.filter((c) => Boolean(c.fue_aplazada));
    }
    return clasesOrdenadas.filter(
      (c) => (c.estado_clase || '').trim().toLowerCase() === filtroEstado.toLowerCase()
    );
  }, [clasesOrdenadas, filtroEstado]);

  const stats = useMemo(() => {
    const total = clasesOrdenadas.length;
    const completadas = clasesOrdenadas.filter(
      (c) => (c.estado_clase || '').trim().toLowerCase() === 'completada'
    ).length;
    const programadas = clasesOrdenadas.filter(
      (c) => (c.estado_clase || '').trim().toLowerCase() === 'programada'
    ).length;
    const aplazadas = clasesOrdenadas.filter(
      (c) => Boolean(c.fue_aplazada)
    ).length;
    const canceladas = clasesOrdenadas.filter(
      (c) => (c.estado_clase || '').trim().toLowerCase() === 'cancelada'
    ).length;
    const pendientes = programadas + aplazadas;
    return { total, completadas, programadas, aplazadas, canceladas, pendientes };
  }, [clasesOrdenadas]);

  const handleEstadoChange = async (claseId, nuevoEstado, extraValues = {}) => {
    if (!updateClase || updatingId) return;
    setUpdatingId(`${claseId}-${nuevoEstado}`);
    try {
      await updateClase(claseId, { estado_clase: nuevoEstado, ...extraValues });
    } catch (err) {
      console.error('Error al actualizar estado en ResumenClasesModal:', err);
    } finally {
      setUpdatingId(null);
    }
  };

  return (
    <Modal open={isModalOpen} onClose={onClose} title="Resumen de Clases del Mes" size="xl">
      <div className="space-y-4">
        {/* Métricas rápidas y filtros en bloque sobrio sin bordes */}
        <div className="flex flex-wrap items-center justify-between gap-3 p-3 rounded-xl bg-zinc-50 dark:bg-zinc-800/40">
          <div className="flex items-center gap-3 text-xs flex-wrap">
            <span className="font-semibold text-zinc-900 dark:text-white">
              Total: <span className="font-mono text-sm">{stats.total}</span>
            </span>
            <span className="text-[var(--accent-color)] font-medium">
              {stats.completadas} completadas
            </span>
            <span className="text-[var(--accent-color)] font-medium">
              {stats.pendientes} pendientes
            </span>
            {stats.aplazadas > 0 && (
              <span className="text-[var(--accent-color)]/80 text-[11px] font-medium">
                ({stats.aplazadas} aplazadas)
              </span>
            )}
          </div>

          {/* Filtros por pestaña/botón */}
          <div className="flex items-center gap-1 overflow-x-auto text-xs">
            {['todos', 'Completada', 'Programada', 'Aplazada', 'Cancelada'].map((est) => {
              const count = est === 'todos'
                ? stats.total
                : est === 'Completada'
                  ? stats.completadas
                  : est === 'Programada'
                    ? stats.programadas
                    : est === 'Aplazada'
                      ? stats.aplazadas
                      : stats.canceladas;

              return (
                <button
                  key={est}
                  type="button"
                  onClick={() => setFiltroEstado(est)}
                  className={cn(
                    'px-2.5 py-1 rounded-lg font-medium transition-colors cursor-pointer whitespace-nowrap',
                    filtroEstado.toLowerCase() === est.toLowerCase()
                      ? 'bg-[var(--accent-color)] text-white shadow-sm'
                      : 'text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800'
                  )}
                >
                  {est === 'todos' ? 'Todas' : est} ({count})
                </button>
              );
            })}
          </div>
        </div>

        {/* Tabla compacta de clases */}
        {filtradas.length === 0 ? (
          <div className="py-12 text-center text-sm text-zinc-400 dark:text-zinc-500 rounded-xl bg-zinc-50 dark:bg-zinc-800/30">
            No se encontraron clases con el filtro seleccionado
          </div>
        ) : (
          <div className="rounded-xl border border-zinc-200/60 dark:border-zinc-800/50 overflow-hidden bg-white dark:bg-zinc-900 shadow-sm">
            <div className="overflow-x-auto max-h-[55vh]">
              <table className="w-full text-left text-xs">
                <thead className="bg-zinc-50 dark:bg-zinc-800/60 sticky top-0 border-b border-zinc-200/60 dark:border-zinc-800/50 text-zinc-500 font-semibold z-10">
                  <tr>
                    <th className="py-2.5 px-3">Fecha</th>
                    <th className="py-2.5 px-3">Grupo</th>
                    <th className="py-2.5 px-3">Tema</th>
                    <th className="py-2.5 px-3">Estado</th>
                    <th className="py-2.5 px-3 text-right">Acción</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-200/50 dark:divide-zinc-800/50">
                  {filtradas.map((c) => {
                    const nombreGrupo = c.grupos?.nombre_grupo ?? 'Grupo';
                    const tema = c.tema_clase ?? c.nombre_clase ?? 'Sin tema especificado';
                    const isUpdating = updatingId?.startsWith(`${c.id}-`);
                    const estado = c.estado_clase || 'Programada';
                    const estadoDisplay = (c.fue_aplazada && estado === 'Programada') ? 'Aplazada' : estado;

                    return (
                      <tr key={c.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors">
                        <td className="py-2.5 px-3 font-mono font-medium whitespace-nowrap text-zinc-700 dark:text-zinc-300">
                          {fmtFecha(c.fecha_clase)}
                        </td>
                        <td className="py-2.5 px-3 whitespace-nowrap">
                          <div className="flex items-center gap-1.5">
                            <span className="font-semibold text-zinc-900 dark:text-white truncate max-w-[130px]">
                              {nombreGrupo}
                            </span>
                            {c.es_adicional && (
                              <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-[var(--accent-color)]/20 text-[var(--accent-color)]">
                                EXTRA
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="py-2.5 px-3 text-zinc-600 dark:text-zinc-400 max-w-[180px] truncate" title={tema}>
                          {tema}
                        </td>
                        <td className="py-2.5 px-3 whitespace-nowrap">
                          <span
                            className={cn(
                              'inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold border',
                              getBadgeStyles(estadoDisplay)
                            )}
                          >
                            {estadoDisplay}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-right whitespace-nowrap">
                          <div className="inline-flex items-center gap-1">
                            <button
                              type="button"
                              disabled={isUpdating || estado === 'Completada'}
                              onClick={() => handleEstadoChange(c.id, 'Completada')}
                              title="Marcar como Completada"
                              className={cn(
                                'px-2 py-1 rounded text-[11px] font-semibold transition-all cursor-pointer inline-flex items-center justify-center',
                                estado === 'Completada'
                                  ? 'opacity-40 cursor-default bg-zinc-100 dark:bg-zinc-800 text-zinc-400'
                                  : 'bg-[var(--accent-color)] text-white hover:opacity-90 active:scale-95'
                              )}
                            >
                              <Check size={12} strokeWidth={2.5} />
                            </button>
                            <button
                              type="button"
                              disabled={isUpdating}
                              onClick={() => {
                                if (onAplazar) {
                                  onAplazar(c);
                                } else {
                                  handleEstadoChange(c.id, 'Programada', { fue_aplazada: true });
                                }
                              }}
                              title="Aplazar clase y reprogramar"
                              className={cn(
                                'px-2 py-1 rounded text-[11px] font-medium transition-all border cursor-pointer',
                                c.fue_aplazada
                                  ? 'border-[var(--accent-color)] bg-[var(--accent-color)]/20 text-[var(--accent-color)] font-semibold'
                                  : 'border-[var(--accent-color)] text-[var(--accent-color)] hover:bg-[var(--accent-color)]/10 active:scale-95'
                              )}
                            >
                              Aplazar
                            </button>
                            <button
                              type="button"
                              disabled={isUpdating || estado === 'Cancelada'}
                              onClick={() => handleEstadoChange(c.id, 'Cancelada')}
                              title="Marcar como Cancelada"
                              className={cn(
                                'px-2 py-1 rounded text-[11px] font-medium transition-all cursor-pointer inline-flex items-center justify-center',
                                estado === 'Cancelada'
                                  ? 'opacity-40 cursor-default text-zinc-400'
                                  : 'text-zinc-500 hover:text-rose-500 hover:bg-rose-500/10 active:scale-95'
                              )}
                            >
                              <X size={12} strokeWidth={2.5} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
}

