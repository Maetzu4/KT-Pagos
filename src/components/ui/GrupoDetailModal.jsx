import { useState, useEffect, useCallback, useMemo } from 'react';
import { Plus, Calendar, Clock, ExternalLink, X, ChevronDown } from 'lucide-react';
import { Modal } from './Modal';
import { Badge } from './Badge';
import { Button } from './Button';
import { ClaseExtraModal } from '../modals/ClaseExtraModal';
import { ReprogramarClaseModal } from '../modals/ReprogramarClaseModal';
import { supabase } from '../../lib/supabaseClient';
import { cn } from '../../lib/utils';

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Formatea 'YYYY-MM-DD' → 'DD/MM/YYYY' */
function fmtFecha(str) {
  if (!str) return '—';
  const clean = str.split('T')[0].split(' ')[0];
  const [y, m, d] = clean.split('-');
  return `${d}/${m}/${y}`;
}

const ESTADOS_CLASE = ['Programada', 'Completada', 'Aplazada', 'Cancelada'];

const ESTADO_STYLES = {
  Completada: 'bg-[var(--accent-color)] text-white border-transparent',
  Aplazada:   'border border-[var(--accent-color)] text-[var(--accent-color)] bg-transparent',
  Programada: 'bg-[var(--accent-color)]/10 text-[var(--accent-color)] border-transparent',
  Cancelada:  'text-zinc-500 bg-zinc-100 dark:bg-zinc-800/50 border-transparent',
};

