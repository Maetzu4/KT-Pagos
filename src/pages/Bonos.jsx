import { useState, useMemo, useCallback, useEffect } from 'react';
import {
  Trophy, Gift, CheckCircle2,
  Sparkles, TrendingUp, Save, Info, Zap, Calculator,
} from 'lucide-react';
import { usePeriodos } from '../hooks/usePeriodos';
import { useClases } from '../hooks/useClases';
import { useCountUp } from '../hooks/useCountUp';
import { Toggle } from '../components/ui/Toggle';
import { Button } from '../components/ui/Button';
import { CustomSelect } from '../components/ui/CustomSelect';
import { SimuladorBonosModal } from '../components/modals/SimuladorBonosModal';
import { formatCurrency } from '../lib/utils';

// ─── Constantes ───────────────────────────────────────────────────────────────
const GRADO_OPTIONS = [
  { value: 'none', label: 'None', sub: '0%' },
  { value: 'good', label: 'Good', sub: '+5%' },
  { value: 'amazing', label: 'Amazing', sub: '+10%' },
];

const REQUISITOS = [
  { icon: Trophy, text: 'Al menos 10 grupos activos' },
  { icon: CheckCircle2, text: '15+ alumnos en retención' },
  { icon: TrendingUp, text: 'Métricas por encima de OK' },
];

const MESES_NOMBRES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
];

/**
 * Precio efectivo de una clase.
 * Excluye Canceladas (retorna 0).
 * Utiliza precio_cobrado si existe, o la tarifa correspondiente del grupo.
 */
const getPrecioClase = (c) => {
  if (!c || c.estado_clase === 'Cancelada') return 0;
  if (c.precio_cobrado != null && c.precio_cobrado !== '') {
    return Number(c.precio_cobrado);
  }
  const tarifas = c.grupos?.tarifas;
  if (c.es_adicional) {
    return Number(tarifas?.precio_extra ?? tarifas?.precio_regular ?? 0);
  }
  return Number(tarifas?.precio_regular ?? 0);
};

