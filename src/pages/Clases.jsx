import { useState } from 'react';
import { Plus, Pencil, Trash2, ExternalLink, Search } from 'lucide-react';
import { Table } from '../components/ui/Table';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { Modal } from '../components/ui/Modal';
import { CustomSelect } from '../components/ui/CustomSelect';
import { ClaseForm } from '../components/forms/ClaseForm';
import { useClases } from '../hooks/useClases';
import { useGrupos } from '../hooks/useGrupos';
import { usePeriodos } from '../hooks/usePeriodos';
import { formatDate } from '../lib/dateUtils';
import { formatCurrency } from '../lib/utils';

export default function Clases() {
  const { periodos, getOrCreatePeriodo } = usePeriodos();
  const { grupos } = useGrupos();

  const [filtroGrupo,   setFiltroGrupo]   = useState('');
  const [filtroPeriodo, setFiltroPeriodo] = useState('');
  const [search,        setSearch]        = useState('');
  const [modal,         setModal]         = useState(null);
  const [deleting,      setDeleting]      = useState(null);

  const { clases, loading, createClase, updateClase, deleteClase, toggleReclamo } =
    useClases({ grupo_id: filtroGrupo || undefined, periodo_id: filtroPeriodo || undefined });

  // Filtro de búsqueda de texto libre
  const clasesFiltradas = search.trim()
    ? clases.filter((c) => {
        const q = search.trim().toLowerCase();
        return (
          c.nombre_clase?.toLowerCase().includes(q) ||
          c.grupos?.nombre_grupo?.toLowerCase().includes(q) ||
          c.periodos?.nombre_periodo?.toLowerCase().includes(q)
        );
      })
    : clases;

  const openCreate = () => setModal('create');
  const openEdit   = (c) => setModal(c);
  const closeModal = () => setModal(null);

  const handleSubmit = async (values) => {
    if (modal === 'create') await createClase(values, getOrCreatePeriodo);
    else await updateClase(modal.id, values);
    closeModal();
  };

  const handleDelete = async (id) => {
    if (!confirm('¿Eliminar esta clase?')) return;
    setDeleting(id);
    try { await deleteClase(id); } finally { setDeleting(null); }
  };

  const grupoOptions = [
    { value: '', label: 'Todos los grupos' },
    ...grupos.map((g) => ({ value: String(g.id), label: g.nombre_grupo })),
  ];

  const periodoOptions = [
    { value: '', label: 'Todos los periodos' },
    ...periodos.map((p) => ({ value: String(p.id), label: p.nombre_periodo })),
  ];

  const columns = [
    { key: 'fecha_clase',  header: 'Fecha',   render: (r) => formatDate(r.fecha_clase) },
    { key: 'grupo',        header: 'Grupo',   render: (r) => r.grupos?.nombre_grupo ?? '—' },
    { key: 'nombre_clase', header: 'Clase' },
    {
      key: 'periodo',
      header: 'Periodo',
      render: (r) => <span className="text-zinc-400 text-xs">{r.periodos?.nombre_periodo ?? '—'}</span>,
    },
    {
      key: 'es_extra',
      header: 'Tipo',
      render: (r) => r.es_extra
        ? <Badge variant="extra">Extra</Badge>
        : <Badge variant="default">Regular</Badge>,
    },
    {
      key: 'precio_cobrado',
      header: 'Precio',
      render: (r) => (
        <span className="font-mono text-xs">{formatCurrency(r.precio_cobrado)}</span>
      ),
    },
    {
      key: 'en_reclamo',
      header: '⚠️',
      cellClassName: 'text-center',
      render: (r) => (
        <button
          onClick={(e) => { e.stopPropagation(); toggleReclamo(r.id); }}
          title={r.en_reclamo ? 'En reclamo — clic para quitar' : 'Marcar en reclamo'}
          className={`text-lg transition-all hover:scale-125 ${r.en_reclamo ? 'opacity-100' : 'opacity-20 hover:opacity-60'}`}
          aria-label={r.en_reclamo ? 'Quitar reclamo' : 'Marcar en reclamo'}
        >
          ⚠️
        </button>
      ),
    },
    {
      key: 'grabacion',
      header: '',
      render: (r) => r.link_grabacion
        ? (
          <a href={r.link_grabacion} target="_blank" rel="noopener noreferrer"
             onClick={(e) => e.stopPropagation()}>
            <Button size="icon" variant="ghost" aria-label="Ver grabación">
              <ExternalLink size={13} />
            </Button>
          </a>
        )
        : null,
    },
    {
      key: 'actions',
      header: '',
      cellClassName: 'text-right',
      render: (r) => (
        <div className="flex gap-2 justify-end" onClick={(e) => e.stopPropagation()}>
          <Button size="icon" variant="ghost" onClick={() => openEdit(r)} aria-label="Editar">
            <Pencil size={13} />
          </Button>
          <Button
            size="icon"
            variant="danger"
            loading={deleting === r.id}
            onClick={() => handleDelete(r.id)}
            aria-label="Eliminar"
          >
            <Trash2 size={13} />
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center gap-4 justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-white">Clases</h1>
          <p className="text-sm text-zinc-500 mt-1">
            {clasesFiltradas.length} de {clases.length} clases
          </p>
        </div>
        <Button onClick={openCreate} id="btn-crear-clase">
          <Plus size={16} /> Nueva Clase
        </Button>
      </div>

      {/* ── Filtros ── */}
      <div className="flex flex-wrap gap-3 items-center">
        {/* Búsqueda de texto */}
        <div className="relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar clase, grupo o periodo…"
            className="w-64 h-9 pl-9 pr-3 text-sm rounded-lg bg-white/5 border border-white/10 text-white placeholder:text-zinc-500 focus:outline-none focus:border-[var(--accent-color)] focus:ring-1 focus:ring-[var(--accent-color)]/30 transition-all duration-200"
          />
        </div>

        {/* Filtro Grupo */}
        <div className="w-48">
          <CustomSelect
            value={filtroGrupo}
            onChange={setFiltroGrupo}
            options={grupoOptions}
            placeholder="Todos los grupos"
          />
        </div>

        {/* Filtro Periodo */}
        <div className="w-48">
          <CustomSelect
            value={filtroPeriodo}
            onChange={setFiltroPeriodo}
            options={periodoOptions}
            placeholder="Todos los periodos"
          />
        </div>

        {(filtroGrupo || filtroPeriodo || search) && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => { setFiltroGrupo(''); setFiltroPeriodo(''); setSearch(''); }}
          >
            Limpiar filtros
          </Button>
        )}
      </div>

      {/* ── Tabla ── */}
      <Table
        columns={columns}
        data={clasesFiltradas}
        loading={loading}
        emptyMessage={
          search || filtroGrupo || filtroPeriodo
            ? 'Sin resultados con los filtros actuales'
            : 'Sin clases registradas'
        }
      />

      {/* ── Modal ── */}
      <Modal
        open={!!modal}
        onClose={closeModal}
        title={modal === 'create' ? 'Nueva Clase' : `Editar — ${modal?.nombre_clase || modal?.fecha_clase}`}
      >
        <ClaseForm
          initial={modal !== 'create' ? modal : undefined}
          grupos={grupos}
          onSubmit={handleSubmit}
          onCancel={closeModal}
        />
      </Modal>
    </div>
  );
}
