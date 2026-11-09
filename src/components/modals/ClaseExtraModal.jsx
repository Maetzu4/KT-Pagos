import { useState, useEffect } from 'react';
import { Modal } from '../ui/Modal';
import { FormField, Input } from '../ui/FormField';
import { Button } from '../ui/Button';
import { CustomSelect } from '../ui/CustomSelect';
import { useGrupos } from '../../hooks/useGrupos';
import { useClases } from '../../hooks/useClases';
import { useTarifas } from '../../hooks/useTarifas';

// ── Segmented tab: Interno / Externo ─────────────────────────────────────────
function TipoSwitch({ value, onChange }) {
  return (
    <div className="flex gap-1 p-1 rounded-xl bg-zinc-100 dark:bg-zinc-800/60 mb-4">
      {['interno', 'externo'].map((tipo) => (
        <button
          key={tipo}
          type="button"
          onClick={() => onChange(tipo)}
          className={[
            'flex-1 py-1.5 text-xs font-semibold rounded-lg transition-all duration-200 capitalize',
            value === tipo
              ? 'bg-[var(--accent-color)] text-white shadow-sm'
              : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-800 dark:hover:text-zinc-200',
          ].join(' ')}
        >
          {tipo === 'interno' ? '🏠 Interno' : '🌐 Externo (CSL / Reemplazo)'}
        </button>
      ))}
    </div>
  );
}

export function ClaseExtraModal({ isOpen, open, onClose, grupoPreseleccionado, onSuccess }) {
  const isModalOpen = Boolean(isOpen ?? open);
  const { grupos, loading: loadingGrupos } = useGrupos();
  const { tarifas, loading: loadingTarifas } = useTarifas();
  const { createClase } = useClases();

  // ── Tipo: 'interno' | 'externo' ──────────────────────────────────────────
  const [tipoExtra, setTipoExtra] = useState('interno');

  // ── Campos comunes ────────────────────────────────────────────────────────
  const [fechaClase, setFechaClase] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  // ── Campos INTERNOS ───────────────────────────────────────────────────────
  const [grupoId, setGrupoId] = useState(() =>
    grupoPreseleccionado ? String(grupoPreseleccionado) : ''
  );
  const [temaClase, setTemaClase] = useState('');

  // ── Campos EXTERNOS ───────────────────────────────────────────────────────
  const [tarifaId, setTarifaId] = useState('');
  const [descripcionExterna, setDescripcionExterna] = useState('');

  const grupoOptions = (grupos || [])
    .slice()
    .sort((a, b) => (a.nombre_grupo ?? '').localeCompare(b.nombre_grupo ?? ''))
    .map((g) => ({
      value: String(g.id),
      label:
        g.estado && g.estado !== 'activo'
          ? `${g.nombre_grupo} (${
              g.estado === 'archivado'
                ? 'Archivado'
                : g.estado === 'finalizado'
                ? 'Finalizado'
                : g.estado
            })`
          : g.nombre_grupo,
    }));

  const tarifaOptions = (tarifas || []).map((t) => ({
    value: String(t.id),
    label: `${t.duracion_minutos} min — $${Number(t.precio_extra ?? t.precio_regular ?? 0).toFixed(2)} extra`,
  }));

  useEffect(() => {
    if (grupoPreseleccionado) {
      setGrupoId(String(grupoPreseleccionado));
    }
  }, [grupoPreseleccionado]);

  useEffect(() => {
    if (isModalOpen) {
      // Reset state on open
      setTipoExtra('interno');
      setTemaClase('');
      setDescripcionExterna('');
      setError('');

      if (grupoPreseleccionado) {
        setGrupoId(String(grupoPreseleccionado));
      } else if (!grupoId && grupoOptions.length > 0) {
        setGrupoId(grupoOptions[0]?.value ?? '');
      }

      if (tarifaOptions.length > 0 && !tarifaId) {
        setTarifaId(tarifaOptions[0]?.value ?? '');
      }

      // Default date to today
      const hoy = new Date();
      const yyyy = hoy.getFullYear();
      const mm = String(hoy.getMonth() + 1).padStart(2, '0');
      const dd = String(hoy.getDate()).padStart(2, '0');
      setFechaClase(`${yyyy}-${mm}-${dd}`);
    }
  }, [isModalOpen, grupoPreseleccionado]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!fechaClase) {
      setError('La fecha de la clase es obligatoria.');
      return;
    }

    if (tipoExtra === 'interno') {
      if (!grupoId) {
        setError('Debes seleccionar un grupo.');
        return;
      }
      if (!temaClase.trim()) {
        setError('El tema o descripción de la clase es obligatorio.');
        return;
      }
    } else {
      if (!descripcionExterna.trim()) {
        setError('La descripción / nombre de la clase externa es obligatoria.');
        return;
      }
      if (!tarifaId) {
        setError('Debes seleccionar una tarifa para calcular el precio.');
        return;
      }
    }

    setSaving(true);

    const payload =
      tipoExtra === 'interno'
        ? {
            grupo_id: grupoId,
            fecha_clase: fechaClase,
            tema_clase: temaClase.trim(),
            nombre_clase: temaClase.trim(),
            estado_clase: 'Completada',
            es_adicional: true,
            es_externa: false,
            precio_cobrado: null,
            periodo_id: null,
          }
        : {
            grupo_id: null,
            fecha_clase: fechaClase,
            tema_clase: descripcionExterna.trim(),
            nombre_clase: descripcionExterna.trim(),
            descripcion_externa: descripcionExterna.trim(),
            tarifa_id: tarifaId,
            estado_clase: 'Completada',
            es_adicional: true,
            es_externa: true,
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
        {/* ── Selector de tipo ── */}
        <TipoSwitch value={tipoExtra} onChange={setTipoExtra} />

        {tipoExtra === 'interno' ? (
          <>
            {/* Interno: selector de grupo + tema */}
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
          </>
        ) : (
          <>
            {/* Externo: tarifa + descripción libre */}
            <FormField label="Tarifa a Aplicar" required>
              <CustomSelect
                value={tarifaId}
                onChange={setTarifaId}
                options={tarifaOptions}
                placeholder="Selecciona una tarifa…"
                disabled={loadingTarifas}
              />
            </FormField>

            <FormField label="Descripción / Nombre de la Clase" required>
              <Input
                id="descripcion_externa"
                type="text"
                value={descripcionExterna}
                onChange={(e) => setDescripcionExterna(e.target.value)}
                placeholder="Ej. Reemplazo Python #123, CSL Nivelación…"
              />
            </FormField>
          </>
        )}

        {/* Fecha común */}
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
