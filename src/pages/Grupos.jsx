import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Plus, ExternalLink, Pencil, Trash2, Search, SlidersHorizontal } from 'lucide-react';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';
import { Table } from '../components/ui/Table';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { Modal } from '../components/ui/Modal';
import { Toast } from '../components/ui/Toast';
import { GrupoDetailModal } from '../components/ui/GrupoDetailModal';
import { GrupoForm } from '../components/forms/GrupoForm';
import { GestionarExtrasModal } from '../components/modals/GestionarExtrasModal';
import { useGrupos } from '../hooks/useGrupos';
import { useTarifas } from '../hooks/useTarifas';

// ── Vista Principal ────────────────────────────────────────────────────────────
export default function Grupos() {
  const { t } = useTranslation();
  const { grupos, loading, createGrupo, updateGrupo, deleteGrupo } = useGrupos();
  const { tarifas } = useTarifas();

  const [modal,              setModal]              = useState(null);   // null | 'create' | grupo (para editar)
  const [detalle,            setDetalle]            = useState(null);   // grupo para modal de detalle
  const [deleting,           setDeleting]           = useState(null);
  const [search,             setSearch]             = useState('');
  const [confirmId,          setConfirmId]          = useState(null);
  const [showGestionExtras,  setShowGestionExtras]  = useState(false);
  const [toastWarning,       setToastWarning]       = useState(null);

  const gruposFiltrados = grupos
    .filter((g) => {
      if (!search.trim()) return true;
      const q = search.trim().toLowerCase();
      const nombre = (g.nombre_grupo ?? '').toLowerCase();
      const idExterno = (g.id_externo ?? '').toLowerCase();
      const horario = (g.horario ?? '').toLowerCase();
      const estado = (g.estado ?? '').toLowerCase();

      return (
        nombre.includes(q) ||
        idExterno.includes(q) ||
        horario.includes(q) ||
        estado.includes(q)
      );
    })
    .slice()
    .sort((a, b) => {
      const fa = a.fecha_inicio_grupo ?? '';
      const fb = b.fecha_inicio_grupo ?? '';
      return fa.localeCompare(fb);
    });

  const openCreate = () => {
    if (!tarifas || tarifas.length === 0) {
      setToastWarning(t('grupos.toastTarifaRequired', 'Debes crear al menos una Tarifa en la Configuración antes de crear grupos'));
      return;
    }
    setModal('create');
  };

  const handleOpenGestionExtras = () => {
    setShowGestionExtras(true);
  };
  const openEdit   = (g) => setModal(g);
  const closeModal = () => setModal(null);

  const handleSubmit = async (values) => {
    if (modal === 'create') await createGrupo(values);
    else await updateGrupo(modal.id, values);
    closeModal();
  };

  const handleDeleteConfirm = async () => {
    if (!confirmId) return;
    setDeleting(confirmId);
    setConfirmId(null);
    try { await deleteGrupo(confirmId); } finally { setDeleting(null); }
  };

  const columns = [
    {
      key: 'nombre_grupo',
      header: t('grupos.group', 'Grupo'),
      render: (r) => (
        <div className="flex items-center gap-2">
          <span className="font-medium text-zinc-900 dark:text-white">{r.nombre_grupo ?? '—'}</span>
          {r.id_externo?.includes('PRM') && (
            <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold border border-[var(--accent-color)] text-[var(--accent-color)] bg-[var(--accent-color)]/10">
              PRM
            </span>
          )}
        </div>
      ),
    },
    {
      key: 'horario',
      header: t('grupos.schedule', 'Horario'),
      render: (r) => r.horario ?? <span className="text-zinc-400 italic">—</span>,
    },
    {
      key: 'estado',
      header: t('grupos.status', 'Estado'),
      render: (r) => (
        <Badge variant={r.estado}>
          {r.estado === 'activo' ? t('grupos.active', 'Activo')
            : r.estado === 'finalizado' ? t('grupos.finished', 'Finalizado')
            : r.estado === 'archivado' ? t('grupos.archived', 'Archivado')
            : r.estado ?? '—'}
        </Badge>
      ),
    },
    {
      key: 'lecciones_totales',
      header: t('grupos.lessons', 'Lecciones'),
      render: (r) => r.lecciones_totales ?? <span className="text-zinc-400 italic">—</span>,
    },
    {
      key: 'link_bo',
      header: t('grupos.link', 'Enlace'),
      render: (r) => r.link_bo
        ? (
          <a
            href={r.link_bo}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1 text-[var(--accent-color)] hover:underline text-xs"
            onClick={(e) => e.stopPropagation()}
          >
            {t('grupos.view', 'Ver')} <ExternalLink size={11} />
          </a>
        )
        : <span className="text-zinc-400 italic">—</span>,
    },
    {
      key: 'actions',
      header: '',
      cellClassName: 'text-right',
      render: (r) => (
        <div className="flex gap-1.5 justify-end" onClick={(e) => e.stopPropagation()}>
          <Button size="icon" variant="ghost" onClick={() => openEdit(r)} aria-label={t('clases.edit', 'Editar')}>
            <Pencil size={14} />
          </Button>
          <Button
            size="icon"
            variant="danger"
            loading={deleting === r.id}
            onClick={() => setConfirmId(r.id)}
            aria-label={t('clases.delete', 'Eliminar')}
          >
            <Trash2 size={14} />
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col md:flex-row md:items-center gap-3 justify-between">
        {/* Título — solo desktop */}
        <div className="hidden md:block">
          <h1 className="text-2xl font-semibold text-zinc-900 dark:text-white">{t('grupos.title', 'Grupos')}</h1>
          <p className="text-sm text-zinc-500 mt-1">
            {t('grupos.subtitle', '{{filtered}} de {{total}} grupos', { filtered: gruposFiltrados.length, total: grupos.length })}
          </p>
        </div>

        {/* Fila principal: búsqueda y nuevo grupo en la misma fila con flex gap-2 en móvil */}
        <div className="flex items-center gap-2 w-full md:w-auto">
          {/* Barra de búsqueda con contador flotante dentro */}
          <div className="relative flex-1 md:w-56">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400 pointer-events-none" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t('grupos.searchPlaceholder', 'Buscar grupo…')}
              className="w-full h-9 pl-9 pr-14 text-sm rounded-xl bg-white dark:bg-white/5 border border-zinc-200 dark:border-white/10 text-zinc-900 dark:text-white placeholder:text-zinc-400 dark:placeholder:text-zinc-500 focus:outline-none focus:border-[var(--accent-color)] focus:ring-1 focus:ring-[var(--accent-color)]/30 transition-all duration-200"
            />
            {/* Contador flotante a la derecha dentro del input */}
            <span className="text-[10px] text-zinc-400 dark:text-zinc-500 absolute right-3 top-2.5 tabular-nums pointer-events-none font-medium">
              {gruposFiltrados.length}/{grupos.length}
            </span>
          </div>

          {/* Gestionar Extras — compacto en móvil (solo icono), texto en desktop */}
          <Button
            variant="secondary"
            onClick={handleOpenGestionExtras}
            id="btn-gestionar-extras"
            className="!h-9 px-3 shrink-0 text-xs shadow-sm"
            title={t('grupos.manageExtras', 'Gestionar Extras')}
          >
            <SlidersHorizontal size={14} />
            <span className="hidden sm:inline ml-1">{t('grupos.manageExtras', 'Gestionar Extras')}</span>
          </Button>

          {/* Nuevo Grupo — compacto en móvil (+ icono), texto en desktop */}
          <Button
            onClick={openCreate}
            id="btn-crear-grupo"
            className="!h-9 px-3 shrink-0 shadow-sm text-xs"
            title={t('grupos.newGroup', 'Nuevo Grupo')}
          >
            <Plus size={16} />
            <span className="hidden sm:inline ml-1">{t('grupos.newGroup', 'Nuevo Grupo')}</span>
          </Button>
        </div>
      </div>

      {/* Tabla — clic en fila abre modal de detalle */}
      <Table
        columns={columns}
        data={gruposFiltrados}
        loading={loading}
        emptyMessage={
          search.trim()
            ? t('grupos.noResults', 'Sin resultados para la búsqueda')
            : t('grupos.noGroups', 'No hay grupos. Crea uno con el botón de arriba.')
        }
        onRowClick={(g) => setDetalle(g)}
      />

      {/* Modal de detalle de clases (clic en fila) */}
      <GrupoDetailModal
        grupo={detalle}
        open={!!detalle}
        onClose={() => setDetalle(null)}
        onEdit={(g) => { setDetalle(null); openEdit(g); }}
      />

      {/* Modal Gestor de Clases Extras */}
      <GestionarExtrasModal
        isOpen={showGestionExtras}
        onClose={() => setShowGestionExtras(false)}
      />

      {/* Modal Crear / Editar */}
      <Modal
        open={!!modal}
        onClose={closeModal}
        title={modal === 'create' ? t('grupos.newGroup', 'Nuevo Grupo') : t('grupos.editTitle', 'Editar — {{name}}', { name: modal?.nombre_grupo })}
      >
        <GrupoForm
          initial={modal !== 'create' ? modal : undefined}
          onSubmit={handleSubmit}
          onCancel={closeModal}
        />
      </Modal>

      {/* ConfirmDialog eliminar */}
      <ConfirmDialog
        open={!!confirmId}
        title={t('grupos.deleteTitle', 'Eliminar grupo')}
        message={t('grupos.deleteMessage', 'Se eliminará el grupo permanentemente. Los datos de clases asociadas se perderán.')}
        confirmText={t('clases.delete', 'Eliminar')}
        onConfirm={handleDeleteConfirm}
        onCancel={() => setConfirmId(null)}
        destructive
      />

      {/* Toast de advertencia / flujo */}
      <Toast message={toastWarning} onClose={() => setToastWarning(null)} />
    </div>
  );
}