// ─── Control de segmentos para retención ──────────────────────────────────────
function SegmentedGrade({ label, value, onChange, disabled }) {
  return (
    <div className={disabled ? 'opacity-40 pointer-events-none' : ''}>
      <p className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wide mb-2">
        {label}
      </p>
      <div className="bg-zinc-200/50 dark:bg-zinc-900/50 rounded-lg p-1 flex gap-1">
        {GRADO_OPTIONS.map((opt) => (
          <button
            key={opt.value}
            type="button"
            onClick={() => onChange(opt.value)}
            className={[
              'flex-1 px-2 py-2 text-xs font-semibold rounded-md transition-all duration-200 cursor-pointer text-center',
              value === opt.value
                ? 'bg-[var(--accent-color)] text-white shadow-sm'
                : 'bg-transparent text-zinc-500 dark:text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-300',
            ].join(' ')}
          >
            <span className="block">{opt.label}</span>
            <span className="block text-[10px] mt-0.5 opacity-80">{opt.sub}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

// ─── Fila de desglose ─────────────────────────────────────────────────────────
function DesgloseFila({ label, value, sub, highlight, icon: Icon }) {
  return (
    <div className="flex items-center justify-between py-3">
      <div className="flex items-center gap-2">
        {Icon && <Icon size={14} className="shrink-0 opacity-60" />}
        <span className={'text-sm ' + (highlight ? 'font-semibold text-[var(--accent-color)]' : 'text-zinc-600 dark:text-zinc-400')}>
          {label}
        </span>
        {sub && <span className="text-xs text-zinc-400">{sub}</span>}
      </div>
      <span className={'font-mono font-semibold text-sm tabular-nums ' + (highlight ? 'text-[var(--accent-color)]' : 'text-zinc-900 dark:text-white')}>
        {value}
      </span>
    </div>
  );
}

// ─── Página Principal ────────────────────────────────────────────────────────
export default function Bonos() {
  const { periodos = [], periodoActual = null, upsertPeriodo, loading: loadingPeriodos } = usePeriodos();
  const { clases = [], loading: loadingClases } = useClases();
  const [openSimulador, setOpenSimulador] = useState(false);

  const loading = loadingPeriodos || loadingClases;

  // ── Selector dividido: Año y Mes ──────────────────────────────────────────
  const periodosOrdenados = useMemo(
    () => [...(periodos || [])].sort((a, b) => (b?.key_periodo || '').localeCompare(a?.key_periodo || '')),
    [periodos]
  );

  // Extraer años únicos disponibles
  const aniosDisponibles = useMemo(() => {
    const set = new Set();
    periodosOrdenados.forEach((p) => {
      const key = p?.key_periodo || '';
      const anio = key.substring(0, 4);
      if (anio && anio.length === 4) set.add(anio);
    });
    return [...set].sort((a, b) => b.localeCompare(a));
  }, [periodosOrdenados]);

  // Derivar año y mes por defecto
  const defaultAnio = periodoActual?.key_periodo?.substring(0, 4) || aniosDisponibles[0] || String(new Date().getFullYear());
  const defaultMes = periodoActual?.key_periodo?.substring(5, 7) || String(new Date().getMonth() + 1).padStart(2, '0');

  const [selectedAnio, setSelectedAnio] = useState(defaultAnio);
  const [selectedMes, setSelectedMes] = useState(defaultMes);

  // Sincronizar selectores cuando carguen los periodos
  useEffect(() => {
    if (!selectedAnio && aniosDisponibles.length > 0) {
      const anioActual = periodoActual?.key_periodo?.substring(0, 4);
      setSelectedAnio(anioActual || aniosDisponibles[0]);
    }
  }, [aniosDisponibles, periodoActual, selectedAnio]);

  useEffect(() => {
    if (periodoActual?.key_periodo) {
      const pAnio = periodoActual.key_periodo.substring(0, 4);
      const pMes = periodoActual.key_periodo.substring(5, 7);
      if (!selectedAnio) setSelectedAnio(pAnio);
      if (!selectedMes) setSelectedMes(pMes);
    }
  }, [periodoActual]);

  // Meses disponibles para el año seleccionado
  const mesesDisponibles = useMemo(() => {
    return periodosOrdenados
      .filter((p) => (p?.key_periodo || '').startsWith(selectedAnio))
      .map((p) => {
        const mes = (p?.key_periodo || '').substring(5, 7);
        const idx = parseInt(mes, 10) - 1;
        return { value: mes, label: MESES_NOMBRES[idx] || mes };
      })
      .sort((a, b) => a.value.localeCompare(b.value));
  }, [periodosOrdenados, selectedAnio]);

  // Si al cambiar de año el mes seleccionado no existe, seleccionar el primero disponible
  useEffect(() => {
    if (mesesDisponibles.length > 0 && !mesesDisponibles.find((m) => m.value === selectedMes)) {
      setSelectedMes(mesesDisponibles[0].value);
    }
  }, [mesesDisponibles, selectedMes]);

  // Derivar el periodo seleccionado
  const periodo = useMemo(() => {
    if (!selectedAnio || !selectedMes) return periodoActual ?? periodosOrdenados[0] ?? null;
    const key = `${selectedAnio}-${selectedMes}`;
    const match = periodosOrdenados.find((p) => p?.key_periodo === key);
    return match || periodoActual || periodosOrdenados[0] || null;
  }, [selectedAnio, selectedMes, periodosOrdenados, periodoActual]);

  const [formState, setFormState] = useState({
    requisitos_bono: false,
    r1_grado: 'none',
    r2_grado: 'none',
    r3_grado: 'none',
  });

  // Sincronizar formState cuando cambia el periodo seleccionado
  useEffect(() => {
    if (periodo) {
      setFormState({
        requisitos_bono: Boolean(periodo.requisitos_bono),
        r1_grado: periodo.r1_grado || 'none',
        r2_grado: periodo.r2_grado || 'none',
        r3_grado: periodo.r3_grado || 'none',
      });
    }
  }, [periodo?.key_periodo, periodo?.requisitos_bono, periodo?.r1_grado, periodo?.r2_grado, periodo?.r3_grado]);

  const [saving, setSaving] = useState(false);
  const [savedOk, setSavedOk] = useState(false);

  const gradeMultiplier = (grade) => {
    if (grade === 'good') return 0.05;
    if (grade === 'amazing') return 0.10;
    return 0;
  };

  // ── Lógica de Cálculo Proyectado del Mes Completo ─────────────────────────
  // Clave del mes seleccionado (ej. '2025-02')
  const targetKey = `${selectedAnio}-${selectedMes}`;

  // 1. Filtrar todas las clases del mes seleccionado
  const clasesDelPeriodo = useMemo(() => {
    if (!clases || clases.length === 0 || !selectedAnio || !selectedMes) return [];
    return clases.filter((c) => {
      if (!c?.fecha_clase) return false;
      const f = c.fecha_clase.split('T')[0];
      if (targetKey && f.startsWith(targetKey)) return true;
      if (periodo?.fecha_inicio && periodo?.fecha_fin) {
        return f >= periodo.fecha_inicio && f <= periodo.fecha_fin;
      }
      return false;
    });
  }, [clases, targetKey, periodo?.fecha_inicio, periodo?.fecha_fin, selectedAnio, selectedMes]);

  // Filtro de exclusión estricto: la única clase que se excluye o suma $0 es estado_clase === 'Cancelada'
  // Evaluando TODAS las clases del mes: Programadas, Completadas y Aplazadas
  const clasesValidas = useMemo(() => {
    return clasesDelPeriodo.filter((c) => c?.estado_clase !== 'Cancelada');
  }, [clasesDelPeriodo]);

  // 2. Separación Estricta de Extras vs Regulares
  const clasesRegulares = useMemo(() => {
    return clasesValidas.filter((c) => !c?.es_adicional);
  }, [clasesValidas]);

  const clasesExtras = useMemo(() => {
    return clasesValidas.filter((c) => Boolean(c?.es_adicional));
  }, [clasesValidas]);

  // Montos base proyectados
  const montoRegulares = useMemo(() => {
    if (loading) return 0;
    return clasesRegulares.reduce((acc, c) => acc + getPrecioClase(c), 0);
  }, [clasesRegulares, loading]);

  const montoExtras = useMemo(() => {
    if (loading) return 0;
    return clasesExtras.reduce((acc, c) => acc + getPrecioClase(c), 0);
  }, [clasesExtras, loading]);

  // Porcentaje acumulado de bono según requisitos y retenciones
  const porcentaje_acumulado = formState.requisitos_bono
    ? gradeMultiplier(formState.r1_grado) + gradeMultiplier(formState.r2_grado) + gradeMultiplier(formState.r3_grado)
    : 0;

  // Cálculo del Bono: ÚNICAMENTE montoRegulares * porcentaje_acumulado (las extras jamás se multiplican)
  const monto_bono = montoRegulares * porcentaje_acumulado;

  // 3. Subtotal Regulares (con Bono) y Gran Total Proyectado
  const subtotal_regulares_bono = montoRegulares + monto_bono;
  const total_preview = montoRegulares + montoExtras + monto_bono;

  // Animaciones Dinámicas con useCountUp (inician en 0 antes de la carga de datos)
  const animTotalPreview = useCountUp(loading ? 0 : total_preview);
  const animSubtotalRegulares = useCountUp(loading ? 0 : subtotal_regulares_bono);
  const animRegulares = useCountUp(loading ? 0 : montoRegulares);
  const animExtras = useCountUp(loading ? 0 : montoExtras);
  const animBono = useCountUp(loading ? 0 : monto_bono);

  const handleSave = useCallback(async () => {
    if (!periodo) return;
    setSaving(true);
    try {
      await upsertPeriodo({ ...periodo, ...formState });
      setSavedOk(true);
      setTimeout(() => setSavedOk(false), 2500);
    } catch (err) {
      console.error('Error guardando bonos:', err);
    } finally {
      setSaving(false);
    }
  }, [periodo, formState, upsertPeriodo]);

  const isCurrentPeriod = Boolean(periodo && periodoActual && periodo.key_periodo === periodoActual.key_periodo);

  return (
    <div className="space-y-8 animate-fade-in">
      {/* ── Cabecera ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-[var(--accent-color)]/10 flex items-center justify-center shrink-0">
            <Trophy size={20} className="text-[var(--accent-color)]" />
          </div>
          <div>
            <h1 className="text-2xl font-semibold text-zinc-900 dark:text-white">Módulo de Bonos</h1>
            <p className="text-sm text-zinc-500 mt-0.5">Gestiona tus retenciones y calcula el bono mensual</p>
          </div>
        </div>

        {/* Selectores de Periodo con Badge ACTUAL rígidamente alineados a la derecha */}
        <div className="flex items-center justify-end gap-2 ml-auto w-full sm:w-auto shrink-0">
          {/* Badge ACTUAL en contenedor de ancho fijo para evitar saltos de layout */}
          <div className="w-14 shrink-0 flex items-center justify-end">
            {isCurrentPeriod && (
              <span className="px-2 py-0.5 rounded-md bg-[var(--accent-color)]/10 text-[var(--accent-color)] text-[10px] font-bold uppercase tracking-wider animate-fade-in">
                Actual
              </span>
            )}
          </div>

          {/* Año */}
          <div className="w-24 sm:w-28 shrink-0">
            <CustomSelect
              value={selectedAnio}
              onChange={setSelectedAnio}
              options={aniosDisponibles}
              placeholder="Año"
              className="bg-zinc-100 dark:bg-zinc-800/50 border-0 rounded-xl font-medium focus:ring-2 focus:ring-[var(--accent-color)] text-xs sm:text-sm"
            />
          </div>

          {/* Mes */}
          <div className="w-32 sm:w-36 shrink-0">
            <CustomSelect
              value={selectedMes}
              onChange={setSelectedMes}
              options={mesesDisponibles}
              placeholder="Mes"
              className="bg-zinc-100 dark:bg-zinc-800/50 border-0 rounded-xl font-medium focus:ring-2 focus:ring-[var(--accent-color)] text-xs sm:text-sm"
            />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* ── Izquierda: Requisitos + Retenciones ── */}
        <div className="lg:col-span-3 space-y-6">

          {/* Bloque Requisitos — diseño sobrio sin bordes */}
          <div className="rounded-2xl bg-zinc-50 dark:bg-zinc-800/40 overflow-hidden">
            <div className="px-5 py-4">
              <div className="flex items-center gap-2">
                <Gift size={16} className="text-[var(--accent-color)]" />
                <h2 className="font-semibold text-zinc-900 dark:text-white text-sm">Requisitos del Bono</h2>
              </div>
              <p className="text-xs text-zinc-500 mt-1">
                Para activar el bono, debes cumplir todos los requisitos del mes
              </p>
            </div>

            <div className="px-5 pb-4 space-y-3">
              {REQUISITOS.map(({ icon: Icon, text }) => (
                <div key={text} className="flex items-center gap-3">
                  <div className={[
                    'w-7 h-7 rounded-full flex items-center justify-center shrink-0 transition-all duration-300',
                    formState.requisitos_bono
                      ? 'bg-[var(--accent-color)]/10 text-[var(--accent-color)]'
                      : 'bg-zinc-200/60 dark:bg-zinc-700/40 text-zinc-400',
                  ].join(' ')}>
                    <Icon size={14} />
                  </div>
                  <span className={'text-sm transition-colors duration-200 ' + (formState.requisitos_bono ? 'text-zinc-900 dark:text-white' : 'text-zinc-500 dark:text-zinc-400')}>
                    {text}
                  </span>
                  {formState.requisitos_bono && (
                    <CheckCircle2 size={14} className="ml-auto shrink-0 text-[var(--accent-color)]" />
                  )}
                </div>
              ))}
            </div>

            <div className="px-5 py-4 bg-zinc-100/60 dark:bg-zinc-800/60">
              <label className="flex items-center justify-between cursor-pointer gap-4">
                <div>
                  <p className="text-sm font-semibold text-zinc-900 dark:text-white">
                    Cumplo con todos los requisitos de este mes
                  </p>
                  <p className="text-xs text-zinc-500 mt-0.5">
                    {formState.requisitos_bono
                      ? 'Bono activado — configura tus retenciones abajo'
                      : 'Activa el switch para habilitar el módulo de retenciones'}
                  </p>
                </div>
                <Toggle
                  id="toggle-requisitos"
                  checked={formState.requisitos_bono}
                  onChange={(v) => setFormState((s) => ({
                    ...s,
                    requisitos_bono: v,
                    ...(v ? {} : { r1_grado: 'none', r2_grado: 'none', r3_grado: 'none' }),
                  }))}
                />
              </label>
            </div>
          </div>

          {/* Bloque Retenciones — diseño sobrio sin bordes */}
          <div className={[
            'rounded-2xl bg-zinc-50 dark:bg-zinc-800/40 overflow-hidden transition-all duration-300',
            formState.requisitos_bono
              ? 'opacity-100'
              : 'opacity-50 pointer-events-none',
          ].join(' ')}>
            <div className="px-5 py-4">
              <div className="flex items-center gap-2">
                <Zap size={16} className="text-[var(--accent-color)]" />
                <h2 className="font-semibold text-zinc-900 dark:text-white text-sm">Gestor de Retenciones</h2>
              </div>
              <p className="text-xs text-zinc-500 mt-1">
                Evalúa el desempeño de cada retención para calcular el % de bono acumulado
              </p>
            </div>

            <div className="px-5 pb-5 grid grid-cols-1 sm:grid-cols-3 gap-4">
              <SegmentedGrade label="Retención R1" value={formState.r1_grado} onChange={(v) => setFormState((s) => ({ ...s, r1_grado: v }))} disabled={!formState.requisitos_bono} />
              <SegmentedGrade label="Retención R2" value={formState.r2_grado} onChange={(v) => setFormState((s) => ({ ...s, r2_grado: v }))} disabled={!formState.requisitos_bono} />
              <SegmentedGrade label="Retención R3" value={formState.r3_grado} onChange={(v) => setFormState((s) => ({ ...s, r3_grado: v }))} disabled={!formState.requisitos_bono} />
            </div>

            {formState.requisitos_bono && (
              <div className="px-5 pb-5">
                <div className="rounded-xl bg-zinc-100/80 dark:bg-zinc-800/60 px-4 py-3 flex items-center gap-4">
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-xs text-zinc-500">% de Bono Acumulado</span>
                      <span className="text-xs font-bold text-[var(--accent-color)]">
                        {(porcentaje_acumulado * 100).toFixed(0)}%
                      </span>
                    </div>
                    <div className="h-2 bg-zinc-200 dark:bg-zinc-700 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full bg-[var(--accent-color)] transition-all duration-500"
                        style={{ width: `${Math.min((porcentaje_acumulado / 0.30) * 100, 100)}%` }}
                      />
                    </div>
                  </div>
                  {/* Animación de conteo para 'Bono extra' junto a la barra de progreso */}
                  <div className="text-right shrink-0">
                    <p className="text-xs text-zinc-500">Bono extra</p>
                    <p className="text-sm font-bold font-mono text-[var(--accent-color)]">
                      +{formatCurrency(animBono)}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ── Derecha: Calculadora Preview ── */}
        <div className="lg:col-span-2">
          <div className="sticky top-6 rounded-2xl bg-zinc-50 dark:bg-zinc-800/40 overflow-hidden">
            {/* Cabecera de la calculadora con Total Proyectado animado */}
            <div className="bg-[var(--accent-color)] px-5 py-4">
              <div className="flex items-center gap-2 mb-1">
                <Sparkles size={16} className="text-white/80" />
                <span className="text-xs font-semibold text-white/80 uppercase tracking-wide">Calculadora de Bono</span>
              </div>
              <p className="text-2xl font-bold text-white font-mono">{formatCurrency(animTotalPreview)}</p>
              <p className="text-xs text-white/70 mt-0.5">{periodo?.nombre_periodo ?? '—'} · Total proyectado</p>
            </div>

            {/* Desglose con animaciones de conteo */}
            <div className="px-5 py-1 divide-y divide-zinc-200/50 dark:divide-zinc-800/50">
              <DesgloseFila label="Clases Regulares" value={formatCurrency(animRegulares)} icon={CheckCircle2} />
              <DesgloseFila label="Clases Extras" value={formatCurrency(animExtras)} icon={Zap} />
              <DesgloseFila
                label="Bono Aplicado"
                sub={porcentaje_acumulado > 0 ? `(${(porcentaje_acumulado * 100).toFixed(0)}%)` : undefined}
                value={animBono > 0 ? `+${formatCurrency(animBono)}` : formatCurrency(0)}
                icon={Trophy}
                highlight={monto_bono > 0}
              />
            </div>

            <div className="mx-5 my-1 border-t border-zinc-200/60 dark:border-zinc-800/50" />

            {/* Subtotal Regulares (con Bono) desglosado en la parte inferior animado */}
            <div className="px-5 pt-2 pb-1">
              <div className="flex items-center justify-between rounded-xl bg-[var(--accent-color)]/10 px-4 py-3">
                <span className="text-sm font-semibold text-[var(--accent-color)]">Subtotal Regulares</span>
                <span className="font-mono font-bold text-lg text-[var(--accent-color)]">
                  {formatCurrency(animSubtotalRegulares)}
                </span>
              </div>
            </div>

            <div className="px-5 pb-5 pt-3 space-y-3">
              <div className="rounded-xl bg-zinc-100/80 dark:bg-zinc-800/60 px-3 py-2.5 flex gap-2">
                <Info size={13} className="shrink-0 mt-0.5 text-zinc-400" />
                <p className="text-xs text-zinc-500 leading-relaxed">
                  {formState.requisitos_bono
                    ? 'El bono se calcula sobre los ingresos regulares (no aplica a extras).'
                    : 'Activa el toggle de requisitos para habilitar el bono mensual.'}
                </p>
              </div>

              <Button
                onClick={handleSave}
                disabled={saving || !periodo}
                className={'w-full justify-center transition-all duration-300 ' + (savedOk ? 'bg-emerald-500 hover:bg-emerald-500' : '')}
              >
                {saving
                  ? <><div className="w-4 h-4 border-2 border-white/60 border-t-white rounded-full animate-spin mr-2" />Guardando…</>
                  : savedOk
                    ? <><CheckCircle2 size={16} className="mr-2" />¡Guardado!</>
                    : <><Save size={16} className="mr-2" />Guardar Bonos</>
                }
              </Button>

              <Button
                type="button"
                variant="subtle"
                size="sm"
                onClick={() => setOpenSimulador(true)}
                className="w-full justify-center text-xs rounded-xl"
              >
                <Calculator size={14} className="text-[var(--accent-color)] mr-1.5" />
                Simulador Rápido
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Modal Simulador Rápido */}
      <SimuladorBonosModal
        open={openSimulador}
        onClose={() => setOpenSimulador(false)}
      />
    </div>
  );
}