// ─── Selector de estado inline ────────────────────────────────────────────────
function EstadoSelector({ clase, claseId, estadoActual, onUpdate, onAplazar }) {
  const [open, setOpen]     = useState(false);
  const [saving, setSaving] = useState(false);
  const targetId = clase?.id ?? claseId;

  const handleSelect = async (nuevoEstado) => {
    if (nuevoEstado === estadoActual) { setOpen(false); return; }
    setOpen(false);
    if (nuevoEstado === 'Aplazada' && onAplazar && clase) {
      onAplazar(clase);
      return;
    }
    setSaving(true);
    await onUpdate(targetId, { estado_clase: nuevoEstado });
    setSaving(false);
  };

  return (
    <div className="relative inline-block">
      <button
        onClick={() => setOpen((p) => !p)}
        disabled={saving}
        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-semibold border
                    transition-all duration-150 cursor-pointer hover:opacity-80
                    ${ESTADO_STYLES[estadoActual] ?? 'bg-zinc-500/10 text-zinc-400 border-zinc-500/20'}
                    ${saving ? 'opacity-50 cursor-wait' : ''}`}
      >
        {estadoActual}
        <ChevronDown size={10} className={`transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <>
          {/* Overlay para cerrar al clic fuera */}
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute left-0 top-full mt-1 z-50 min-w-[130px] rounded-xl shadow-xl
                          bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700
                          overflow-hidden animate-fade-in">
            {ESTADOS_CLASE.map((e) => (
              <button
                key={e}
                onClick={() => handleSelect(e)}
                className={`w-full text-left px-3 py-2 text-xs font-medium transition-colors
                            hover:bg-zinc-100 dark:hover:bg-zinc-800
                            ${e === estadoActual ? 'text-[var(--accent-color)] font-semibold' : 'text-zinc-700 dark:text-zinc-300'}`}
              >
                {e}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

// ─── Modal principal ──────────────────────────────────────────────────────────
export function GrupoDetailModal({ grupo, open, onClose, onEdit, onClassUpdate }) {
  const [clases,             setClases]             = useState([]);
  const [loading,            setLoading]            = useState(false);
  const [isExtraModalOpen,   setIsExtraModalOpen]   = useState(false);
  const [claseAReprogramar,  setClaseAReprogramar]  = useState(null);
  const [filtroEstado,       setFiltroEstado]       = useState('todas');

  // Fetch clases del grupo
  const fetchClases = useCallback(async () => {
    if (!grupo?.id) return;
    setLoading(true);
    const { data } = await supabase
      .from('clases')
      .select('id, tema_clase, fecha_clase, estado_clase, es_adicional, fue_aplazada')
      .eq('grupo_id', grupo.id)
      .order('fecha_clase', { ascending: true });
    setClases(data ?? []);
    setLoading(false);
  }, [grupo?.id]);

  useEffect(() => {
    if (open) fetchClases();
    else {
      setClases([]);
      setFiltroEstado('todas');
      setClaseAReprogramar(null);
    }
  }, [open, fetchClases]);

  // Actualizar clase en Supabase
  const updateClase = async (claseId, updates) => {
    const { data, error } = await supabase
      .from('clases')
      .update(updates)
      .eq('id', claseId)
      .select('id, tema_clase, fecha_clase, estado_clase, es_adicional, fue_aplazada')
      .single();
    if (!error && data) {
      setClases((prev) =>
        prev.map((c) => (c.id === claseId ? { ...c, ...data } : c))
      );
      onClassUpdate?.();
    }
  };

  const handleConfirmarReprogramacion = async (nuevaFecha) => {
    if (!claseAReprogramar) return;
    const c = claseAReprogramar;
    setClaseAReprogramar(null);
    await updateClase(c.id, { fecha_clase: nuevaFecha, estado_clase: 'Programada', fue_aplazada: true });
  };

  const stats = useMemo(() => {
    const total = clases.length;
    const completadas = clases.filter((c) => (c.estado_clase || '').toLowerCase() === 'completada').length;
    const programadas = clases.filter((c) => (c.estado_clase || '').toLowerCase() === 'programada').length;
    const canceladas  = clases.filter((c) => (c.estado_clase || '').toLowerCase() === 'cancelada').length;
    const aplazadas   = clases.filter((c) => Boolean(c.fue_aplazada)).length;
    const extras      = clases.filter((c) => Boolean(c.es_adicional)).length;
    return { total, completadas, programadas, canceladas, aplazadas, extras };
  }, [clases]);

  const clasesFiltradas = useMemo(() => {
    if (filtroEstado === 'todas') return clases;
    if (filtroEstado === 'Aplazadas') return clases.filter((c) => Boolean(c.fue_aplazada));
    if (filtroEstado === 'Extras') return clases.filter((c) => Boolean(c.es_adicional));
    return clases.filter((c) => (c.estado_clase || '').toLowerCase() === filtroEstado.toLowerCase());
  }, [clases, filtroEstado]);

  if (!grupo) return null;

  const completadas = stats.completadas;
  const programadas = stats.programadas;

  return (
    <>
      <Modal open={open} onClose={onClose} title={grupo.nombre_grupo} size="lg">
        <div className="space-y-5">

          {/* ── Resumen del grupo ── */}
          <div className="grid grid-cols-3 gap-3">
            <div className="col-span-3 sm:col-span-1 flex items-center gap-2 px-3 py-2.5
                            rounded-xl bg-zinc-50 dark:bg-zinc-800/40
                            border border-zinc-200 dark:border-zinc-700/60">
              <Clock size={14} className="text-zinc-400 shrink-0" />
              <div className="min-w-0">
                <p className="text-[10px] text-zinc-500 uppercase tracking-wide">Horario</p>
                <p className="text-sm font-medium text-zinc-900 dark:text-white truncate">
                  {grupo.horario ?? '—'}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl
                            bg-zinc-50 dark:bg-zinc-800/40 border border-zinc-200 dark:border-zinc-700/60">
              <Calendar size={14} className="text-zinc-400 shrink-0" />
              <div>
                <p className="text-[10px] text-zinc-500 uppercase tracking-wide">Inicio</p>
                <p className="text-sm font-medium text-zinc-900 dark:text-white">
                  {fmtFecha(grupo.fecha_inicio_grupo)}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl
                            bg-zinc-50 dark:bg-zinc-800/40 border border-zinc-200 dark:border-zinc-700/60">
              <div className="w-full">
                <p className="text-[10px] text-zinc-500 uppercase tracking-wide mb-0.5">Progreso</p>
                <p className="text-sm font-semibold text-zinc-900 dark:text-white">
                  {completadas}
                  <span className="font-normal text-zinc-500"> / {clases.length} clases</span>
                </p>
              </div>
            </div>
          </div>

          {/* ── Acciones de cabecera ── */}
          <div className="flex items-center justify-between">
            <p className="text-xs text-zinc-500">
              <span className="font-semibold text-zinc-900 dark:text-white">{clases.length}</span> clases
              {programadas > 0 && (
                <> · <span className="text-[var(--accent-color)]">{programadas} programadas</span></>
              )}
            </p>
            <div className="flex items-center gap-2">
              {grupo.link_bo && (
                <a href={grupo.link_bo} target="_blank" rel="noreferrer">
                  <Button size="sm" variant="ghost" id={`btn-bo-${grupo.id}`}>
                    <ExternalLink size={13} /> Backoffice
                  </Button>
                </a>
              )}
              <Button
                size="sm"
                id={`btn-add-clase-extra-${grupo.id}`}
                onClick={() => setIsExtraModalOpen(true)}
              >
                <Plus size={14} /> Añadir Clase Extra
              </Button>
            </div>
          </div>

          {/* ── Filtros de clases ── */}
          <div className="flex items-center gap-1.5 overflow-x-auto text-xs py-1 border-b border-zinc-200 dark:border-zinc-800 pb-2">
            {[
              { key: 'todas', label: 'Todas', count: stats.total },
              { key: 'Completada', label: 'Completada', count: stats.completadas },
              { key: 'Programada', label: 'Programada', count: stats.programadas },
              { key: 'Cancelada', label: 'Cancelada', count: stats.canceladas },
              { key: 'Aplazadas', label: 'Aplazadas', count: stats.aplazadas },
              { key: 'Extras', label: 'Extras', count: stats.extras },
            ].map((opt) => (
              <button
                key={opt.key}
                type="button"
                onClick={() => setFiltroEstado(opt.key)}
                className={cn(
                  'px-2.5 py-1 rounded-lg font-medium transition-colors cursor-pointer whitespace-nowrap',
                  filtroEstado === opt.key
                    ? 'bg-[var(--accent-color)] text-white shadow-sm'
                    : 'text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800'
                )}
              >
                {opt.label} ({opt.count})
              </button>
            ))}
          </div>

          {/* ── Tabla de clases ── */}
          <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 overflow-hidden">
            <div className="max-h-[55vh] overflow-y-auto">
              {loading ? (
                <div className="flex items-center justify-center py-12 text-zinc-500 text-sm gap-2">
                  <div className="w-5 h-5 border-2 border-[var(--accent-color)] border-t-transparent rounded-full animate-spin" />
                  Cargando clases…
                </div>
              ) : clases.length === 0 ? (
                <div className="py-12 text-center">
                  <p className="text-zinc-500 text-sm">No hay clases generadas para este grupo.</p>
                  <p className="text-zinc-400 text-xs mt-1">Usa el Importador para generarlas automáticamente.</p>
                </div>
              ) : clasesFiltradas.length === 0 ? (
                <div className="py-12 text-center">
                  <p className="text-zinc-500 text-sm">No hay clases con el filtro seleccionado.</p>
                </div>
              ) : (
                <table className="min-w-full text-sm">
                  <thead className="sticky top-0 z-10 bg-zinc-50 dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-800">
                    <tr>
                      <th className="px-4 py-3 text-left text-[11px] font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider whitespace-nowrap w-10">
                        #
                      </th>
                      <th className="px-4 py-3 text-left text-[11px] font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider whitespace-nowrap">
                        Tema
                      </th>
                      <th className="px-4 py-3 text-left text-[11px] font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider whitespace-nowrap">
                        Fecha
                      </th>
                      <th className="px-4 py-3 text-left text-[11px] font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider whitespace-nowrap">
                        Estado
                      </th>
                      <th className="px-4 py-3 text-center text-[11px] font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider whitespace-nowrap w-24">
                        Aplazada
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800 bg-white dark:bg-zinc-900">
                    {clasesFiltradas.map((c, i) => (
                      <tr key={c.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-800/40 transition-colors">
                        {/* # */}
                        <td className="px-4 py-3 text-xs text-zinc-400 font-mono w-10">
                          {i + 1}
                        </td>
                        {/* Tema */}
                        <td className="px-4 py-3 font-medium text-zinc-900 dark:text-white">
                          <div className="flex items-center gap-1.5">
                            {c.tema_clase ?? `Lección ${i + 1}`}
                            {c.es_adicional && (
                              <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-[var(--accent-color)]/20 text-[var(--accent-color)]">
                                EXTRA
                              </span>
                            )}
                          </div>
                        </td>
                        {/* Fecha */}
                        <td className="px-4 py-3 text-zinc-600 dark:text-zinc-400 whitespace-nowrap tabular-nums">
                          {fmtFecha(c.fecha_clase)}
                        </td>
                        {/* Estado */}
                        <td className="px-4 py-3">
                          <EstadoSelector
                            clase={c}
                            estadoActual={c.estado_clase ?? 'Programada'}
                            onUpdate={updateClase}
                            onAplazar={(clase) => setClaseAReprogramar(clase)}
                          />
                        </td>
                        {/* Checkbox Aplazada */}
                        <td className="px-4 py-3 text-center">
                          <label className="inline-flex items-center justify-center cursor-pointer">
                            <input
                              type="checkbox"
                              checked={Boolean(c.fue_aplazada)}
                              onChange={() => updateClase(c.id, { fue_aplazada: !c.fue_aplazada })}
                              className="w-4 h-4 rounded text-[var(--accent-color)] accent-[var(--accent-color)] focus:ring-[var(--accent-color)]/30 cursor-pointer"
                              title={c.fue_aplazada ? 'Marcada como aplazada' : 'Marcar como aplazada'}
                            />
                          </label>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>

          {/* ── Footer ── */}
          <div className="flex justify-between items-center pt-2 border-t border-zinc-200 dark:border-zinc-800">
            <Button size="sm" variant="ghost" onClick={() => { onClose(); onEdit?.(grupo); }}>
              Editar grupo
            </Button>
            <Button size="sm" variant="ghost" onClick={onClose}>
              <X size={13} /> Cerrar
            </Button>
          </div>
        </div>
      </Modal>

      {/* ── Modal Clase Extra ── */}
      <ClaseExtraModal
        isOpen={isExtraModalOpen}
        onClose={() => setIsExtraModalOpen(false)}
        grupoPreseleccionado={grupo.id}
        onSuccess={() => {
          fetchClases();
          onClassUpdate?.();
        }}
      />

      {/* ── Modal Reprogramar Clase ── */}
      <ReprogramarClaseModal
        isOpen={!!claseAReprogramar}
        clase={claseAReprogramar}
        onClose={() => setClaseAReprogramar(null)}
        onConfirm={handleConfirmarReprogramacion}
      />
    </>
  );
}
