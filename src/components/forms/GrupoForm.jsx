import { useState, useEffect } from 'react';
import { AlertTriangle } from 'lucide-react';
import { FormField, Input } from '../ui/FormField';
import { Button } from '../ui/Button';

const DEFAULT = {
  nombre_grupo:      '',
  curso_nombre:      '',
  curso_codigo:      '',
  fecha_inicio_grupo: '',
  horario:           '',
  lecciones_totales: '',
  duracion_minutos:  '',
  link_bo:           '',
};

function getInitialState(initial) {
  if (!initial) return DEFAULT;
  return {
    nombre_grupo:       initial.nombre_grupo       ?? '',
    curso_nombre:       initial.curso_nombre        ?? '',
    curso_codigo:       initial.curso_codigo        ?? '',
    fecha_inicio_grupo: initial.fecha_inicio_grupo
      ? initial.fecha_inicio_grupo.split('T')[0].split(' ')[0]
      : '',
    horario:            initial.horario             ?? '',
    lecciones_totales:  initial.lecciones_totales   != null ? String(initial.lecciones_totales) : '',
    duracion_minutos:   initial.duracion_minutos     != null ? String(initial.duracion_minutos)  : '',
    link_bo:            initial.link_bo             ?? '',
  };
}

export function GrupoForm({ initial, onSubmit, onCancel }) {
  const isEditing = !!initial?.id;
  const [form,   setForm]   = useState(() => getInitialState(initial));
  const [saving, setSaving] = useState(false);
  const [error,  setError]  = useState('');

  useEffect(() => { setForm(getInitialState(initial)); }, [initial]);

  const set = (k) => (e) => setForm((p) => ({ ...p, [k]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.nombre_grupo?.trim()) {
      setError('El nombre del grupo es obligatorio.');
      return;
    }
    if (!form.fecha_inicio_grupo) {
      setError('La fecha de inicio es obligatoria.');
      return;
    }
    setSaving(true);
    setError('');
    const payload = {
      nombre_grupo:       form.nombre_grupo.trim(),
      curso_nombre:       form.curso_nombre.trim()   || null,
      curso_codigo:       form.curso_codigo.trim()   || null,
      fecha_inicio_grupo: form.fecha_inicio_grupo    || null,
      horario:            form.horario.trim()        || null,
      lecciones_totales:  form.lecciones_totales !== '' ? Number(form.lecciones_totales) : null,
      duracion_minutos:   form.duracion_minutos  !== '' ? Number(form.duracion_minutos)  : null,
      link_bo:            form.link_bo.trim()        || null,
      user_id:            initial?.user_id ?? null,
    };
    try {
      await onSubmit(payload);
    } catch (err) {
      console.error('Error al guardar grupo:', err);
      setError(err?.message || 'Error al guardar el grupo');
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">

      {/* Advertencia de edición */}
      {isEditing && (
        <div className="flex items-start gap-2.5 px-3 py-2.5 rounded-xl
                        bg-[var(--accent-color)]/10 border border-[var(--accent-color)]/25
                        text-[var(--accent-color)]">
          <AlertTriangle size={15} className="shrink-0 mt-0.5 text-[var(--accent-color)]" />
          <p className="text-xs leading-relaxed text-[var(--accent-color)]">
            <span className="font-semibold text-[var(--accent-color)]">Atención:</span> Modificar la Fecha de Inicio o las Lecciones
            recalculará todas las clases futuras.
          </p>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

        <FormField label="Nombre del Grupo" required className="md:col-span-2">
          <Input
            id="nombre_grupo"
            value={form.nombre_grupo}
            onChange={set('nombre_grupo')}
            placeholder="Ej. MC LVL2 #12345"
          />
        </FormField>

        <FormField label="Curso (Nombre)">
          <Input
            id="curso_nombre"
            value={form.curso_nombre}
            onChange={set('curso_nombre')}
            placeholder="Ej. Minecraft Education LVL2"
          />
        </FormField>

        <FormField label="Curso (Código)">
          <Input
            id="curso_codigo"
            value={form.curso_codigo}
            onChange={set('curso_codigo')}
            placeholder="Ej. MC-LVL2"
          />
        </FormField>

        <FormField label="Fecha de Inicio" required>
          <Input
            id="fecha_inicio_grupo"
            type="date"
            value={form.fecha_inicio_grupo}
            onChange={set('fecha_inicio_grupo')}
          />
        </FormField>

        <FormField label="Horario">
          <Input
            id="horario"
            value={form.horario}
            onChange={set('horario')}
            placeholder="Ej. Do 12:00"
          />
        </FormField>

        <FormField label="Lecciones Totales">
          <Input
            id="lecciones_totales"
            type="number"
            min="0"
            value={form.lecciones_totales}
            onChange={set('lecciones_totales')}
            placeholder="Ej. 24"
          />
        </FormField>

        <FormField label="Duración (minutos)">
          <Input
            id="duracion_minutos"
            type="number"
            min="1"
            value={form.duracion_minutos}
            onChange={set('duracion_minutos')}
            placeholder="Ej. 60"
          />
        </FormField>

        <FormField label="Link Backoffice" className="md:col-span-2">
          <Input
            id="link_bo"
            type="url"
            value={form.link_bo}
            onChange={set('link_bo')}
            placeholder="https://…"
          />
        </FormField>

      </div>

      {error && <p className="text-sm text-red-400">{error}</p>}

      <div className="flex justify-end gap-3 pt-2">
        <Button type="button" variant="ghost" onClick={onCancel}>Cancelar</Button>
        <Button type="submit" loading={saving}>
          {isEditing ? 'Guardar cambios' : 'Crear grupo'}
        </Button>
      </div>
    </form>
  );
}
