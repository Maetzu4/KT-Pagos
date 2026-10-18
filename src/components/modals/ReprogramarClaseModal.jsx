import { useState, useEffect } from 'react';
import { Modal } from '../ui/Modal';
import { FormField, Input } from '../ui/FormField';
import { Button } from '../ui/Button';
import { Calendar } from 'lucide-react';

export function ReprogramarClaseModal({ isOpen, open, onClose, clase, onConfirm }) {
  const isModalOpen = Boolean(isOpen ?? open);
  const [fecha, setFecha] = useState('');

  useEffect(() => {
    if (isModalOpen && clase?.fecha_clase) {
      const cleanDate = String(clase.fecha_clase).split('T')[0].split(' ')[0];
      setFecha(cleanDate);
    } else if (isModalOpen && !clase?.fecha_clase) {
      setFecha('');
    }
  }, [clase, isModalOpen]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!fecha) return;
    onConfirm?.(fecha);
  };

  const nombreGrupo = clase?.grupos?.nombre_grupo ?? clase?.grupo_nombre ?? null;
  const tema = clase?.tema_clase ?? clase?.nombre_clase ?? null;

  return (
    <Modal
      open={isModalOpen}
      onClose={onClose}
      title="Reprogramar Clase"
      size="sm"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {(nombreGrupo || tema) && (
          <div className="p-3 rounded-xl bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-800 text-xs space-y-1">
            {nombreGrupo && (
              <p className="font-semibold text-zinc-900 dark:text-white">
                {nombreGrupo}
              </p>
            )}
            {tema && (
              <p className="text-zinc-500 dark:text-zinc-400 truncate">
                {tema}
              </p>
            )}
          </div>
        )}

        <FormField label="Nueva Fecha" required>
          <div className="relative">
            <Input
              id="fecha_reprogramada"
              type="date"
              value={fecha}
              onChange={(e) => setFecha(e.target.value)}
              required
              className="w-full"
            />
          </div>
        </FormField>

        <div className="flex justify-end gap-2 pt-3 border-t border-zinc-200 dark:border-zinc-800">
          <Button type="button" variant="ghost" onClick={onClose}>
            Cancelar
          </Button>
          <Button
            type="submit"
            className="bg-[var(--accent-color)] text-white hover:opacity-90 shadow-sm"
          >
            Confirmar
          </Button>
        </div>
      </form>
    </Modal>
  );
}
