import { useState } from 'react';
import { Plus, ExternalLink, MessageCircle, Pencil, Trash2, ChevronDown, ChevronUp, Search } from 'lucide-react';
import { Table } from '../components/ui/Table';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { Modal } from '../components/ui/Modal';
import { GrupoForm } from '../components/forms/GrupoForm';
import { useGrupos } from '../hooks/useGrupos';
import { useTarifas } from '../hooks/useTarifas';
import { formatDate } from '../lib/dateUtils';

export default function Grupos() {
  const { grupos, loading, createGrupo, updateGrupo, deleteGrupo } = useGrupos();
  const { tarifas } = useTarifas();

  const [modal, setModal]       = useState(null);
  const [expanded, setExpanded] = useState(null);
  const [deleting, setDeleting] = useState(null);
  const [search, setSearch]     = useState('');

  const gruposFiltrados = search.trim()
    ? grupos.filter((g) =>
        g.nombre_grupo?.toLowerCase().includes(search.trim().toLowerCase())
      )
    : grupos;

  const openCreate = () => setModal('create');
  const openEdit   = (g) => setModal(g);
  const closeModal = () => setModal(null);

  const toggleExpand = (id) => setExpanded((prev) => (prev === id ? null : id));

  const handleSubmit = async (values) => {
    if (modal === 'create') await createGrupo(values);
    else await updateGrupo(modal.id, values);
    closeModal();
  };

  const handleDelete = async (id) => {
    setDeleting(id);
    try { await deleteGrupo(id); } finally { setDeleting(null); }
  };

  const columns = [
    {
      key: 'expand',
      header: '',
      cellClassName: 'w-8',
      render: (r) => (
        <button
          onClick={(e) => { e.stopPropagation(); toggleExpand(r.id); }}
          className="text-zinc-500 hover:text-white transition-colors"
          aria-label="Ver detalles"
        >
          {expanded === r.id ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </button>
      ),
    },
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
    { key: 'fecha_inicio',      header: 'Inicio',    render: (r) => formatDate(r.fecha_inicio) },
    { key: 'cantidad_lecciones', header: 'Lecciones' },
    {
      key: 'actions',
      header: '',
      cellClassName: 'text-right',
      render: (r) => (
        <div className="flex gap-2 justify-end" onClick={(e) => e.stopPropagation()}>
          <Button size="icon" variant="ghost" onClick={() => openEdit(r)} aria-label="Editar">
            <Pencil size={14} />
          </Button>
          <Button
            size="icon"
            variant="danger"
            loading={deleting === r.id}
            onClick={() => handleDelete(r.id)}
            aria-label="Eliminar"
          >
            <Trash2 size={14} />
          </Button>
        </div>
      ),
    },
  ];

  // Renderizar fila expandida con links
  const renderExpandedRow = (grupo) => {
    if (expanded !== grupo.id) return null;
    return (
      <tr key={`exp-${grupo.id}`} className="bg-white/2 animate-slide-up">
        <td colSpan={columns.length} className="px-6 py-4">
          <div className="flex flex-wrap gap-3 items-center">
            <span className="text-xs text-zinc-500">Accesos rápidos:</span>
            {grupo.link_backoffice ? (
              <a href={grupo.link_backoffice} target="_blank" rel="noopener noreferrer">
                <Button size="sm" variant="ghost" id={`btn-backoffice-${grupo.id}`}>
                  <ExternalLink size={13} /> Backoffice
                </Button>
              </a>
            ) : (
              <span className="text-xs text-zinc-600">Sin link de backoffice</span>
            )}
            {grupo.link_whatsapp ? (
              <a href={grupo.link_whatsapp} target="_blank" rel="noopener noreferrer">
                <Button size="sm" variant="ghost" id={`btn-whatsapp-${grupo.id}`}>
                  <MessageCircle size={13} /> WhatsApp
                </Button>
              </a>
            ) : (
              <span className="text-xs text-zinc-600">Sin link de WhatsApp</span>
            )}
            {grupo.tarifas && (
              <span className="ml-auto text-xs text-zinc-500 font-mono">
                Regular: ${grupo.tarifas.precio_regular} · Extra: ${grupo.tarifas.precio_extra}
              </span>
            )}
          </div>
        </td>
      </tr>
    );
  };

  // Inyectar filas expandidas manualmente después de cada fila
  const flatData = grupos.flatMap((g) => [g, ...(expanded === g.id ? ['__expanded__' + g.id] : [])]);

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center gap-4 justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-white">Grupos</h1>
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
              className="w-52 h-9 pl-9 pr-3 text-sm rounded-lg bg-white/5 border border-white/10 text-white placeholder:text-zinc-500 focus:outline-none focus:border-[var(--accent-color)] focus:ring-1 focus:ring-[var(--accent-color)]/30 transition-all duration-200"
            />
          </div>
          <Button onClick={openCreate} id="btn-crear-grupo">
            <Plus size={16} /> Nuevo Grupo
          </Button>
        </div>
      </div>

      {/* Tabla con soporte a filas expandidas */}
      <div className="overflow-x-auto rounded-xl border border-white/8">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-white/8 bg-white/3">
              {columns.map((col) => (
                <th key={col.key} className="px-4 py-3 text-left text-xs font-medium text-zinc-500 uppercase tracking-wider">
                  {col.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={columns.length} className="py-12 text-center">
                  <div className="w-6 h-6 border-2 border-[var(--accent)] border-t-transparent rounded-full animate-spin mx-auto" />
                </td>
              </tr>
            ) : gruposFiltrados.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="py-12 text-center text-zinc-500">
                  {search ? `Sin resultados para "${search}"` : 'No hay grupos. Crea uno con el botón de arriba.'}
                </td>
              </tr>
            ) : (
              gruposFiltrados.flatMap((g) => [
                <tr
                  key={g.id}
                  className="border-b border-white/5 last:border-0 hover:bg-white/[0.04] transition-all duration-200 ease-in-out"
                >
                  {columns.map((col) => (
                    <td key={col.key} className={`px-4 py-3 text-zinc-200 ${col.cellClassName ?? ''}`}>
                      {col.render ? col.render(g) : g[col.key] ?? '—'}
                    </td>
                  ))}
                </tr>,
                expanded === g.id ? renderExpandedRow(g) : null,
              ])
            )}
          </tbody>
        </table>
      </div>

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
    </div>
  );
}
