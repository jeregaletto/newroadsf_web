import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, CircleAlert, Eye, EyeOff, LoaderCircle, Lock } from 'lucide-react';
import { Logo } from './BrandIcons';
import { api } from '../lib/api';

export default function AdminLogin({ onLogin, aviso }) {
  const [usuario, setUsuario] = useState('');
  const [password, setPassword] = useState('');
  const [verPassword, setVerPassword] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState('');

  const submit = async (e) => {
    e.preventDefault();
    if (!usuario.trim() || !password) {
      setError('Completá usuario y contraseña');
      return;
    }
    setEnviando(true);
    setError('');
    try {
      const r = await api.login(usuario.trim(), password);
      onLogin(r.usuario);
    } catch (err) {
      setError(err.message);
      setPassword('');
    } finally {
      setEnviando(false);
    }
  };

  const inputCls =
    'h-12 w-full rounded-xl border border-line bg-ink-3 px-4 text-base text-white placeholder:text-zinc-600 focus:border-acid focus:outline-none';

  return (
    <div className="grid min-h-dvh place-items-center px-4 py-10">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center gap-3 text-center">
          <Logo />
          <span className="rounded-md bg-acid px-2 py-0.5 text-[0.65rem] font-extrabold uppercase tracking-wider text-ink">
            Panel del local
          </span>
        </div>

        <form onSubmit={submit} noValidate className="rounded-3xl border border-line bg-ink-2 p-6 sm:p-7">
          <div className="mb-6 flex items-center gap-3">
            <span className="grid size-11 place-items-center rounded-xl bg-ink-3">
              <Lock className="size-5 text-acid" />
            </span>
            <div>
              <h1 className="font-display text-2xl text-white">Ingresar</h1>
              <p className="text-xs text-zinc-500">Acceso solo para el personal</p>
            </div>
          </div>

          {aviso && !error && (
            <p className="mb-4 rounded-xl border border-amber-400/30 bg-amber-400/10 px-3 py-2 text-sm text-amber-200">{aviso}</p>
          )}

          <div className="space-y-4">
            <label className="block">
              <span className="mb-1.5 block text-sm font-semibold text-white">Usuario</span>
              <input
                value={usuario}
                onChange={(e) => setUsuario(e.target.value)}
                autoComplete="username"
                autoCapitalize="none"
                autoCorrect="off"
                spellCheck={false}
                autoFocus
                className={inputCls}
              />
            </label>

            <label className="block">
              <span className="mb-1.5 block text-sm font-semibold text-white">Contraseña</span>
              <span className="relative block">
                <input
                  type={verPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="current-password"
                  className={`${inputCls} pr-12`}
                />
                <button
                  type="button"
                  onClick={() => setVerPassword((v) => !v)}
                  className="absolute right-1 top-1/2 grid size-10 -translate-y-1/2 place-items-center rounded-lg text-zinc-500 hover:text-white"
                  aria-label={verPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                >
                  {verPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                </button>
              </span>
            </label>
          </div>

          {error && (
            <p role="alert" className="mt-4 flex items-start gap-2 text-sm text-red-400">
              <CircleAlert className="mt-0.5 size-4 shrink-0" /> {error}
            </p>
          )}

          <button
            type="submit"
            disabled={enviando}
            className="mt-6 flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-acid text-sm font-extrabold uppercase tracking-wide text-ink transition hover:bg-acid-deep active:scale-[0.98] disabled:opacity-60"
          >
            {enviando && <LoaderCircle className="size-4 animate-spin" />}
            {enviando ? 'Ingresando…' : 'Ingresar'}
          </button>
        </form>

        <Link to="/" className="mt-6 flex items-center justify-center gap-1.5 text-sm text-zinc-500 hover:text-white">
          <ArrowLeft className="size-4" /> Volver a la tienda
        </Link>
      </div>
    </div>
  );
}
