import { useState, useMemo } from 'react';
import { Plus, Pencil, Trash2, Check, X } from 'lucide-react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { ClaseExtraModal } from './ClaseExtraModal';
import { useClases } from '../../hooks/useClases';

function fmtFecha(str) {
  if (!str) return '—';
  const clean = str.split('T')[0].split(' ')[0];
  const [y, m, d] = clean.split('-');
  return `${d}/${m}/${y}`;
}

export function GestionarExtrasModal({ isOpen, onClose }) {
  const { clases, loading, updateClase, deleteClase, refetch } = useClases();
  const [isAddOpen, setIsAddOpen] = useState(false);

  // Filtramos en memoria las clases extras
  const extras = useMemo(() => {
    return (clases || [])
      .filter((c) => c.es_adicional === true)
      .slice()
      .sort((a, b) => (b.fecha_clase ?? '').localeCompare(a.fecha_clase ?? ''));
  }, [clases]);

  // Estado para edición en línea
  const [editingId, setEditingId] = useState(null);
  const [editFecha, setEditFecha] = useState('');
  const [editTema, setEditTema] = useState('');
  const [savingEdit, setSavingEdit] = useState(false);

  const startEdit = (c) => {
    setEditingId(c.id);
    setEditFecha(c.fecha_clase?.split('T')[0]?.split(' ')[0] ?? '');
    setEditTema(c.tema_clase ?? c.nombre_clase ?? '');
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditFecha('');
    setEditTema('');
  };

  const saveEdit = async (id) => {
    if (!editFecha || !editTema.trim()) return;
    setSavingEdit(true);
    try {
      await updateClase(id, {
        fecha_clase: editFecha,
        tema_clase: editTema.trim(),
        nombre_clase: editTema.trim(),
      });
      await refetch?.();
      setEditingId(null);
    } catch (err) {
      console.error('Error al actualizar clase extra:', err);
      alert('Error al guardar cambios: ' + (err.message || 'Error desconocido'));
    } finally {
      setSavingEdit(false);
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm('¿Estás seguro de que deseas eliminar esta clase extra?')) {
      try {
        await deleteClase(id);
        await refetch?.();
      } catch (err) {
        console.error('Error al eliminar clase extra:', err);
        alert('Error al eliminar: ' + (err.message || 'Error desconocido'));
      }
    }
  };

  return (
    <>
      <Modal open={isOpen} onClose={onClose} title="Gestión de Clases Extras" size="lg">
        <div className="space-y-4">
          {/* Cabecera interna con conteo y botón Añadir */}
          <div className="flex items-center justify-between pb-3 border-b border-zinc-200 dark:border-zinc-800">
            <div>
              <p className="text-xs text-zinc-500">
                {extras.length} {extras.length === 1 ? 'clase extra registrada' : 'clases extras registradas'}
              </p>
            </div>
            <Button
              size="sm"
              onClick={() => setIsAddOpen(true)}
              id="btn-nueva-extra-modal"
            >
              <Plus size={14} /> Añadir Clase Extra
            </Button>
          </div>

          {/* Listado / Tabla */}
          {loading ? (
            <div className="py-12 flex items-center justify-center gap-2 text-zinc-500 text-sm">
              <div className="w-5 h-5 border-2 border-[var(--accent-color)] border-t-transparent rounded-full animate-spin" />
              Cargando clases extras…
            </div>
          ) : extras.length === 0 ? (
            <div className="py-12 text-center border border-dashed border-zinc-200 dark:border-zinc-800 rounded-2xl">
              <p className="text-sm text-zinc-400 dark:text-zinc-500">
                No hay clases extras registradas
              </p>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsAddOpen(true)}
                className="mt-3 text-[var(--accent-color)]"
              >
                <Plus size={14} /> Crear la primera extra
              </Button>
            </div>
          ) : (
            <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 overflow-hidden bg-white dark:bg-zinc-900">
              <div className="max-h-[50vh] overflow-y-auto">
                <table className="min-w-full text-sm">
                  <thead className="sticky top-0 z-10 bg-zinc-50 dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-800">
                    <tr>
                      <th className="px-4 py-3 text-left text-[11px] font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
                        Fecha
                      </th>
                      <th className="px-4 py-3 text-left text-[11px] font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
                        Grupo
                      </th>
                      <th className="px-4 py-3 text-left text-[11px] font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
                        Tema / Descripción
                      </th>
                      <th className="px-4 py-3 text-right text-[11px] font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
                        Acciones
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                    {extras.map((c) => {
                      const isEditing = editingId === c.id;
                      const nombreGrupo = c.grupos?.nombre_grupo ?? '—';

                      return (
                        <tr
                          key={c.id}
                          className="hover:bg-zinc-50 dark:hover:bg-zinc-800/40 transition-colors"
                        >
                          {/* Fecha */}
                          <td className="px-4 py-3 whitespace-nowrap text-xs font-mono text-zinc-600 dark:text-zinc-300">
                            {isEditing ? (
                              <input
                                type="date"
                                value={editFecha}
                                onChange={(e) => setEditFecha(e.target.value)}
                                className="h-8 px-2 text-xs rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white focus:outline-none focus:border-[var(--accent-color)]"
                              />
                            ) : (
                              fmtFecha(c.fecha_clase)
                            )}
                          </td>

                          {/* Nombre del Grupo */}
                          <td className="px-4 py-3 font-medium text-zinc-900 dark:text-white whitespace-nowrap text-xs">
                            {nombreGrupo}
                          </td>

                          {/* Tema de la clase */}
                          <td className="px-4 py-3 text-zinc-600 dark:text-zinc-300 text-xs">
                            {isEditing ? (
                              <input
                                type="text"
                                value={editTema}
                                onChange={(e) => setEditTema(e.target.value)}
                                placeholder="Tema o lección…"
                                className="w-full h-8 px-2 text-xs rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white focus:outline-none focus:border-[var(--accent-color)]"
                              />
                            ) : (
                              c.tema_clase ?? c.nombre_clase ?? '—'
                            )}
                          </td>

                          {/* Acciones */}
                          <td className="px-4 py-3 text-right whitespace-nowrap">
                            {isEditing ? (
                              <div className="flex items-center justify-end gap-1.5">
                                <Button
                                  size="icon"
                                  onClick={() => saveEdit(c.id)}
                                  loading={savingEdit}
                                  aria-label="Guardar cambios"
                                  className="h-7 w-7 text-xs"
                                >
                                  <Check size={13} />
                                </Button>
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  onClick={cancelEdit}
                                  disabled={savingEdit}
                                  aria-label="Cancelar edición"
                                  className="h-7 w-7 text-xs"
                                >
                                  <X size={13} />
                                </Button>
                              </div>
                            ) : (
                              <div className="flex items-center justify-end gap-1.5">
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  onClick={() => startEdit(c)}
                                  aria-label="Editar clase extra"
                                  className="h-7 w-7 text-[var(--accent-color)] hover:bg-[var(--accent-color)]/10"
                                >
                                  <Pencil size={13} />
                                </Button>
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  onClick={() => handleDelete(c.id)}
                                  aria-label="Eliminar clase extra"
                                  className="h-7 w-7 text-[var(--accent-color)] hover:bg-[var(--accent-color)]/10"
                                >
                                  <Trash2 size={13} />
                                </Button>
                              </div>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Footer */}
          <div className="flex justify-end pt-2 border-t border-zinc-200 dark:border-zinc-800">
            <Button size="sm" variant="ghost" onClick={onClose}>
              Cerrar
            </Button>
          </div>
        </div>
      </Modal>

      {/* Modal para añadir nueva extra */}
      <ClaseExtraModal
        isOpen={isAddOpen}
        onClose={() => setIsAddOpen(false)}
        onSuccess={() => refetch?.()}
      />
    </>
  );
}
