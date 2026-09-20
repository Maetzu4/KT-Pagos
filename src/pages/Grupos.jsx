import { useState } from 'react';
import { Plus, ExternalLink, MessageCircle, Pencil, Trash2, Search } from 'lucide-react';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';
import { Table } from '../components/ui/Table';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { Modal } from '../components/ui/Modal';
import { GrupoDetailModal } from '../components/ui/GrupoDetailModal';
import { GrupoForm } from '../components/forms/GrupoForm';
import { useGrupos } from '../hooks/useGrupos';
import { useTarifas } from '../hooks/useTarifas';
import { formatDate } from '../lib/dateUtils';
import { formatCurrency } from '../lib/utils';

// ── Vista Principal ────────────────────────────────────────────────────────────
export default function Grupos() {
  const { grupos, loading, createGrupo, updateGrupo, deleteGrupo } = useGrupos();
  const { tarifas } = useTarifas();

  const [modal,      setModal]      = useState(null);   // null | 'create' | grupo (para editar)
  const [detalle,    setDetalle]    = useState(null);   // grupo para modal de detalle
  const [deleting,   setDeleting]   = useState(null);
  const [search,     setSearch]     = useState('');
  const [confirmId,  setConfirmId]  = useState(null);

  const gruposFiltrados = search.trim()
    ? grupos.filter((g) =>
        g.nombre_grupo?.toLowerCase().includes(search.trim().toLowerCase())
      )
    : grupos;

  const openCreate = () => setModal('create');
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
    { key: 'nombre_grupo', header: 'Nombre' },
    {
      key: 'estado',
      header: 'Estado',
      render: (r) => (
        <Badge variant={r.estado}>{r.estado === 'activo' ? 'Activo' : r.estado === 'finalizado' ? 'Finalizado' : '—'}</Badge>
      ),
    },
    {
      key: 'tarifa',
      header: 'Tarifa',
      render: (r) => r.tarifas
        ? `${r.tarifas.duracion_minutos} min`
        : '—',
    },
    { key: 'fecha_inicio',       header: 'Inicio',    render: (r) => formatDate(r.fecha_inicio) },
    { key: 'cantidad_lecciones', header: 'Lecciones' },
    {
      key: 'actions',
      header: '',
      cellClassName: 'text-right',
      render: (r) => (
        <div className="flex gap-1.5 justify-end" onClick={(e) => e.stopPropagation()}>
          <Button size="icon" variant="ghost" onClick={() => openEdit(r)} aria-label="Editar">
            <Pencil size={14} />
          </Button>
          <Button
            size="icon"
            variant="danger"
            loading={deleting === r.id}
            onClick={() => setConfirmId(r.id)}
            aria-label="Eliminar"
          >
            <Trash2 size={14} />
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center gap-4 justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-zinc-900 dark:text-white">Grupos</h1>
          <p className="text-sm text-zinc-500 mt-1">
            {gruposFiltrados.length} de {grupos.length} grupos
          </p>
        </div>
        <div className="flex items-center gap-3">
          {/* Barra de búsqueda */}
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar grupo…"
              className="w-52 h-9 pl-9 pr-3 text-sm rounded-lg bg-white dark:bg-white/5 border border-zinc-300 dark:border-white/10 text-zinc-900 dark:text-white placeholder:text-zinc-400 dark:placeholder:text-zinc-500 focus:outline-none focus:border-[var(--accent-color)] focus:ring-1 focus:ring-[var(--accent-color)]/30 transition-all duration-200"
            />
          </div>
          <Button onClick={openCreate} id="btn-crear-grupo">
            <Plus size={16} /> Nuevo Grupo
          </Button>
        </div>
      </div>

      {/* Tabla — clic en fila abre modal de detalle */}
      <Table
        columns={columns}
        data={gruposFiltrados}
        loading={loading}
        emptyMessage={search ? `Sin resultados para "${search}"` : 'No hay grupos. Crea uno con el botón de arriba.'}
        onRowClick={(g) => setDetalle(g)}
      />

      {/* Modal de detalle (clic en fila) */}
      <GrupoDetailModal
        grupo={detalle}
        open={!!detalle}
        onClose={() => setDetalle(null)}
        onEdit={openEdit}
      />

      {/* Modal Crear / Editar */}
      <Modal
        open={!!modal}
        onClose={closeModal}
        title={modal === 'create' ? 'Nuevo Grupo' : `Editar — ${modal?.nombre_grupo}`}
      >
        <GrupoForm
          initial={modal !== 'create' ? modal : undefined}
          tarifas={tarifas}
          onSubmit={handleSubmit}
          onCancel={closeModal}
        />
      </Modal>

      {/* ConfirmDialog eliminar */}
      <ConfirmDialog
        open={!!confirmId}
        title="Eliminar grupo"
        message="Se eliminará el grupo permanentemente. Los datos de clases asociadas se perderán."
        confirmText="Eliminar"
        onConfirm={handleDeleteConfirm}
        onCancel={() => setConfirmId(null)}
        destructive
      />
    </div>
  );
}
