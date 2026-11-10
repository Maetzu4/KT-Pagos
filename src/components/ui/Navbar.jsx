import { useRef } from 'react';
import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import { LayoutDashboard, Users, BarChart3, Settings, Trophy } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../hooks/useAuth';
import { cn } from '../../lib/utils';
import { Sidebar } from './Sidebar';

const NAV_ITEMS = [
  { to: '/',              icon: LayoutDashboard, labelKey: 'dashboard',     defaultLabel: 'Dashboard' },
  { to: '/finanzas',      icon: BarChart3,        labelKey: 'finanzas',      defaultLabel: 'Finanzas' },
  { to: '/bonos',         icon: Trophy,           labelKey: 'bonos',         defaultLabel: 'Bonos' },
  { to: '/grupos',        icon: Users,            labelKey: 'grupos',        defaultLabel: 'Grupos' },
  { to: '/configuracion', icon: Settings,         labelKey: 'configuracion', defaultLabel: 'Config' },
];

const PAGE_TITLE_KEYS = {
  '/': 'navbar.dashboard',
  '/finanzas': 'navbar.finanzas',
  '/bonos': 'navbar.bonos',
  '/grupos': 'navbar.grupos',
  '/configuracion': 'navbar.configLong',
};

export function Navbar() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const { isOffline } = useAuth();

  const titleKey = PAGE_TITLE_KEYS[location.pathname];
  const currentTitle = titleKey ? t(titleKey) : 'KT-Pagos';
  const activeIdx = NAV_ITEMS.findIndex(({ to }) =>
    to === '/' ? location.pathname === '/' : location.pathname.startsWith(to)
  );

  // Acción oculta de 5 clics vinculada a Configuración (móvil)
  const clickCountRef = useRef(0);
  const clickTimerRef = useRef(null);
  const lastTriggerRef = useRef(0);

  const handleSecretAccess = () => {
    const now = Date.now();
    // Evita contar doble si el móvil dispara touchstart y click casi simultáneos
    if (now - lastTriggerRef.current < 100) return;
    lastTriggerRef.current = now;

    clickCountRef.current += 1;
    if (clickCountRef.current >= 5) {
      clickCountRef.current = 0;
      if (clickTimerRef.current) clearTimeout(clickTimerRef.current);
      navigate('/acceso-privado');
      return;
    }

    if (clickTimerRef.current) clearTimeout(clickTimerRef.current);
    clickTimerRef.current = setTimeout(() => {
      clickCountRef.current = 0;
    }, 2500);
  };

  return (
    <>
      {/* ── Top Header Translúcido (Móvil) ── */}
      <header className="md:hidden sticky top-0 z-40 bg-white/60 dark:bg-zinc-950/60 backdrop-blur-md border-b border-zinc-200 dark:border-zinc-800 px-4 py-3.5 flex items-center justify-between">
        <div className="flex items-center gap-2.5 select-none">
          <img src="/favicon.svg" alt="KT-Pagos Logo" className="w-7 h-7 rounded-lg shadow-sm" />
          <span className="text-zinc-900 dark:text-white font-semibold text-base">
            {currentTitle}
          </span>
        </div>

        {/* Badge píldora sólida "LOCAL" a la derecha */}
        {isOffline && (
          <span className="bg-[var(--accent-color)] text-white px-3 py-1 rounded-full text-[10px] font-bold tracking-wider uppercase shadow-sm">
            {t('navbar.local', 'Local')}
          </span>
        )}
      </header>

      {/* ── Sidebar para escritorio ─────────────────────────────────── */}
      <Sidebar />

      {/* ── Bottom Navigation Translúcido (Móvil) ── */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/60 dark:bg-zinc-950/60 backdrop-blur-md border-t border-zinc-200 dark:border-zinc-800 pt-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))]">
        <div className="relative flex w-full justify-around items-center">
          {/* Fondo animado sliding pill */}
          {activeIdx >= 0 && (
            <div
              className="absolute top-1/2 -translate-y-1/2 h-10 w-[60px] bg-[var(--accent-color)] rounded-xl transition-all duration-300 ease-out pointer-events-none"
              style={{
                left: `calc(${(activeIdx * 100) / NAV_ITEMS.length}% + calc(100% / ${NAV_ITEMS.length * 2}) - 30px)`,
              }}
            />
          )}

          {NAV_ITEMS.map(({ to, icon: Icon, labelKey, defaultLabel }) => {
            const isActive = to === '/' ? location.pathname === '/' : location.pathname.startsWith(to);
            return (
              <NavLink
                key={to}
                to={to}
                end={to === '/'}
                title={t(`navbar.${labelKey}`, defaultLabel)}
                aria-label={t(`navbar.${labelKey}`, defaultLabel)}
                onClick={to === '/configuracion' ? handleSecretAccess : undefined}
                onTouchStart={to === '/configuracion' ? handleSecretAccess : undefined}
                className="z-10 relative bg-transparent p-2 flex items-center justify-center cursor-pointer"
              >
                <Icon
                  size={22}
                  className={cn(
                    'transition-colors duration-200',
                    isActive ? 'text-white' : 'text-zinc-500 dark:text-zinc-400'
                  )}
                />
              </NavLink>
            );
          })}
        </div>
      </nav>
    </>
  );
}
