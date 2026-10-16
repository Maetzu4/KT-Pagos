import { useState } from 'react';
import { Plus, ExternalLink, Pencil, Trash2, Search, SlidersHorizontal } from 'lucide-react';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';
import { Table } from '../components/ui/Table';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { Modal } from '../components/ui/Modal';
import { CustomSelect } from '../components/ui/CustomSelect';
import { GrupoDetailModal } from '../components/ui/GrupoDetailModal';
import { GrupoForm } from '../components/forms/GrupoForm';
import { GestionarExtrasModal } from '../components/modals/GestionarExtrasModal';
import { useGrupos } from '../hooks/useGrupos';

const ESTADO_OPTIONS = [
  { value: 'Todos', label: 'Todos' },
  { value: 'Activo', label: 'Activo' },
  { value: 'Archivado', label: 'Archivado' },
];

// ── Vista Principal ────────────────────────────────────────────────────────────
export default function Grupos() {
  const { grupos, loading, createGrupo, updateGrupo, deleteGrupo } = useGrupos();

  const [modal,              setModal]              = useState(null);   // null | 'create' | grupo (para editar)
  const [detalle,            setDetalle]            = useState(null);   // grupo para modal de detalle
  const [deleting,           setDeleting]           = useState(null);
  const [search,             setSearch]             = useState('');
  const [filtroEstado,       setFiltroEstado]       = useState('Todos');
  const [confirmId,          setConfirmId]          = useState(null);
  const [showGestionExtras,  setShowGestionExtras]  = useState(false);

  const gruposFiltrados = grupos
    .filter((g) => {
      // Filtro por estado
      if (filtroEstado === 'Activo' && g.estado?.toLowerCase() !== 'activo') {
        return false;
      }
      if (filtroEstado === 'Archivado') {
        const est = g.estado?.toLowerCase();
        if (est !== 'archivado' && est !== 'finalizado') {
          return false;
        }
      }
      // Filtro por búsqueda de texto
      if (search.trim()) {
        const q = search.trim().toLowerCase();
        if (!g.nombre_grupo?.toLowerCase().includes(q)) {
          return false;
        }
      }
      return true;
    })
    .slice()
    .sort((a, b) => {
      const fa = a.fecha_inicio_grupo ?? '';
      const fb = b.fecha_inicio_grupo ?? '';
      return fa.localeCompare(fb);
    });

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
    {
      key: 'nombre_grupo',
      header: 'Grupo',
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
      header: 'Horario',
      render: (r) => r.horario ?? <span className="text-zinc-400 italic">—</span>,
    },
    {
      key: 'estado',
      header: 'Estado',
      render: (r) => (
        <Badge variant={r.estado}>
          {r.estado === 'activo' ? 'Activo'
            : r.estado === 'finalizado' ? 'Finalizado'
            : r.estado ?? '—'}
        </Badge>
      ),
    },
    {
      key: 'lecciones_totales',
      header: 'Lecciones',
      render: (r) => r.lecciones_totales ?? <span className="text-zinc-400 italic">—</span>,
    },
    {
      key: 'link_bo',
      header: 'Enlace',
      render: (r) => r.link_bo
        ? (
          <a
            href={r.link_bo}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1 text-[var(--accent-color)] hover:underline text-xs"
            onClick={(e) => e.stopPropagation()}
          >
            Ver <ExternalLink size={11} />
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
        <div className="flex flex-wrap items-center gap-3">
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
          {/* Filtro por estado */}
          <div className="w-36">
            <CustomSelect
              value={filtroEstado}
              onChange={setFiltroEstado}
              options={ESTADO_OPTIONS}
              placeholder="Estado"
              className="!h-9"
            />
          </div>
          <Button
            variant="secondary"
            onClick={() => setShowGestionExtras(true)}
            id="btn-gestionar-extras"
          >
            <SlidersHorizontal size={15} /> Gestionar Extras
          </Button>
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
        emptyMessage={
          search || filtroEstado !== 'Todos'
            ? 'Sin resultados para los filtros aplicados'
            : 'No hay grupos. Crea uno con el botón de arriba.'
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
        title={modal === 'create' ? 'Nuevo Grupo' : `Editar — ${modal?.nombre_grupo}`}
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
