import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import { FormField, Input } from '../components/ui/FormField';
import { Button } from '../components/ui/Button';

export default function ActualizarPassword() {
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const navigate = useNavigate();

  const handleUpdate = async (e) => {
    e.preventDefault();
    setError('');

    if (!newPassword || !confirmPassword) {
      setError('Por favor, completa todos los campos.');
      return;
    }

    if (newPassword.length < 6) {
      setError('La contraseña debe tener al menos 6 caracteres.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('Las contraseñas no coinciden.');
      return;
    }

    setLoading(true);
    const { error: updateError } = await supabase.auth.updateUser({
      password: newPassword,
    });
    setLoading(false);

    if (updateError) {
      setError(updateError.message || 'Error al actualizar la contraseña.');
    } else {
      setSuccess(true);
      setTimeout(() => navigate('/login', { replace: true }), 3000);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-zinc-50 dark:bg-zinc-950">
      <div className="w-full max-w-sm bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-xl p-6 sm:p-8">
        <div className="text-center mb-8">
          <img src="/favicon.svg" alt="KT-Pagos Logo" className="w-16 h-16 mx-auto rounded-2xl shadow-md mb-2" />
          <h1 className="text-xl font-semibold text-zinc-900 dark:text-white">Nueva contraseña</h1>
          <p className="text-sm text-zinc-500 mt-1">Elige una contraseña segura para tu cuenta</p>
        </div>

        {success ? (
          <div className="text-center space-y-4">
            <div className="flex items-center justify-center w-14 h-14 mx-auto rounded-full bg-emerald-100 dark:bg-emerald-900/30">
              <svg xmlns="http://www.w3.org/2000/svg" className="w-7 h-7 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h2 className="text-base font-semibold text-zinc-900 dark:text-white">¡Contraseña actualizada!</h2>
            <p className="text-sm text-zinc-500 dark:text-zinc-400 leading-relaxed">
              Tu contraseña ha sido cambiada correctamente. Serás redirigido al inicio de sesión en unos segundos...
            </p>
          </div>
        ) : (
          <form onSubmit={handleUpdate} className="space-y-4">
            <FormField label="Nueva contraseña">
              <Input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="••••••••"
                required
              />
            </FormField>
            <FormField label="Confirmar nueva contraseña">
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
              Guardar nueva contraseña
            </Button>
          </form>
        )}
      </div>
    </div>
  );
}
