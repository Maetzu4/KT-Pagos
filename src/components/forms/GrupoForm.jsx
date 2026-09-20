import { useState, useEffect } from 'react';
import { FormField, Input } from '../ui/FormField';
import { CustomSelect } from '../ui/CustomSelect';
import { Button } from '../ui/Button';

const DEFAULT = {
  nombre_grupo: '',
  tarifa_id: '',
  link_backoffice: '',
  link_whatsapp: '',
  fecha_inicio: '',
  cantidad_lecciones: '',
};

function getInitialState(initial) {
  return {
    ...DEFAULT,
    ...initial,
    tarifa_id: initial?.tarifa_id != null ? String(initial.tarifa_id) : (initial?.tarifas?.id != null ? String(initial.tarifas.id) : ''),
    nombre_grupo: initial?.nombre_grupo ?? '',
    fecha_inicio: initial?.fecha_inicio ?? '',
    cantidad_lecciones: initial?.cantidad_lecciones != null ? String(initial.cantidad_lecciones) : '',
    link_backoffice: initial?.link_backoffice ?? '',
    link_whatsapp: initial?.link_whatsapp ?? '',
  };
}

export function GrupoForm({ initial, tarifas = [], onSubmit, onCancel }) {
  const [form, setForm] = useState(() => getInitialState(initial));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    setForm(getInitialState(initial));
  }, [initial]);

  const set = (k) => (e) => setForm((p) => ({ ...p, [k]: e.target.value }));

  const handleTarifaChange = (e) => {
    const val = e.target.value;
    setForm((p) => ({ ...p, tarifa_id: val }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.nombre_grupo?.trim()) {
      setError('El nombre del grupo es obligatorio.');
      return;
    }
    if (!form.tarifa_id || form.tarifa_id === '') {
      setError('Por favor selecciona una tarifa.');
      return;
    }
    if (!form.fecha_inicio) {
      setError('La fecha de inicio es obligatoria.');
      return;
    }
    if (!form.cantidad_lecciones || Number(form.cantidad_lecciones) <= 0) {
      setError('Ingresa una cantidad válida de lecciones.');
      return;
    }

    setSaving(true);
    setError('');

    // Resolver tarifa_id correctamente: integer vs UUID
    const rawTarifaId = String(form.tarifa_id).trim();
    const isPureDigits = /^\d+$/.test(rawTarifaId);
    const resolvedTarifaId = isPureDigits ? Number(rawTarifaId) : rawTarifaId;

    const payload = {
      nombre_grupo: form.nombre_grupo.trim(),
      tarifa_id: resolvedTarifaId,
      fecha_inicio: form.fecha_inicio,
      cantidad_lecciones: Number(form.cantidad_lecciones),
      link_backoffice: form.link_backoffice?.trim() || null,
      link_whatsapp: form.link_whatsapp?.trim() || null,
    };

    try {
      await onSubmit(payload);
    } catch (err) {
      setError(err.message || 'Error al guardar el grupo');
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <FormField label="Nombre del Grupo" required className="md:col-span-2">
          <Input
            id="nombre_grupo"
            value={form.nombre_grupo}
            onChange={set('nombre_grupo')}
            placeholder="Ej. Grupo Inglés A1 — Lunes"
          />
        </FormField>

        <FormField label="Tarifa" required>
          <CustomSelect
            id="tarifa_id"
            value={form.tarifa_id ? String(form.tarifa_id) : ''}
            onChange={(val) => setForm((p) => ({ ...p, tarifa_id: val }))}
            options={tarifas.map((t) => {
              const tid = t.id ?? t.tarifa_id;
              return {
                value: String(tid),
                label: `${t.duracion_minutos} min — $${t.precio_regular} / $${t.precio_extra} extra`,
              };
            })}
            placeholder="Selecciona tarifa…"
          />
        </FormField>

        <FormField label="Fecha de Inicio" required>
          <Input
            id="fecha_inicio"
            type="date"
            value={form.fecha_inicio}
            onChange={set('fecha_inicio')}
          />
        </FormField>

        <FormField label="Cantidad de Lecciones" required className="md:col-span-2">
          <Input
            id="cantidad_lecciones"
            type="number"
            min="1"
            value={form.cantidad_lecciones}
            onChange={set('cantidad_lecciones')}
            placeholder="Ej. 24"
          />
        </FormField>

        <FormField label="Link Backoffice">
          <Input
            id="link_backoffice"
            type="url"
            value={form.link_backoffice}
            onChange={set('link_backoffice')}
            placeholder="https://…"
          />
        </FormField>

        <FormField label="Link WhatsApp">
          <Input
            id="link_whatsapp"
            type="url"
            value={form.link_whatsapp}
            onChange={set('link_whatsapp')}
            placeholder="https://wa.me/…"
          />
        </FormField>
      </div>

      {error && <p className="text-sm text-red-400">{error}</p>}

      <div className="flex justify-end gap-3 pt-2">
        <Button type="button" variant="ghost" onClick={onCancel}>
          Cancelar
        </Button>
        <Button type="submit" loading={saving}>
          {initial?.id ? 'Guardar cambios' : 'Crear grupo'}
        </Button>
      </div>
    </form>
  );
}
