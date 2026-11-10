import { useState } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { ThemeProvider } from './context/ThemeContext';
import { Navbar } from './components/ui/Navbar';
import { OnboardingModal } from './components/ui/OnboardingModal';
import { useAuth } from './hooks/useAuth';
import { ErrorBoundary } from './components/ErrorBoundary';
import Dashboard from './pages/Dashboard';
import Grupos from './pages/Grupos';
import Finanzas from './pages/Finanzas';
import Bonos from './pages/Bonos';
import Configuracion from './pages/Configuracion';
import Login from './pages/Login';
import Registro from './pages/Registro';
import ActualizarPassword from './pages/ActualizarPassword';

function Layout({ children }) {
  const [showOnboarding, setShowOnboarding] = useState(() => {
    return !localStorage.getItem('kt_onboarding_v1');
  });

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 font-sans">
      <Navbar />
      {/* Contenido principal: offset para sidebar en desktop, padding-bottom en mobile */}
      <main className="md:pl-16 lg:pl-56 pb-24 md:pb-0 transition-all">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 pt-3 pb-8 md:py-8">
          {children}
        </div>
      </main>

      {/* Modal interactivo de bienvenida y tips de inicio */}
      <OnboardingModal
        open={showOnboarding}
        onClose={() => setShowOnboarding(false)}
      />
    </div>
  );
}

export default function App() {
  const { user, isLoading } = useAuth();

  // Esperar a que useAuth resuelva completamente la sesión antes de montar el Layout o las rutas
  // para evitar destrucción de DOM y rotura de animaciones por cambio de key o estado.
  if (isLoading) {
    return (
      <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-[var(--accent-color)] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // Key estable: solo cambiará si el usuario inicia o cierra sesión
  const layoutKey = user?.id || 'local';

  return (
    <ThemeProvider>
      <BrowserRouter>
        <Routes>
          {/* Rutas de autenticación privada (acceso para usuarios con cuenta en nube) */}
          <Route path="/acceso-privado" element={<Login />} />
          <Route path="/login" element={<Login />} />
          <Route path="/registro" element={<Registro />} />
          <Route path="/actualizar-password" element={<ActualizarPassword />} />

          {/* Rutas principales abiertas para uso híbrido: local (IndexedDB) o nube (Supabase) */}
          <Route
            path="/*"
            element={
              <ErrorBoundary>
                <Layout key={layoutKey}>
                  <Routes>
                    <Route path="/" element={<ErrorBoundary><Dashboard /></ErrorBoundary>} />
                    <Route path="/grupos" element={<ErrorBoundary><Grupos /></ErrorBoundary>} />
                    <Route path="/finanzas" element={<ErrorBoundary><Finanzas /></ErrorBoundary>} />
                    <Route path="/bonos" element={<ErrorBoundary><Bonos /></ErrorBoundary>} />
                    <Route path="/configuracion" element={<ErrorBoundary><Configuracion /></ErrorBoundary>} />
                  </Routes>
                </Layout>
              </ErrorBoundary>
            }
          />
        </Routes>
      </BrowserRouter>
    </ThemeProvider>
  );
}
