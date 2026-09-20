import { useState, useEffect } from 'react';
import { FormField, Input } from '../ui/FormField';
import { CustomSelect } from '../ui/CustomSelect';
import { Toggle } from '../ui/Toggle';
import { Button } from '../ui/Button';
import { formatCurrency } from '../../lib/utils';

const DEFAULT = {
  grupo_id: '',
  fecha_clase: '',
  nombre_clase: '',
  es_extra: false,
  link_grabacion: '',
  en_reclamo: false,
};

function getInitialState(initial, initialGroupId) {
  const defaultGrupoId = initial?.grupo_id ?? initialGroupId ?? '';
  const todayStr = new Date().toISOString().split('T')[0];

  return {
    ...DEFAULT,
    ...initial,
    grupo_id: defaultGrupoId != null ? String(defaultGrupoId) : '',
    fecha_clase: initial?.fecha_clase || todayStr,
    nombre_clase: initial?.nombre_clase ?? '',
    es_extra: Boolean(initial?.es_extra),
    link_grabacion: initial?.link_grabacion ?? '',
    en_reclamo: Boolean(initial?.en_reclamo),
  };
}

export function ClaseForm({ initial, initialGroupId, grupos = [], onSubmit, onCancel }) {
  const [form, setForm] = useState(() => getInitialState(initial, initialGroupId));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  // Guardar referencia de los valores originales para detectar cambios
  const originalGrupoId = initial?.grupo_id != null ? String(initial.grupo_id) : '';
  const originalEsExtra = Boolean(initial?.es_extra);

  useEffect(() => {
    setForm(getInitialState(initial, initialGroupId));
  }, [initial, initialGroupId]);

  const set = (k) => (e) => setForm((p) => ({ ...p, [k]: e.target.value }));
  const setVal = (k) => (v) => setForm((p) => ({ ...p, [k]: v }));

  // Previsualización del precio según tarifa del grupo seleccionado
  const grupoSel = grupos.find((g) => String(g.id) === String(form.grupo_id));
  const precioPreview = grupoSel?.tarifas
    ? form.es_extra
      ? grupoSel.tarifas.precio_extra
      : grupoSel.tarifas.precio_regular
    : null;

  // Detectar si el precio snapshot debe recalcularse
  const grupoChanged = String(form.grupo_id) !== originalGrupoId;
  const esExtraChanged = form.es_extra !== originalEsExtra;
  const needsRecalc = !initial?.id || grupoChanged || esExtraChanged;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.grupo_id) {
      setError('Por favor selecciona un grupo.');
      return;
    }
    if (!form.fecha_clase) {
      setError('La fecha de la clase es obligatoria.');
      return;
    }

    setSaving(true);
    setError('');

    // Resolver grupo_id: preservar UUID como string pura, nunca castear a NaN
    const rawGrupoId = String(form.grupo_id).trim();
    const isPureDigits = /^\d+$/.test(rawGrupoId);
    const cleanGrupoId = isPureDigits ? Number(rawGrupoId) : rawGrupoId;

    const payload = {
      grupo_id: cleanGrupoId,
      fecha_clase: form.fecha_clase,
      nombre_clase: form.nombre_clase?.trim() || null,
      es_extra: Boolean(form.es_extra),
      link_grabacion: form.link_grabacion?.trim() || null,
      en_reclamo: Boolean(form.en_reclamo),
      // El hook useClases verá esta bandera para decidir si recalcula el snapshot
      recalc: needsRecalc,
    };

    try {
      await onSubmit(payload);
    } catch (err) {
      setError(err.message || 'Error al guardar la clase');
    } finally {
      setSaving(false);
    }
  };

  const grupoOptions = grupos.map((g) => ({ value: String(g.id), label: g.nombre_grupo }));

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <FormField label="Grupo" required className="md:col-span-2">
          <CustomSelect
            id="grupo_id"
            value={form.grupo_id ? String(form.grupo_id) : ''}
            onChange={(val) => setForm((p) => ({ ...p, grupo_id: val }))}
            options={grupoOptions}
            placeholder="Selecciona grupo…"
          />
        </FormField>

        <FormField label="Fecha de Clase" required>
          <Input
            id="fecha_clase"
            type="date"
            value={form.fecha_clase}
            onChange={set('fecha_clase')}
          />
        </FormField>

        <FormField label="Nombre / Tema de la Clase">
          <Input
            id="nombre_clase"
            value={form.nombre_clase}
            onChange={set('nombre_clase')}
            placeholder="Ej. Clase 5 — Gramática"
          />
        </FormField>

        {/* Motor de precios visible al usuario */}
        <FormField label="¿Clase Extra?">
          <div className="flex items-center gap-4 mt-1">
            <Toggle
              id="es_extra"
              checked={form.es_extra}
              onChange={setVal('es_extra')}
              label={form.es_extra ? 'Sí' : 'No'}
            />
            {precioPreview !== null && (
              <span className="text-sm font-mono text-[var(--accent-color)] bg-[var(--accent-color)]/10 px-2.5 py-1 rounded-lg border border-[var(--accent-color)]/20">
                {formatCurrency(precioPreview)} {needsRecalc ? '(nuevo snapshot)' : '(snapshot guardado)'}
              </span>
            )}
          </div>
        </FormField>

        <FormField label="Link de Grabación">
          <Input
            id="link_grabacion"
            type="url"
            value={form.link_grabacion}
            onChange={set('link_grabacion')}
            placeholder="https://…"
          />
        </FormField>
      </div>

      {error && <p className="text-sm text-red-400">{error}</p>}

      <div className="flex justify-end gap-3 pt-2">
        <Button type="button" variant="ghost" onClick={onCancel}>
          Cancelar
        </Button>
        <Button type="submit" loading={saving}>
          {initial?.id ? 'Guardar cambios' : 'Registrar clase'}
        </Button>
      </div>
    </form>
  );
}
