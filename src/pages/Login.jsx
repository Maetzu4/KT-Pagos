import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import { FormField, Input } from '../components/ui/FormField';
import { Button } from '../components/ui/Button';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
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

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-zinc-50 dark:bg-zinc-950">
      <div className="w-full max-w-sm bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-xl p-6 sm:p-8">
        <div className="text-center mb-8">
          <img src="/favicon.svg" alt="KT-Pagos Logo" className="w-16 h-16 mx-auto rounded-2xl shadow-md mb-2" />
          <h1 className="text-xl font-semibold text-zinc-900 dark:text-white">Bienvenido a KT-Pagos</h1>
          <p className="text-sm text-zinc-500 mt-1">Inicia sesión para gestionar tus tutorías</p>
        </div>

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
      </div>
    </div>
  );
}
