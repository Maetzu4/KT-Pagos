import { useState } from 'react';
import { Plus, Pencil, Trash2, Sun, Moon, LogOut, Heart } from 'lucide-react';
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
  const [form,   setForm]   = useState({ ...DEFAULT_TARIFA, ...initial });
  const [saving, setSaving] = useState(false);
  const [error,  setError]  = useState('');

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
        precio_regular:   parseFloat(form.precio_regular),
        precio_extra:     parseFloat(form.precio_extra),
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

  const [modal,    setModal]    = useState(null); // null | 'create' | tarifa
  const [deleting, setDeleting] = useState(null);
  const [confirmId, setConfirmId] = useState(null);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

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

  const columns = [
    { key: 'duracion_minutos', header: 'Duración', render: (r) => `${r.duracion_minutos} min` },
    { key: 'precio_regular',   header: 'Precio Regular', render: (r) => formatCurrency(r.precio_regular) },
    { key: 'precio_extra',     header: 'Precio Extra',   render: (r) => formatCurrency(r.precio_extra) },
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
        <div className="flex items-center gap-2 mb-4">
          <Heart size={18} className="text-red-500 fill-red-500" />
          <h2 className="text-sm font-semibold text-zinc-600 dark:text-zinc-400 uppercase tracking-wider">
            Hecho con amor por <a href="https://github.com/maetzu4" target="_blank" rel="noopener noreferrer" className="text-[var(--accent-color)] hover:underline">Natan Olmos</a>
          </h2>
        </div>
        <div className="space-y-3 text-sm text-zinc-600 dark:text-zinc-400">
          <p>
            Si eres de Colombia, puedes apoyar este proyecto por <strong>Breve</strong>. Mi llave es: <span className="font-mono bg-zinc-100 dark:bg-zinc-800 px-1 py-0.5 rounded text-[var(--accent-color)]">6814natsu@gmail.com</span>
          </p>
          <p>
            Si eres del extranjero, puedes apoyarme vía <strong>PayPal</strong> a: <span className="font-mono bg-zinc-100 dark:bg-zinc-800 px-1 py-0.5 rounded text-[var(--accent-color)]">6814natsu@gmail.com</span>
          </p>
          <p className="font-medium text-zinc-900 dark:text-zinc-300 mt-2">
            ¡Gracias por tu apoyo para mantener este proyecto de código abierto!
          </p>
        </div>
      </Card>

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

      {/* ── Modal Tarifa ── */}
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
    </div>
  );
}
