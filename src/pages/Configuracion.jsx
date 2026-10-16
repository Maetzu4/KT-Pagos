import { useState, useRef } from 'react';
import { Plus, Pencil, Trash2, Sun, Moon, LogOut, Heart, Database, Download, Upload } from 'lucide-react';
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

  // Estados de Respaldo y Zona de Peligro
  const [exporting, setExporting] = useState(false);
  const [importingBackup, setImportingBackup] = useState(false);
  const [showDangerModal, setShowDangerModal] = useState(false);
  const [confirmDeleteText, setConfirmDeleteText] = useState('');
  const [deletingAll, setDeletingAll] = useState(false);
  const fileInputRef = useRef(null);

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

  // ── Sistema de Backup ────────────────────────────────────────────────────────
  const handleDownloadBackup = async () => {
    setExporting(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('No hay sesión de usuario activa.');

      const [
        { data: tarifasData, error: errT },
        { data: gruposData, error: errG },
        { data: periodosData, error: errP },
        { data: clasesData, error: errC },
      ] = await Promise.all([
        supabase.from('tarifas').select('*').eq('user_id', user.id),
        supabase.from('grupos').select('*').eq('user_id', user.id),
        supabase.from('periodos').select('*').eq('user_id', user.id),
        supabase.from('clases').select('*').eq('user_id', user.id),
      ]);

      if (errT) throw new Error(`Error en tarifas: ${errT.message}`);
      if (errG) throw new Error(`Error en grupos: ${errG.message}`);
      if (errP) throw new Error(`Error en periodos: ${errP.message}`);
      if (errC) throw new Error(`Error en clases: ${errC.message}`);

      const backupObj = {
        version: 2,
        fecha: new Date().toISOString(),
        user_id: user.id,
        tarifas: tarifasData || [],
        grupos: gruposData || [],
        periodos: periodosData || [],
        clases: clasesData || [],
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
      const data = JSON.parse(text);

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('No hay sesión de usuario activa.');

      // Inserción estricta en orden para evitar errores de llaves foráneas:
      // 1º Tarifas
      if (Array.isArray(data.tarifas) && data.tarifas.length > 0) {
        const cleanTarifas = data.tarifas.map((t) => ({
          ...t,
          user_id: user.id,
        }));
        const { error: tErr } = await supabase.from('tarifas').upsert(cleanTarifas);
        if (tErr) throw new Error(`Error al restaurar tarifas: ${tErr.message}`);
      }

      // 2º Grupos
      if (Array.isArray(data.grupos) && data.grupos.length > 0) {
        const cleanGrupos = data.grupos.map((g) => {
          const { tarifas: _t, clases: _c, ...rest } = g;
          return {
            ...rest,
            user_id: user.id,
          };
        });
        const { error: gErr } = await supabase.from('grupos').upsert(cleanGrupos);
        if (gErr) throw new Error(`Error al restaurar grupos: ${gErr.message}`);
      }

      // 3º Periodos
      if (Array.isArray(data.periodos) && data.periodos.length > 0) {
        const cleanPeriodos = data.periodos.map((p) => {
          const { clases: _c, ...rest } = p;
          return {
            ...rest,
            user_id: user.id,
          };
        });
        const { error: pErr } = await supabase.from('periodos').upsert(cleanPeriodos);
        if (pErr) throw new Error(`Error al restaurar periodos: ${pErr.message}`);
      }

      // 4º Clases
      if (Array.isArray(data.clases) && data.clases.length > 0) {
        const cleanClases = data.clases.map((c) => {
          const { grupos: _g, periodos: _p, ...rest } = c;
          return {
            ...rest,
            user_id: user.id,
          };
        });
        // Upsert en lotes para garantizar estabilidad
        for (let i = 0; i < cleanClases.length; i += 100) {
          const chunk = cleanClases.slice(i, i + 100);
          const { error: cErr } = await supabase.from('clases').upsert(chunk);
          if (cErr) throw new Error(`Error al restaurar clases (lote ${i / 100 + 1}): ${cErr.message}`);
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
