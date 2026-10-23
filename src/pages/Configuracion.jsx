import { useState, useRef, useEffect } from 'react';
import { Plus, Pencil, Trash2, Sun, Moon, LogOut, Heart, Database, Download, Upload, User } from 'lucide-react';
import { ImportadorJSON } from '../components/ImportadorJSON';
import { supabase } from '../lib/supabaseClient';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Toggle } from '../components/ui/Toggle';
import { ColorPicker } from '../components/ui/ColorPicker';
import { FormField, Input } from '../components/ui/FormField';
import { Modal } from '../components/ui/Modal';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';
import { Table } from '../components/ui/Table';
import { useTarifas } from '../hooks/useTarifas';
import { useTheme } from '../context/ThemeContext';
import { formatCurrency } from '../lib/utils';

const DEFAULT_TARIFA = { duracion_minutos: '', precio_regular: '', precio_extra: '' };

function TarifaForm({ initial, onSubmit, onCancel }) {
  const [form, setForm] = useState({ ...DEFAULT_TARIFA, ...initial });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const set = (k) => (e) => setForm((p) => ({ ...p, [k]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.duracion_minutos || !form.precio_regular || !form.precio_extra) {
      setError('Todos los campos son obligatorios.');
      return;
    }
    setSaving(true);
    setError('');
    try {
      await onSubmit({
        duracion_minutos: Number(form.duracion_minutos),
        precio_regular: parseFloat(form.precio_regular),
        precio_extra: parseFloat(form.precio_extra),
      });
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <FormField label="Duración (minutos)" required className="md:col-span-2">
          <Input
            id="duracion_minutos"
            type="number"
            min="1"
            value={form.duracion_minutos}
            onChange={set('duracion_minutos')}
            placeholder="Ej. 60"
          />
        </FormField>
        <FormField label="Precio Regular ($)" required>
          <Input
            id="precio_regular"
            type="number"
            step="0.01"
            min="0"
            value={form.precio_regular}
            onChange={set('precio_regular')}
            placeholder="0.00"
          />
        </FormField>
        <FormField label="Precio Extra ($)" required>
          <Input
            id="precio_extra"
            type="number"
            step="0.01"
            min="0"
            value={form.precio_extra}
            onChange={set('precio_extra')}
            placeholder="0.00"
          />
        </FormField>
      </div>
      {error && <p className="text-sm text-red-400">{error}</p>}
      <div className="flex justify-end gap-3 pt-2">
        <Button type="button" variant="ghost" onClick={onCancel}>Cancelar</Button>
        <Button type="submit" loading={saving}>{initial?.id ? 'Guardar' : 'Crear tarifa'}</Button>
      </div>
    </form>
  );
}

export default function Configuracion() {
  const { mode, toggleMode } = useTheme();
  const { tarifas, loading, createTarifa, updateTarifa, deleteTarifa } = useTarifas();

  const [modal, setModal] = useState(null); // null | 'create' | tarifa
  const [deleting, setDeleting] = useState(null);
  const [confirmId, setConfirmId] = useState(null);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [isDonationModalOpen, setIsDonationModalOpen] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);

  // Estados de Respaldo y Zona de Peligro
  const [exporting, setExporting] = useState(false);
  const [importingBackup, setImportingBackup] = useState(false);
  const [showDangerModal, setShowDangerModal] = useState(false);
  const [confirmDeleteText, setConfirmDeleteText] = useState('');
  const [deletingAll, setDeletingAll] = useState(false);
  const fileInputRef = useRef(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) setCurrentUser(user);
    });
  }, []);

  const handleSubmit = async (values) => {
    if (modal === 'create') await createTarifa(values);
    else await updateTarifa(modal.id, values);
    setModal(null);
  };

  const handleDeleteConfirm = async () => {
    if (!confirmId) return;
    setDeleting(confirmId);
    setConfirmId(null);
    try { await deleteTarifa(confirmId); } finally { setDeleting(null); }
  };

  const copiarCorreo = () => {
    navigator.clipboard.writeText('6814natsu@gmail.com');
    alert('¡Correo copiado al portapapeles!');
  };

  // Helper para consultar todas las filas con paginación (evita el límite de 1000 filas de PostgREST)
  const fetchAllUserRows = async (table, userId, select = '*') => {
    const PAGE_SIZE = 1000;
    let allRows = [];
    let from = 0;
    while (true) {
      const { data, error } = await supabase
        .from(table)
        .select(select)
        .eq('user_id', userId)
        .range(from, from + PAGE_SIZE - 1);
      if (error) throw new Error(`Error en ${table}: ${error.message}`);
      if (!data || data.length === 0) break;
      allRows.push(...data);
      if (data.length < PAGE_SIZE) break;
      from += PAGE_SIZE;
    }
    return allRows;
  };

  // ── Sistema de Backup ────────────────────────────────────────────────────────
  const handleDownloadBackup = async () => {
    setExporting(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('No hay sesión de usuario activa.');

      const [tarifasData, gruposData, periodosData, clasesData] = await Promise.all([
        fetchAllUserRows('tarifas', user.id),
        fetchAllUserRows('grupos', user.id),
        fetchAllUserRows('periodos', user.id),
        fetchAllUserRows('clases', user.id),
      ]);

      const backupObj = {
        version: 3,
        fecha: new Date().toISOString(),
        user_id: user.id,
        tarifas: tarifasData || [],
        grupos: gruposData || [],
        periodos: (periodosData || []).map((p) => ({
          ...p,
          requisitos_bono:  p.requisitos_bono  ?? false,
          r1_grado:         p.r1_grado         ?? 'none',
          r2_grado:         p.r2_grado         ?? 'none',
          r3_grado:         p.r3_grado         ?? 'none',
        })),
        clases: (clasesData || []).map((c) => ({
          ...c,
          fue_aplazada: c.fue_aplazada ?? false,
        })),
      };

      const blob = new Blob([JSON.stringify(backupObj, null, 2)], {
        type: 'application/json',
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'kt-pagos-backup.json';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Error al exportar backup:', err);
      alert('Error al descargar el backup: ' + (err.message || 'Error desconocido'));
    } finally {
      setExporting(false);
    }
  };

  const handleRestoreBackup = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImportingBackup(true);
    try {
      const text = await file.text();
      const parsedData = JSON.parse(text);

      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) throw new Error('No hay sesión de usuario activa.');

      // Consultar IDs existentes para verificar permisos y evitar violaciones de unicidad o RLS
      const { data: misTarifasExistentes, error: errFetchT } = await supabase
        .from('tarifas')
        .select('id, duracion_minutos')
        .eq('user_id', user.id);
      if (errFetchT) throw new Error(`Error al verificar tarifas: ${errFetchT.message}`);

      const misTarifasIds = new Set((misTarifasExistentes || []).map((mt) => mt.id));
      const misTarifasPorDuracion = new Map(
        (misTarifasExistentes || []).map((mt) => [mt.duracion_minutos, mt.id])
      );

      const mapaTarifaId  = new Map();
      const mapaGrupoId   = new Map();
      const mapaPeriodoId = new Map();

      // Inserción estricta en orden para evitar errores de llaves foráneas:
      // 1º Tarifas: Solo añadir tarifas de duraciones que no existan
      if (Array.isArray(parsedData.tarifas) && parsedData.tarifas.length > 0) {
        for (const t of parsedData.tarifas) {
          const tarifaPlana = {
            user_id: user.id,
            duracion_minutos: Number(t.duracion_minutos || 0),
            precio_regular: Number(t.precio_regular || 0),
            precio_extra: Number(t.precio_extra || 0),
          };

          const existingId = (t.id && misTarifasIds.has(t.id) ? t.id : null)
            || misTarifasPorDuracion.get(tarifaPlana.duracion_minutos);

          if (existingId) {
            // Ya existe: no se modifica ni se añade
            if (t.id) mapaTarifaId.set(t.id, existingId);
          } else {
            // Nueva tarifa: insertar sin id para que la BD genere uno nuevo
            const { data: nuevaTarifa, error: insErr } = await supabase
              .from('tarifas')
              .insert(tarifaPlana)
              .select('id')
              .single();
            if (insErr) throw new Error(`Error al insertar tarifa: ${insErr.message}`);
            if (t.id && nuevaTarifa?.id) {
              mapaTarifaId.set(t.id, nuevaTarifa.id);
              misTarifasPorDuracion.set(tarifaPlana.duracion_minutos, nuevaTarifa.id);
            }
          }
        }
      }

      // 2º Grupos: Consultar grupos existentes y solo añadir los nuevos
      const { data: misGruposExistentes, error: errFetchG } = await supabase
        .from('grupos')
        .select('id, id_externo, nombre_grupo')
        .eq('user_id', user.id);
      if (errFetchG) throw new Error(`Error al verificar grupos: ${errFetchG.message}`);

      const misGruposPorIdExt = new Map(
        (misGruposExistentes || []).filter(mg => mg.id_externo).map(mg => [mg.id_externo, mg.id])
      );
      const misGruposPorNombre = new Map(
        (misGruposExistentes || []).filter(mg => mg.nombre_grupo).map(mg => [mg.nombre_grupo, mg.id])
      );
      const misGruposIds = new Set((misGruposExistentes || []).map(mg => mg.id));

      if (Array.isArray(parsedData.grupos) && parsedData.grupos.length > 0) {
        for (const g of parsedData.grupos) {
          const { id: idViejo, tarifas: _t, clases: _c, user: _u, ...rest } = g;

          // Verificar si ya existe por id_externo, por nombre_grupo, o por id propio
          const idExistente = (rest.id_externo && misGruposPorIdExt.get(rest.id_externo))
            || (rest.nombre_grupo && misGruposPorNombre.get(rest.nombre_grupo))
            || (idViejo && misGruposIds.has(idViejo) ? idViejo : null);

          if (idExistente) {
            // Ya existe: no se modifica ni se añade. Se mapea para que las clases se vinculen
            if (idViejo) {
              mapaGrupoId.set(idViejo, idExistente);
            }
            continue;
          }

          // Es un grupo NUEVO: se inserta
          const targetTarifaId = (rest.tarifa_id && mapaTarifaId.has(rest.tarifa_id))
            ? mapaTarifaId.get(rest.tarifa_id)
            : (rest.tarifa_id || null);

          const payload = {
            user_id: user.id,
            nombre_grupo: rest.nombre_grupo,
            estado: rest.estado || 'activo',
            id_externo: rest.id_externo ?? null,
            fecha_inicio_grupo: rest.fecha_inicio_grupo ?? null,
            horario: rest.horario ?? null,
            link_bo: rest.link_bo ?? null,
            curso_codigo: rest.curso_codigo ?? null,
            curso_nombre: rest.curso_nombre ?? null,
            duracion_minutos: rest.duracion_minutos != null ? Number(rest.duracion_minutos) : null,
            lecciones_totales: rest.lecciones_totales != null ? Number(rest.lecciones_totales) : null,
            tarifa_id: targetTarifaId,
          };

          delete payload.id;

          const { data: nuevoG, error: insErr } = await supabase
            .from('grupos')
            .insert(payload)
            .select('id')
            .single();

          if (insErr) {
            if (insErr.code === '23505' || insErr.message?.includes('unique constraint') || insErr.message?.includes('duplicate key')) {
              // El grupo ya existe en la base de datos: lo tratamos como existente y mapeamos su id
              console.warn(`Grupo "${payload.nombre_grupo}" ya existe en la BD (omitido de inserción).`);
              const { data: existente } = await supabase
                .from('grupos')
                .select('id')
                .eq('id_externo', payload.id_externo)
                .maybeSingle();

              const idFinal = existente?.id || idViejo;
              if (idViejo && idFinal) {
                mapaGrupoId.set(idViejo, idFinal);
              }
              continue;
            }
            throw new Error(`Error al insertar grupo "${payload.nombre_grupo}": ${insErr.message}`);
          }

          if (idViejo && nuevoG?.id) {
            mapaGrupoId.set(idViejo, nuevoG.id);
            if (payload.id_externo) misGruposPorIdExt.set(payload.id_externo, nuevoG.id);
            if (payload.nombre_grupo) misGruposPorNombre.set(payload.nombre_grupo, nuevoG.id);
          }
        }
      }

      // 3º Periodos: Consultar periodos existentes por key_periodo e id
      const { data: misPeriodosExistentes, error: errFetchP } = await supabase
        .from('periodos')
        .select('id, key_periodo')
        .eq('user_id', user.id);
      if (errFetchP) throw new Error(`Error al verificar periodos: ${errFetchP.message}`);

      const misPeriodosPorKey = new Map((misPeriodosExistentes || []).map(p => [p.key_periodo, p.id]));
      const misPeriodosIds = new Set((misPeriodosExistentes || []).map(p => p.id));

      if (Array.isArray(parsedData.periodos) && parsedData.periodos.length > 0) {
        for (const p of parsedData.periodos) {
          const { clases: _c, user: _u, ...rest } = p;
          const idViejoP = rest.id;

          const keyPeriodo = rest.key_periodo || `${rest.anio}-${rest.mes}`;
          const idExistenteP = (keyPeriodo && misPeriodosPorKey.get(keyPeriodo))
            || (idViejoP && misPeriodosIds.has(idViejoP) ? idViejoP : null);

          if (idExistenteP) {
            // Ya existe: no se añade ni se modifica
            if (idViejoP) mapaPeriodoId.set(idViejoP, idExistenteP);
            continue;
          }

          // Nuevo periodo: insertar con las columnas reales del esquema
          const payloadP = {
            user_id: user.id,
            mes: String(rest.mes || ''),
            anio: String(rest.anio || ''),
            key_periodo: keyPeriodo,
            pagado_real: rest.pagado_real != null ? Number(rest.pagado_real) : 0,
            notas_reclamo: rest.notas_reclamo ?? '',
            arrastrado: rest.arrastrado != null ? Number(rest.arrastrado) : 0,
            requisitos_bono: typeof rest.requisitos_bono === 'boolean' ? rest.requisitos_bono : false,
            r1_grado: ['none', 'good', 'amazing'].includes(rest.r1_grado) ? rest.r1_grado : 'none',
            r2_grado: ['none', 'good', 'amazing'].includes(rest.r2_grado) ? rest.r2_grado : 'none',
            r3_grado: ['none', 'good', 'amazing'].includes(rest.r3_grado) ? rest.r3_grado : 'none',
          };

          delete payloadP.id;

          const { data: nuevoP, error: insPErr } = await supabase
            .from('periodos')
            .insert(payloadP)
            .select('id')
            .single();

          if (insPErr) {
            if (insPErr.code === '23505' || insPErr.message?.includes('unique constraint') || insPErr.message?.includes('duplicate key')) {
              console.warn(`Periodo "${payloadP.key_periodo}" ya existe en la BD.`);
              const { data: existenteP } = await supabase
                .from('periodos')
                .select('id')
                .eq('key_periodo', payloadP.key_periodo)
                .maybeSingle();

              const idP = existenteP?.id || idViejoP;
              if (idViejoP && idP) {
                mapaPeriodoId.set(idViejoP, idP);
              }
              continue;
            }
            throw new Error(`Error al insertar periodo "${payloadP.key_periodo}": ${insPErr.message}`);
          }

          if (idViejoP && nuevoP?.id) {
            mapaPeriodoId.set(idViejoP, nuevoP.id);
            if (payloadP.key_periodo) misPeriodosPorKey.set(payloadP.key_periodo, nuevoP.id);
          }
        }
      }

      // 4º Clases: Consultar clases existentes y solo insertar las nuevas
      if (Array.isArray(parsedData.clases) && parsedData.clases.length > 0) {
        const misClasesExistentes = await fetchAllUserRows(
          'clases',
          user.id,
          'id, grupo_id, fecha_clase, nombre_clase, es_adicional'
        );

        // 1. UUIDs existentes en la base de datos para detección directa
        const misClasesIds = new Set((misClasesExistentes || []).map(c => c.id));

        // 2. Clases regulares existentes en la BD (evita duplicar lecciones del currículo)
        const misClasesRegulares = new Set(
          (misClasesExistentes || [])
            .filter(c => !c.es_adicional)
            .map(c => `${c.grupo_id}|${c.fecha_clase}|${c.nombre_clase || ''}`)
        );

        // 3. Conteo de clases extras existentes en BD agrupadas por grupo y fecha
        const extrasDisponiblesEnDB = new Map();
        for (const c of (misClasesExistentes || []).filter(c => c.es_adicional)) {
          const key = `${c.grupo_id}|${c.fecha_clase}`;
          extrasDisponiblesEnDB.set(key, (extrasDisponiblesEnDB.get(key) || 0) + 1);
        }

        // Para evitar duplicar dentro del mismo archivo de backup (mismo UUID)
        const idsVistosEnBackup = new Set();
        const clasesToInsert = [];

        for (const c of parsedData.clases) {
          const { grupos: _g, periodos: _p, user: _u, ...rest } = c;

          // Si este ID ya fue procesado en este mismo backup, ignorar repetición
          if (rest.id && idsVistosEnBackup.has(rest.id)) continue;
          if (rest.id) idsVistosEnBackup.add(rest.id);

          const targetGrupoId = (rest.grupo_id && mapaGrupoId.has(rest.grupo_id))
            ? mapaGrupoId.get(rest.grupo_id)
            : rest.grupo_id;

          const targetPeriodoId = (rest.periodo_id && mapaPeriodoId.has(rest.periodo_id))
            ? mapaPeriodoId.get(rest.periodo_id)
            : rest.periodo_id;

          const isExtra = Boolean(rest.es_adicional ?? rest.es_extra);

          // Si ya existe por UUID exacto en la BD → omitir
          if (rest.id && misClasesIds.has(rest.id)) {
            // Descontar del conteo de extras en BD si aplica
            if (isExtra) {
              const kExtra = `${targetGrupoId}|${rest.fecha_clase}`;
              const count = extrasDisponiblesEnDB.get(kExtra) || 0;
              if (count > 0) extrasDisponiblesEnDB.set(kExtra, count - 1);
            }
            continue;
          }

          if (isExtra) {
            // Es clase EXTRA:
            // Si la BD ya contiene una clase extra en esta fecha y grupo que no tenía este UUID, la descontamos
            const kExtra = `${targetGrupoId}|${rest.fecha_clase}`;
            const countDisponibles = extrasDisponiblesEnDB.get(kExtra) || 0;
            if (countDisponibles > 0) {
              extrasDisponiblesEnDB.set(kExtra, countDisponibles - 1);
              continue; // Ya está cubierta en la BD
            }
            // Si no hay más extras disponibles en la BD para esa fecha/grupo, se debe insertar.
            // Esto permite que si hay 2 o más clases extras el mismo día en el mismo curso, se añadan todas.
          } else {
            // Es clase REGULAR (del currículo):
            // Omitir si ya existe la misma lección para ese grupo y fecha
            const claveRegular = `${targetGrupoId}|${rest.fecha_clase}|${rest.nombre_clase || ''}`;
            if (misClasesRegulares.has(claveRegular)) {
              continue;
            }
            misClasesRegulares.add(claveRegular);
          }

          const clasePayload = {
            user_id: user.id,
            grupo_id: targetGrupoId,
            periodo_id: targetPeriodoId ?? null,
            fecha_clase: rest.fecha_clase,
            estado_clase: rest.estado_clase || 'Programada',
            es_adicional: isExtra,
            fue_aplazada: typeof rest.fue_aplazada === 'boolean' ? rest.fue_aplazada : false,
            tema_clase: rest.tema_clase ?? null,
            nombre_clase: rest.nombre_clase ?? null,
            precio_cobrado: rest.precio_cobrado != null ? Number(rest.precio_cobrado) : null,
          };

          // Preservar el UUID original del backup si está presente y no existe en BD
          if (rest.id && !misClasesIds.has(rest.id)) {
            clasePayload.id = rest.id;
          }

          clasesToInsert.push(clasePayload);
        }

        const CHUNK = 100;
        for (let i = 0; i < clasesToInsert.length; i += CHUNK) {
          const chunk = clasesToInsert.slice(i, i + CHUNK);
          const { error: cErr } = await supabase.from('clases').insert(chunk);
          if (cErr) {
            // Si hubo colisión de clave única (ej. UUID en otra cuenta), reintentar sin forzar IDs
            if (cErr.code === '23505' || cErr.message?.includes('unique constraint') || cErr.message?.includes('duplicate key')) {
              const fallbackChunk = chunk.map(({ id: _dropId, ...cRest }) => cRest);
              const { error: fbErr } = await supabase.from('clases').insert(fallbackChunk);
              if (fbErr) {
                console.warn('Lote de clases omitido:', fbErr.message);
              }
              continue;
            }
            throw new Error(`Error al insertar clases (lote ${Math.floor(i / CHUNK) + 1}): ${cErr.message}`);
          }
        }
      }

      alert('¡Respaldo restaurado con éxito!');
      window.location.reload();
    } catch (err) {
      console.error('Error al restaurar backup:', err);
      alert('Error al restaurar el respaldo: ' + (err.message || 'Archivo inválido'));
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = '';
      setImportingBackup(false);
    }
  };

  // ── Zona de Peligro (Borrado Total) ───────────────────────────────────────────
  const handleDeleteAllData = async () => {
    if (confirmDeleteText !== 'CONFIRMO') return;
    setDeletingAll(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('No hay sesión de usuario activa.');

      // Orden estricto: clases → grupos → periodos → tarifas
      const { error: errClases } = await supabase
        .from('clases')
        .delete()
        .eq('user_id', user.id);
      if (errClases) throw new Error(`Error al eliminar clases: ${errClases.message}`);

      const { error: errGrupos } = await supabase
        .from('grupos')
        .delete()
        .eq('user_id', user.id);
      if (errGrupos) throw new Error(`Error al eliminar grupos: ${errGrupos.message}`);

      const { error: errPeriodos } = await supabase
        .from('periodos')
        .delete()
        .eq('user_id', user.id);
      if (errPeriodos) throw new Error(`Error al eliminar periodos: ${errPeriodos.message}`);

      const { error: errTarifas } = await supabase
        .from('tarifas')
        .delete()
        .eq('user_id', user.id);
      if (errTarifas) throw new Error(`Error al eliminar tarifas: ${errTarifas.message}`);

      alert('Todos tus datos han sido eliminados correctamente.');
      setShowDangerModal(false);
      setConfirmDeleteText('');
      window.location.reload();
    } catch (err) {
      console.error('Error al borrar todos los datos:', err);
      alert('Error durante el borrado masivo: ' + (err.message || 'Error desconocido'));
    } finally {
      setDeletingAll(false);
    }
  };

  const columns = [
    { key: 'duracion_minutos', header: 'Duración', render: (r) => `${r.duracion_minutos} min` },
    { key: 'precio_regular', header: 'Precio Regular', render: (r) => formatCurrency(r.precio_regular) },
    { key: 'precio_extra', header: 'Precio Extra', render: (r) => formatCurrency(r.precio_extra) },
    {
      key: 'actions',
      header: '',
      cellClassName: 'text-right',
      render: (r) => (
        <div className="flex gap-1.5 justify-end">
          <Button size="icon" variant="ghost" onClick={() => setModal(r)} aria-label="Editar tarifa">
            <Pencil size={13} />
          </Button>
          <Button
            size="icon"
            variant="danger"
            loading={deleting === r.id}
            onClick={() => setConfirmId(r.id)}
            aria-label="Eliminar tarifa"
          >
            <Trash2 size={13} />
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-8 animate-fade-in max-w-2xl">
      <div>
        <h1 className="text-2xl font-semibold text-zinc-900 dark:text-white">Configuración</h1>
        <p className="text-sm text-zinc-500 mt-1">Personaliza la app y gestiona tarifas</p>
      </div>

      {/* ── Cuenta activa ── */}
      {currentUser && (
        <Card>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-[var(--accent-color)]/15 flex items-center justify-center shrink-0">
              <User size={18} className="text-[var(--accent-color)]" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">Cuenta activa</p>
              <p className="text-sm font-semibold text-zinc-900 dark:text-white truncate">{currentUser.email}</p>
              <p className="text-xs text-zinc-400 font-mono truncate">{currentUser.id}</p>
            </div>
            <span className="text-xs px-2 py-1 rounded-full bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 font-medium shrink-0">Activa</span>
          </div>
        </Card>
      )}

      {/* ── Apariencia ── */}
      <Card>
        <h2 className="text-sm font-semibold text-zinc-600 dark:text-zinc-400 uppercase tracking-wider mb-5">Apariencia</h2>

        <div className="space-y-6">
          {/* Dark / Light Mode */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {mode === 'dark' ? <Moon size={18} className="text-zinc-400" /> : <Sun size={18} className="text-amber-500" />}
              <div>
                <p className="text-sm font-medium text-zinc-900 dark:text-white">Modo {mode === 'dark' ? 'oscuro' : 'claro'}</p>
                <p className="text-xs text-zinc-500">Fondo {mode === 'dark' ? '#000000' : '#FFFFFF'}</p>
              </div>
            </div>
            <Toggle
              id="toggle-dark-mode"
              checked={mode === 'dark'}
              onChange={toggleMode}
            />
          </div>

          {/* Color de acento */}
          <div>
            <p className="text-sm font-medium text-zinc-900 dark:text-white mb-1">Color de Acento</p>
            <p className="text-xs text-zinc-500 mb-3">Afecta botones, bordes activos y gráficas</p>
            <ColorPicker />
          </div>
        </div>
      </Card>

      {/* ── Importar Datos ── */}
      <Card>
        <div className="flex items-center justify-between mb-2">
          <div>
            <h2 className="text-sm font-semibold text-zinc-600 dark:text-zinc-400 uppercase tracking-wider">
              Importar Datos
            </h2>
            <p className="text-xs text-zinc-500 mt-0.5">
              Sincroniza grupos desde un archivo JSON y genera las clases automáticamente.
            </p>
          </div>
        </div>
        <button
          id="btn-abrir-importador"
          onClick={() => setShowImportModal(true)}
          className="mt-3 w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl
                     bg-[var(--accent-color)] text-white border border-transparent
                     hover:bg-transparent hover:text-[var(--accent-color)] hover:border-[var(--accent-color)]
                     outline-none focus:outline-none focus:ring-2 focus:ring-[var(--accent-color)]/30
                     font-semibold text-sm transition-all duration-200 group"
        >
          <Database size={16} className="transition-transform duration-200 group-hover:scale-110" />
          Importar datos en JSON
        </button>
      </Card>

      {/* ── Respaldo de Datos ── */}
      <Card>
        <div className="flex items-center justify-between mb-2">
          <div>
            <h2 className="text-sm font-semibold text-zinc-600 dark:text-zinc-400 uppercase tracking-wider">
              Respaldo de Datos
            </h2>
            <p className="text-xs text-zinc-500 mt-0.5">
              Descarga una copia completa en JSON o restaura un respaldo previo de tus datos.
            </p>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Button
            onClick={handleDownloadBackup}
            loading={exporting}
            id="btn-descargar-backup"
            className="w-full flex items-center justify-center gap-2 py-3 border border-[var(--accent-color)] text-[var(--accent-color)] bg-transparent hover:bg-[var(--accent-color)]/10 font-semibold text-sm transition-all duration-200"
          >
            <Download size={16} /> Descargar Backup
          </Button>

          <div>
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleRestoreBackup}
              accept=".json,application/json"
              className="hidden"
              id="input-restaurar-backup"
            />
            <Button
              onClick={() => fileInputRef.current?.click()}
              loading={importingBackup}
              id="btn-restaurar-backup"
              className="w-full flex items-center justify-center gap-2 py-3 bg-[var(--accent-color)] text-white hover:opacity-90 font-semibold text-sm transition-all duration-200"
            >
              <Upload size={16} /> Restaurar Backup
            </Button>
          </div>
        </div>
      </Card>

      {/* ── Tarifas ── */}
      <Card>
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-sm font-semibold text-zinc-600 dark:text-zinc-400 uppercase tracking-wider">Tarifas</h2>
          <Button size="sm" onClick={() => setModal('create')} id="btn-crear-tarifa">
            <Plus size={14} /> Nueva tarifa
          </Button>
        </div>
        <Table
          columns={columns}
          data={tarifas}
          loading={loading}
          emptyMessage="No hay tarifas. Crea una para poder asignarla a los grupos."
        />
      </Card>

      {/* ── Hecho con amor ── */}
      <Card>
        <div className="flex items-center gap-2 mb-4 select-none">
          <Heart size={18} className="text-[var(--accent-color)] fill-[var(--accent-color)]" />
          <h2 className="text-sm font-semibold text-zinc-600 dark:text-zinc-400 uppercase tracking-wider">
            Hecho con amor por <a className="text-[var(--accent-color)] hover:underline" href="https://github.com/Maetzu4" target="_blank" rel="noopener noreferrer">NATHAN OLMOS</a> del Team 4
          </h2>
        </div>
        <button
          onClick={() => setIsDonationModalOpen(true)}
          className="w-full py-3 px-4 bg-zinc-800/40 hover:bg-zinc-800 text-[var(--accent-color)] border-none rounded-lg transition-colors font-medium text-sm text-center"
        >
          ¿Quieres apoyar este proyecto? Haz clic aquí ☕
        </button>
      </Card>

      {/* ── Zona de Peligro ── */}
      <Card>
        <div className="flex items-center justify-between mb-2">
          <div>
            <h2 className="text-sm font-semibold text-[var(--accent-color)] uppercase tracking-wider">
              Zona de Peligro
            </h2>
            <p className="text-xs text-zinc-500 mt-0.5">
              Elimina de forma irreversible todas tus clases, grupos, periodos y tarifas asociadas a tu cuenta.
            </p>
          </div>
        </div>
        <div className="mt-4">
          <Button
            onClick={() => {
              setConfirmDeleteText('');
              setShowDangerModal(true);
            }}
            id="btn-borrar-todos-datos"
            className="w-full flex items-center justify-center gap-2 py-3 border border-[var(--accent-color)] text-[var(--accent-color)] bg-transparent hover:bg-[var(--accent-color)]/10 font-semibold text-sm transition-all duration-200"
          >
            <Trash2 size={16} /> Borrar todos mis datos
          </Button>
        </div>
      </Card>

      <Modal open={isDonationModalOpen} onClose={() => setIsDonationModalOpen(false)} title="Apoyar el proyecto">
        <div className="space-y-4 text-sm text-zinc-600 dark:text-zinc-400">
          <div>
            Si eres de Colombia, puedes apoyar este proyecto por <strong>BRE-B</strong>:
            <br />
            <div className="flex items-center gap-2 mt-2">
              <span className="bg-zinc-100 dark:bg-zinc-800/50 px-3 py-1.5 rounded-md text-sm font-mono text-[var(--accent-color)]">
                6814natsu@gmail.com
              </span>
              <Button size="sm" variant="ghost" onClick={copiarCorreo}>
                Copiar
              </Button>
            </div>
          </div>
          <div>
            Si eres de otro país también puedes apoyar por <strong>PayPal</strong>:
            <br />
            <div className="flex items-center gap-2 mt-2">
              <span className="bg-zinc-100 dark:bg-zinc-800/50 px-3 py-1.5 rounded-md text-sm font-mono text-[var(--accent-color)]">
                6814natsu@gmail.com
              </span>
              <Button size="sm" variant="ghost" onClick={copiarCorreo}>
                Copiar
              </Button>
            </div>
          </div>
          <p className="font-medium text-zinc-900 dark:text-zinc-300 pt-2 border-t border-zinc-200 dark:border-zinc-800/50">
            ¡Gracias por tu apoyo para mantener este proyecto de código abierto!
          </p>
        </div>
      </Modal>

      {/* ── Logout (Mobile Alternative) ── */}
      <div className="md:hidden pt-4 pb-8">
        <Button
          variant="danger"
          className="w-full"
          onClick={() => setShowLogoutConfirm(true)}
        >
          <LogOut size={16} /> Cerrar Sesión
        </Button>
      </div>

      {/* Modal Importador */}
      <Modal
        open={showImportModal}
        onClose={() => setShowImportModal(false)}
        title="Importar Grupos"
        size="full"
      >
        <ImportadorJSON />
      </Modal>

      {/* Modal Tarifa */}
      <Modal
        open={!!modal}
        onClose={() => setModal(null)}
        title={modal === 'create' ? 'Nueva Tarifa' : 'Editar Tarifa'}
        size="sm"
      >
        <TarifaForm
          initial={modal !== 'create' ? modal : undefined}
          onSubmit={handleSubmit}
          onCancel={() => setModal(null)}
        />
      </Modal>

      {/* ConfirmDialog eliminar tarifa */}
      <ConfirmDialog
        open={!!confirmId}
        title="Eliminar tarifa"
        message="¿Eliminar esta tarifa? Los grupos que la usen perderán la referencia de precio."
        confirmText="Eliminar"
        onConfirm={handleDeleteConfirm}
        onCancel={() => setConfirmId(null)}
        destructive
      />

      {/* ConfirmDialog Logout */}
      <ConfirmDialog
        open={showLogoutConfirm}
        title="Cerrar Sesión"
        message="¿Estás seguro de que deseas salir?"
        confirmText="Salir"
        onConfirm={() => supabase.auth.signOut()}
        onCancel={() => setShowLogoutConfirm(false)}
        destructive
      />

      {/* Modal Confirmación Borrado Total (Zona de Peligro) */}
      <Modal
        open={showDangerModal}
        onClose={() => {
          if (!deletingAll) {
            setShowDangerModal(false);
            setConfirmDeleteText('');
          }
        }}
        title="Zona de Peligro"
        size="sm"
      >
        <div className="space-y-4">
          <p className="text-sm text-zinc-600 dark:text-zinc-300">
            Esta acción es irreversible y eliminará permanentemente todas tus <strong>clases</strong>, <strong>grupos</strong>, <strong>periodos</strong> y <strong>tarifas</strong> asociadas a tu cuenta.
          </p>

          <div>
            <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">
              Para confirmar, escribe <strong className="text-[var(--accent-color)] font-mono">CONFIRMO</strong> en el recuadro:
            </label>
            <input
              type="text"
              value={confirmDeleteText}
              onChange={(e) => setConfirmDeleteText(e.target.value)}
              placeholder="CONFIRMO"
              disabled={deletingAll}
              className="w-full h-10 px-3 text-sm rounded-lg bg-white dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 text-zinc-900 dark:text-white placeholder:text-zinc-400 focus:outline-none focus:border-[var(--accent-color)] focus:ring-1 focus:ring-[var(--accent-color)]/30 font-mono"
            />
          </div>

          <div className="flex justify-end gap-3 pt-3 border-t border-zinc-200 dark:border-zinc-800">
            <Button
              type="button"
              variant="ghost"
              onClick={() => {
                setShowDangerModal(false);
                setConfirmDeleteText('');
              }}
              disabled={deletingAll}
            >
              Cancelar
            </Button>
            <Button
              type="button"
              onClick={handleDeleteAllData}
              disabled={confirmDeleteText !== 'CONFIRMO' || deletingAll}
              loading={deletingAll}
              id="btn-confirmar-borrado-total"
              className="bg-[var(--accent-color)] text-white hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed font-semibold text-sm"
            >
              Borrar definitivamente
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
