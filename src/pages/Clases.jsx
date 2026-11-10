import { useState } from 'react';
import { Plus, Pencil, Trash2, ExternalLink, Search, AlertTriangle } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Table } from '../components/ui/Table';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { Modal } from '../components/ui/Modal';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';
import { CustomSelect } from '../components/ui/CustomSelect';
import { ClaseDetailModal } from '../components/ui/ClaseDetailModal';
import { ClaseForm } from '../components/forms/ClaseForm';
import { useClases } from '../hooks/useClases';
import { useGrupos } from '../hooks/useGrupos';
import { usePeriodos } from '../hooks/usePeriodos';
import { formatDate } from '../lib/dateUtils';
import { formatCurrency } from '../lib/utils';

export default function Clases() {
  const { t } = useTranslation();
  const { periodos } = usePeriodos();
  const { grupos } = useGrupos();

  const [filtroGrupo,   setFiltroGrupo]   = useState('');
  const [filtroPeriodo, setFiltroPeriodo] = useState('');
  const [search,        setSearch]        = useState('');
  const [modal,         setModal]         = useState(null);
  const [claseDetalle,  setClaseDetalle]  = useState(null);
  const [deleting,      setDeleting]      = useState(null);
  const [confirmId,     setConfirmId]     = useState(null); // id para ConfirmDialog

  const { clases, loading, createClase, updateClase, deleteClase, toggleReclamo } =
    useClases({ grupo_id: filtroGrupo || undefined });

  const getNombrePeriodoClase = (fecha_clase) => {
    if (!fecha_clase) return '—';
    const key = fecha_clase.slice(0, 7);
    const p = periodos.find((p) => p.key_periodo === key || p.id === key);
    return p?.nombre_periodo ?? key;
  };

  // Filtro de búsqueda de texto libre y periodo en memoria
  const clasesFiltradas = clases.filter((c) => {
    if (filtroPeriodo) {
      const key = c.fecha_clase?.slice(0, 7);
      if (key !== filtroPeriodo && String(c.periodo_id) !== String(filtroPeriodo)) return false;
    }
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      const matchNombre = (c.nombre_clase || c.tema_clase)?.toLowerCase().includes(q);
      const matchGrupo = (c.es_externa ? c.descripcion_externa : c.grupos?.nombre_grupo)?.toLowerCase().includes(q);
      const matchPeriodo = getNombrePeriodoClase(c.fecha_clase)?.toLowerCase().includes(q);
      return matchNombre || matchGrupo || matchPeriodo;
    }
    return true;
  });

  const openCreate = () => setModal('create');
  const openEdit   = (c) => setModal(c);
  const closeModal = () => setModal(null);

  const handleSubmit = async (values) => {
    if (modal === 'create') await createClase(values);
    else await updateClase(modal.id, values);
    closeModal();
  };

  const handleDeleteConfirm = async () => {
    if (!confirmId) return;
    setDeleting(confirmId);
    setConfirmId(null);
    try { await deleteClase(confirmId); } finally { setDeleting(null); }
  };

  const grupoOptions = [
    { value: '', label: t('clases.allGroups', 'Todos los grupos') },
    ...grupos.map((g) => ({ value: String(g.id), label: g.nombre_grupo })),
  ];

  const periodoOptions = [
    { value: '', label: t('clases.allPeriods', 'Todos los periodos') },
    ...periodos.map((p) => ({ value: p.key_periodo || String(p.id), label: p.nombre_periodo })),
  ];

  const columns = [
    { key: 'fecha_clase',  header: t('clases.date', 'Fecha'),   render: (r) => formatDate(r?.fecha_clase) },
    {
      key: 'grupo',
      header: t('clases.group', 'Grupo'),
      render: (r) => r?.es_externa
        ? <span className="font-medium text-zinc-900 dark:text-white flex items-center gap-1.5">{r?.descripcion_externa || t('clases.external', 'Externa')}<span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-sky-500/10 text-sky-500 ring-1 ring-inset ring-sky-500/20">EXT</span></span>
        : (r?.grupos?.nombre_grupo ?? '—')
    },
    { key: 'nombre_clase', header: t('clases.class', 'Clase'),   render: (r) => r?.nombre_clase || r?.tema_clase || '—' },
    {
      key: 'periodo',
      header: t('clases.period', 'Periodo'),
      render: (r) => <span className="text-zinc-400 text-xs">{getNombrePeriodoClase(r?.fecha_clase)}</span>,
    },
    {
      key: 'es_adicional',
      header: t('clases.type', 'Tipo'),
      render: (r) => (r?.es_adicional ?? r?.es_extra)
        ? <Badge variant="extra">{t('clases.extra', 'Extra')}</Badge>
        : <Badge variant="default">{t('clases.regular', 'Regular')}</Badge>,
    },
    {
      key: 'precio_cobrado',
      header: t('clases.price', 'Precio'),
      render: (r) => {
        const precio = r?.precio_cobrado ?? (r?.es_externa ? r?.tarifas?.precio_regular : r?.grupos?.tarifas?.precio_regular) ?? 0;
        return (
          <span className="font-mono text-xs">{formatCurrency(precio)}</span>
        );
      },
    },
    {
      key: 'en_reclamo',
      header: '',
      cellClassName: 'text-center w-10',
      render: (r) => (
        <button
          onClick={(e) => { e.stopPropagation(); toggleReclamo(r?.id); }}
          title={r?.en_reclamo ? t('clases.inClaimTooltip', 'En reclamo — clic para quitar') : t('clases.markClaimTooltip', 'Marcar en reclamo')}
          className={`flex items-center justify-center transition-all hover:scale-110 ${
            r?.en_reclamo ? 'text-[var(--accent-color)] opacity-100' : 'text-zinc-400 opacity-30 hover:opacity-70'
          }`}
          aria-label={r?.en_reclamo ? t('clases.inClaimTooltip', 'Quitar reclamo') : t('clases.markClaimTooltip', 'Marcar en reclamo')}
        >
          <AlertTriangle size={15} />
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
            <Button size="icon" variant="ghost" aria-label={t('clases.watchRecording', 'Ver grabación')}>
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
        <div className="flex gap-1.5 justify-end" onClick={(e) => e.stopPropagation()}>
          <Button size="icon" variant="ghost" onClick={() => openEdit(r)} aria-label={t('clases.edit', 'Editar')}>
            <Pencil size={13} />
          </Button>
          <Button
            size="icon"
            variant="danger"
            loading={deleting === r.id}
            onClick={() => setConfirmId(r.id)}
            aria-label={t('clases.delete', 'Eliminar')}
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
          <h1 className="text-2xl font-semibold text-zinc-900 dark:text-white">{t('clases.title', 'Clases')}</h1>
          <p className="text-sm text-zinc-500 mt-1">
            {t('clases.classesCount', '{{filtered}} de {{total}} clases', { filtered: clasesFiltradas.length, total: clases.length })}
          </p>
        </div>
        <Button onClick={openCreate} id="btn-crear-clase">
          <Plus size={16} /> {t('clases.newClass', 'Nueva Clase')}
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
            placeholder={t('clases.searchPlaceholder', 'Buscar clase, grupo o periodo…')}
            className="w-64 h-9 pl-9 pr-3 text-sm rounded-lg bg-white dark:bg-white/5 border border-zinc-300 dark:border-white/10 text-zinc-900 dark:text-white placeholder:text-zinc-400 dark:placeholder:text-zinc-500 focus:outline-none focus:border-[var(--accent-color)] focus:ring-1 focus:ring-[var(--accent-color)]/30 transition-all duration-200"
          />
        </div>

        {/* Filtro Grupo */}
        <div className="w-48">
          <CustomSelect
            value={filtroGrupo}
            onChange={setFiltroGrupo}
            options={grupoOptions}
            placeholder={t('clases.allGroups', 'Todos los grupos')}
          />
        </div>

        {/* Filtro Periodo */}
        <div className="w-48">
          <CustomSelect
            value={filtroPeriodo}
            onChange={setFiltroPeriodo}
            options={periodoOptions}
            placeholder={t('clases.allPeriods', 'Todos los periodos')}
          />
        </div>

        {(filtroGrupo || filtroPeriodo || search) && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => { setFiltroGrupo(''); setFiltroPeriodo(''); setSearch(''); }}
          >
            {t('clases.clearFilters', 'Limpiar filtros')}
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
            ? t('clases.noResultsFilters', 'Sin resultados con los filtros actuales')
            : t('clases.noRegisteredClasses', 'Sin clases registradas')
        }
        onRowClick={(c) => setClaseDetalle(c)}
      />

      {/* ── Modal Editar / Crear ── */}
      <Modal
        open={!!modal}
        onClose={closeModal}
        title={modal === 'create' ? t('clases.newClass', 'Nueva Clase') : t('clases.editTitle', 'Editar — {{name}}', { name: modal?.nombre_clase || modal?.fecha_clase })}
      >
        <ClaseForm
          initial={modal !== 'create' ? modal : undefined}
          grupos={grupos}
          onSubmit={handleSubmit}
          onCancel={closeModal}
        />
      </Modal>

      {/* ── ConfirmDialog eliminar ── */}
      <ConfirmDialog
        open={!!confirmId}
        title={t('clases.deleteTitle', 'Eliminar clase')}
        message={t('clases.deleteMessage', 'Esta acción es irreversible. La clase y su precio snapshot serán eliminados permanentemente.')}
        confirmText={t('clases.delete', 'Eliminar')}
        onConfirm={handleDeleteConfirm}
        onCancel={() => setConfirmId(null)}
        destructive
      />

      <ClaseDetailModal 
        isOpen={!!claseDetalle} 
        onClose={() => setClaseDetalle(null)} 
        clase={claseDetalle} 
      />
    </div>
  );
}
