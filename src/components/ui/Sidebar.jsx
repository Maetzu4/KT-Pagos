import { useRef } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { LayoutDashboard, Users, BarChart3, Settings, LogOut, Trophy, User, HardDrive } from 'lucide-react';
import { supabase } from '../../lib/supabaseClient';
import { useAuth } from '../../hooks/useAuth';
import { cn } from '../../lib/utils';

export const NAV_ITEMS = [
  { to: '/',              icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/finanzas',      icon: BarChart3,        label: 'Finanzas'  },
  { to: '/bonos',         icon: Trophy,           label: 'Bonos'     },
  { to: '/grupos',        icon: Users,            label: 'Grupos'    },
  { to: '/configuracion', icon: Settings,         label: 'Config'    },
];

export function Sidebar() {
  const navigate = useNavigate();
  const { user } = useAuth();

  // Acción oculta de 5 clics vinculada al logo principal
  const clickCountRef = useRef(0);
  const clickTimerRef = useRef(null);
  const lastTriggerRef = useRef(0);

  const handleSecretAccess = () => {
    const now = Date.now();
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

  const userEmail = user?.email || null;

  return (
    <nav className="hidden md:flex flex-col fixed left-0 top-0 h-full w-16 lg:w-56
                    bg-white border-r border-zinc-200 dark:bg-zinc-950 dark:border-zinc-800 z-40 py-6 transition-all">
      {/* Logo principal con acceso secreto de 5 clics */}
      <div
        title="KT-Pagos"
        onClick={handleSecretAccess}
        className="px-4 mb-8 flex items-center gap-3 select-none group cursor-pointer"
      >
        <img src="/favicon.svg" alt="KT-Pagos Logo" className="w-9 h-9 rounded-xl shadow-sm hover:opacity-90 transition-opacity" />
        <span className="hidden lg:block text-zinc-900 dark:text-white font-semibold text-sm group-hover:text-[var(--accent-color)] transition-colors">
          KT-Pagos
        </span>
      </div>

      {/* Links de navegación */}
      <div className="flex flex-col gap-1.5 px-2 flex-1">
        {NAV_ITEMS.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            className={({ isActive }) => cn(
              'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm',
              'transition-all duration-200 ease-in-out group relative',
              isActive
                ? 'bg-[var(--accent-color)] text-white shadow-md font-medium'
                : 'text-zinc-600 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-white/5 font-normal'
            )}
          >
            <Icon size={18} className="shrink-0 transition-transform duration-200 group-hover:scale-110" />
            <span className="hidden lg:block">{label}</span>
          </NavLink>
        ))}
      </div>

      {/* Cuenta + Botón Logout o Indicador Modo Local (Desktop) */}
      <div className="mt-auto px-2 space-y-1">
        {userEmail ? (
          <>
            <div className="hidden lg:flex items-center gap-2 px-3 py-2 rounded-xl bg-zinc-50 dark:bg-zinc-900/60 mb-1">
              <div className="w-6 h-6 rounded-full bg-[var(--accent-color)]/20 flex items-center justify-center shrink-0">
                <User size={12} className="text-[var(--accent-color)]" />
              </div>
              <span className="text-xs text-zinc-500 dark:text-zinc-400 truncate" title={userEmail}>{userEmail}</span>
            </div>
            <button
              onClick={() => supabase.auth.signOut()}
              className={cn(
                'w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-zinc-600 dark:text-zinc-400',
                'hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/30 dark:hover:text-red-400',
                'transition-all duration-200 ease-in-out group relative cursor-pointer'
              )}
            >
              <LogOut size={18} className="shrink-0 transition-transform duration-200 group-hover:scale-110" />
              <span className="hidden lg:block font-medium">Cerrar Sesión</span>
            </button>
          </>
        ) : (
          <div className="hidden lg:flex items-center gap-2 px-3 py-2 rounded-xl bg-zinc-100 dark:bg-zinc-900/60 text-zinc-500 dark:text-zinc-400">
            <HardDrive size={13} className="text-[var(--accent-color)] shrink-0" />
            <span className="text-xs font-medium truncate">Modo Local</span>
          </div>
        )}
      </div>
    </nav>
  );
}

