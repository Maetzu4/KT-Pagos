import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import { FormField, Input } from '../components/ui/FormField';
import { Button } from '../components/ui/Button';

export default function Registro() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [isRegistered, setIsRegistered] = useState(false);
  const navigate = useNavigate();

  const handleRegister = async (e) => {
    e.preventDefault();
    setError('');

    if (!email || !password || !confirmPassword) {
      setError('Por favor, completa todos los campos.');
      return;
    }

    if (password !== confirmPassword) {
      setError('Las contraseñas no coinciden.');
      return;
    }

    setLoading(true);
    const { data, error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/login`
      }
    });
    setLoading(false);

    if (signUpError) {
      setError(signUpError.message || 'Error al registrar el usuario.');
    } else {
      setIsRegistered(true);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-zinc-50 dark:bg-zinc-950">
      <div className="w-full max-w-sm bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-xl p-6 sm:p-8">
        <div className="text-center mb-8">
          <img src="/favicon.svg" alt="KT-Pagos Logo" className="w-16 h-16 mx-auto rounded-2xl shadow-md mb-2" />
          <h1 className="text-xl font-semibold text-zinc-900 dark:text-white">Crear cuenta</h1>
          <p className="text-sm text-zinc-500 mt-1">Regístrate en KT-Pagos</p>
        </div>

        {isRegistered ? (
          <div className="text-center space-y-4">
            <div className="flex items-center justify-center w-14 h-14 mx-auto rounded-full bg-emerald-100 dark:bg-emerald-900/30">
              <svg xmlns="http://www.w3.org/2000/svg" className="w-7 h-7 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
            </div>
            <h2 className="text-base font-semibold text-zinc-900 dark:text-white">¡Registro exitoso!</h2>
            <p className="text-sm text-zinc-500 dark:text-zinc-400 leading-relaxed">
              Te hemos enviado un enlace de verificación a <span className="font-medium text-zinc-700 dark:text-zinc-300">{email}</span>. Por favor, revísalo y haz clic en el enlace para activar tu cuenta y poder iniciar sesión.
            </p>
            <Link
              to="/login"
              className="inline-block mt-2 text-sm text-[var(--accent-color)] hover:underline"
            >
              Volver al inicio de sesión
            </Link>
          </div>
        ) : (
          <>
            <form onSubmit={handleRegister} className="space-y-4">
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
              <FormField label="Confirmar Contraseña">
                <Input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                />
              </FormField>

              {error && <p className="text-sm text-red-500 dark:text-red-400 text-center">{error}</p>}

              <Button type="submit" className="w-full mt-2" loading={loading}>
                Registrarse
              </Button>
            </form>

            <p className="text-center text-sm text-zinc-500 mt-6">
              ¿Ya tienes cuenta?{' '}
              <Link to="/login" className="text-[var(--accent-color)] hover:underline">
                Inicia sesión
              </Link>
            </p>
          </>
        )}
      </div>
    </div>
  );
}
