import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { ThemeProvider } from './context/ThemeContext';
import { Navbar } from './components/ui/Navbar';
import Dashboard     from './pages/Dashboard';
import Grupos        from './pages/Grupos';
import Clases        from './pages/Clases';
import Finanzas      from './pages/Finanzas';
import Configuracion from './pages/Configuracion';

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

export default function App() {
  return (
    <ThemeProvider>
      <BrowserRouter>
        <Layout>
          <Routes>
            <Route path="/"              element={<Dashboard />} />
            <Route path="/grupos"        element={<Grupos />} />
            <Route path="/clases"        element={<Clases />} />
            <Route path="/finanzas"      element={<Finanzas />} />
            <Route path="/configuracion" element={<Configuracion />} />
          </Routes>
        </Layout>
      </BrowserRouter>
    </ThemeProvider>
  );
}
