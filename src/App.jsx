import { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider } from './context/ThemeContext';
import { Navbar } from './components/ui/Navbar';
import { supabase } from './lib/supabaseClient';
import Dashboard     from './pages/Dashboard';
import Grupos        from './pages/Grupos';
import Clases        from './pages/Clases';
import Finanzas      from './pages/Finanzas';
import Configuracion from './pages/Configuracion';
import Login         from './pages/Login';

function Layout({ children }) {
  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 font-sans">
      <Navbar />
      {/* Contenido principal: offset para sidebar en desktop, padding-bottom en mobile */}
      <main className="md:pl-16 lg:pl-56 pb-20 md:pb-0 transition-all">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8">
          {children}
        </div>
      </main>
    </div>
  );
}

function ProtectedRoute({ session, children }) {
  if (!session) {
    return <Navigate to="/login" replace />;
  }
  return children;
}

export default function App() {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-[var(--accent-color)] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <ThemeProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route
            path="/*"
            element={
              <ProtectedRoute session={session}>
                <Layout>
                  <Routes>
                    <Route path="/"              element={<Dashboard />} />
                    <Route path="/grupos"        element={<Grupos />} />
                    <Route path="/clases"        element={<Clases />} />
                    <Route path="/finanzas"      element={<Finanzas />} />
                    <Route path="/configuracion" element={<Configuracion />} />
                  </Routes>
                </Layout>
              </ProtectedRoute>
            }
          />
        </Routes>
      </BrowserRouter>
    </ThemeProvider>
  );
}
