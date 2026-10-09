import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import { FormField, Input } from '../components/ui/FormField';
import { Button } from '../components/ui/Button';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [isRecovering, setIsRecovering] = useState(false);
  const [recoverySent, setRecoverySent] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');

    if (!email || !password) {
      setError('Por favor, ingresa tu correo y contraseña.');
      return;
    }

    setLoading(true);
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    setLoading(false);

    if (signInError) {
      setError('Credenciales incorrectas o error al iniciar sesión.');
    } else {
      navigate('/', { replace: true });
    }
  };

  const handleRecovery = async (e) => {
    e.preventDefault();
    setError('');

    if (!email) {
      setError('Por favor, ingresa tu correo electrónico.');
      return;
    }

    setLoading(true);
    const { error: recoveryError } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/actualizar-password`,
    });
    setLoading(false);

    if (recoveryError) {
      setError(recoveryError.message || 'Error al enviar el enlace de recuperación.');
    } else {
      setRecoverySent(true);
    }
  };

  const handleBackToLogin = () => {
    setIsRecovering(false);
    setRecoverySent(false);
    setError('');
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-zinc-50 dark:bg-zinc-950">
      <div className="w-full max-w-sm bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-xl p-6 sm:p-8">
        <div className="text-center mb-8">
          <img src="/favicon.svg" alt="KT-Pagos Logo" className="w-16 h-16 mx-auto rounded-2xl shadow-md mb-2" />
          <h1 className="text-xl font-semibold text-zinc-900 dark:text-white">
            {isRecovering ? 'Recuperar contraseña' : 'Bienvenido a KT-Pagos'}
          </h1>
          <p className="text-sm text-zinc-500 mt-1">
            {isRecovering
              ? 'Te enviaremos un enlace a tu correo'
              : 'Inicia sesión para gestionar tus tutorías'}
          </p>
        </div>

        {/* ── Vista: recuperación enviada ── */}
        {isRecovering && recoverySent ? (
          <div className="text-center space-y-4">
            <div className="flex items-center justify-center w-14 h-14 mx-auto rounded-full bg-emerald-100 dark:bg-emerald-900/30">
              <svg xmlns="http://www.w3.org/2000/svg" className="w-7 h-7 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
            </div>
            <h2 className="text-base font-semibold text-zinc-900 dark:text-white">¡Enlace enviado!</h2>
            <p className="text-sm text-zinc-500 dark:text-zinc-400 leading-relaxed">
              Hemos enviado un enlace de recuperación a{' '}
              <span className="font-medium text-zinc-700 dark:text-zinc-300">{email}</span>.
              Revisa tu bandeja de entrada y haz clic en el enlace para crear una nueva contraseña.
            </p>
            <button
              type="button"
              onClick={handleBackToLogin}
              className="inline-block mt-2 text-sm text-[var(--accent-color)] hover:underline"
            >
              Volver al inicio de sesión
            </button>
          </div>

        ) : isRecovering ? (
          /* ── Vista: formulario de recuperación ── */
          <form onSubmit={handleRecovery} className="space-y-4">
            <FormField label="Correo Electrónico">
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="tu@correo.com"
                required
              />
            </FormField>

            {error && <p className="text-sm text-red-500 dark:text-red-400 text-center">{error}</p>}

            <Button type="submit" className="w-full mt-2" loading={loading}>
              Enviar enlace de recuperación
            </Button>

            <p className="text-center text-sm text-zinc-500 mt-2">
              <button
                type="button"
                onClick={handleBackToLogin}
                className="text-[var(--accent-color)] hover:underline"
              >
                Volver al inicio de sesión
              </button>
            </p>
          </form>

        ) : (
          /* ── Vista: formulario de login ── */
          <>
            <form onSubmit={handleLogin} className="space-y-4">
              <FormField label="Correo Electrónico">
                <Input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="tu@correo.com"
                  required
                />
              </FormField>
              <FormField label="Contraseña">
                <Input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                />
              </FormField>

              {error && <p className="text-sm text-red-500 dark:text-red-400 text-center">{error}</p>}

              <Button type="submit" className="w-full mt-2" loading={loading}>
                Iniciar Sesión
              </Button>
            </form>

            <p className="text-center mt-4">
              <button
                type="button"
                onClick={() => { setIsRecovering(true); setError(''); }}
                className="text-sm text-zinc-500 dark:text-zinc-400 hover:text-[var(--accent-color)] transition-colors"
              >
                ¿Olvidaste tu contraseña?
              </button>
            </p>

            <p className="text-center text-sm text-zinc-500 mt-3">
              ¿No tienes cuenta?{' '}
              <Link to="/registro" className="text-[var(--accent-color)] hover:underline">
                Regístrate
              </Link>
            </p>
          </>
        )}
      </div>
    </div>
  );
}
