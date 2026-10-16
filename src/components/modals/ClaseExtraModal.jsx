import { useState, useEffect } from 'react';
import { Modal } from '../ui/Modal';
import { FormField, Input } from '../ui/FormField';
import { Button } from '../ui/Button';
import { CustomSelect } from '../ui/CustomSelect';
import { useGrupos } from '../../hooks/useGrupos';
import { useClases } from '../../hooks/useClases';

export function ClaseExtraModal({ isOpen, open, onClose, grupoPreseleccionado, onSuccess }) {
  const isModalOpen = Boolean(isOpen ?? open);
  const { grupos, loading: loadingGrupos } = useGrupos();
  const { createClase } = useClases();

  const [grupoId, setGrupoId] = useState(() => (grupoPreseleccionado ? String(grupoPreseleccionado) : ''));
  const [temaClase, setTemaClase] = useState('');
  const [fechaClase, setFechaClase] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const grupoOptions = (grupos || [])
    .slice()
    .sort((a, b) => (a.nombre_grupo ?? '').localeCompare(b.nombre_grupo ?? ''))
    .map((g) => ({
      value: String(g.id),
      label: g.estado && g.estado !== 'activo'
        ? `${g.nombre_grupo} (${g.estado === 'archivado' ? 'Archivado' : g.estado === 'finalizado' ? 'Finalizado' : g.estado})`
        : g.nombre_grupo,
    }));

  useEffect(() => {
    if (grupoPreseleccionado) {
      setGrupoId(String(grupoPreseleccionado));
    }
  }, [grupoPreseleccionado]);

  useEffect(() => {
    if (isModalOpen) {
      if (grupoPreseleccionado) {
        setGrupoId(String(grupoPreseleccionado));
      } else if (!grupoId && grupoOptions.length > 0) {
        setGrupoId(grupoOptions[0]?.value ?? '');
      }
      setTemaClase('');
      // Formato YYYY-MM-DD
      const hoy = new Date();
      const yyyy = hoy.getFullYear();
      const mm = String(hoy.getMonth() + 1).padStart(2, '0');
      const dd = String(hoy.getDate()).padStart(2, '0');
      setFechaClase(`${yyyy}-${mm}-${dd}`);
      setError('');
    }
  }, [isModalOpen, grupoPreseleccionado]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!grupoId) {
      setError('Debes seleccionar un grupo.');
      return;
    }
    if (!temaClase.trim()) {
      setError('El tema o descripción de la clase es obligatorio.');
      return;
    }
    if (!fechaClase) {
      setError('La fecha de la clase es obligatoria.');
      return;
    }

    setSaving(true);
    setError('');

    const payload = {
      grupo_id: grupoId,
      fecha_clase: fechaClase,
      tema_clase: temaClase.trim(),
      nombre_clase: temaClase.trim(),
      estado_clase: 'Completada',
      es_adicional: true,
      precio_cobrado: null,
      periodo_id: null,
    };

    try {
      const nuevaClase = await createClase(payload);
      onSuccess?.(nuevaClase);
      onClose();
    } catch (err) {
      console.error('Error al registrar clase extra:', err);
      setError(err?.message || 'Error al guardar la clase extra.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal open={isModalOpen} onClose={onClose} title="Añadir Clase Extra" size="md">
      <form onSubmit={handleSubmit} className="space-y-4">
        <FormField label="Grupo" required>
          <CustomSelect
            value={grupoId}
            onChange={setGrupoId}
            options={grupoOptions}
            placeholder="Selecciona un grupo…"
            disabled={loadingGrupos}
          />
        </FormField>

        <FormField label="Tema / Descripción" required>
          <Input
            id="tema_clase"
            type="text"
            value={temaClase}
            onChange={(e) => setTemaClase(e.target.value)}
            placeholder="Ej. Nivelación, Lección adicional, Reposición…"
          />
        </FormField>

        <FormField label="Fecha de la Clase" required>
          <Input
            id="fecha_clase"
            type="date"
            value={fechaClase}
            onChange={(e) => setFechaClase(e.target.value)}
          />
        </FormField>

        {error && <p className="text-sm text-red-500 dark:text-red-400">{error}</p>}

        <div className="flex justify-end gap-3 pt-3 border-t border-zinc-200 dark:border-zinc-800">
          <Button type="button" variant="ghost" onClick={onClose} disabled={saving}>
            Cancelar
          </Button>
          <Button type="submit" loading={saving} id="btn-guardar-clase-extra">
            Guardar clase extra
          </Button>
        </div>
      </form>
    </Modal>
  );
}
