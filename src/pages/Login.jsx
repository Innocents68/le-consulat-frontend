import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Eye, EyeOff, Lock, User, Loader2, WineOff } from 'lucide-react';
import { login } from '../features/auth/authApi';
import { useAuthStore } from '../store/authStore';
import { apiErrorMessage } from '../lib/api';

const DEMO_ACCOUNTS = [
  { username: 'admin', role: 'Administrateur' },
  { username: 'jean', role: 'Caissier' },
  { username: 'mariam', role: 'Serveuse' },
  { username: 'paul', role: 'Manager' },
  { username: 'sophie', role: 'Comptable' },
];

export default function Login() {
  const navigate = useNavigate();
  const location = useLocation();
  const setAuth = useAuthStore((s) => s.login);
  const [username, setUsername] = useState('admin');
  const [password, setPassword] = useState('password123');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const data = await login(username, password);
      setAuth(data.token, data.user);
      const dest = location.state?.from?.pathname || '/dashboard';
      navigate(dest, { replace: true });
    } catch (err) {
      setError(apiErrorMessage(err, "Identifiants invalides ou serveur indisponible."));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex bg-bordeaux-900 relative overflow-hidden">
      <div className="absolute inset-0 opacity-[0.06] bg-[radial-gradient(circle_at_20%_20%,white,transparent_45%),radial-gradient(circle_at_80%_80%,white,transparent_45%)]" />

      {/* Left branding panel */}
      <div className="hidden lg:flex flex-col justify-between w-1/2 p-12 relative z-10">
        <div className="flex items-center gap-4">
          <div className="h-16 w-16 rounded-full bg-gold border-2 border-gold-light flex items-center justify-center text-bordeaux-900 font-black text-[10px] text-center leading-none">
            LE<br />CONSULAT
          </div>
          <div>
            <p className="text-2xl font-extrabold text-white tracking-wide">LE CONSULAT</p>
            <p className="text-xs uppercase tracking-[0.2em] text-cream-200/70">Cave - Restaurant</p>
          </div>
        </div>
        <div>
          <h1 className="text-4xl font-extrabold text-white leading-tight mb-3">
            Gestion intégrée de<br />votre établissement
          </h1>
          <p className="text-cream-200/70 max-w-md">
            Ventes, restaurant, cave à vin, maquis, stocks et finances,
            réunis dans un seul outil rapide et fiable.
          </p>
        </div>
        <p className="text-xs text-cream-200/50">© {new Date().getFullYear()} Le Consulat — Tous droits réservés.</p>
      </div>

      {/* Right form panel */}
      <div className="flex-1 flex items-center justify-center p-6 relative z-10">
        <div className="w-full max-w-sm bg-cream rounded-2xl shadow-popover p-8">
          <div className="lg:hidden flex items-center gap-3 mb-6 justify-center">
            <div className="h-12 w-12 rounded-full bg-gold border-2 border-gold-light flex items-center justify-center text-bordeaux-900 font-black text-[8px] text-center leading-none">
              LE<br />CONSULAT
            </div>
            <p className="text-lg font-extrabold text-bordeaux-800">LE CONSULAT</p>
          </div>

          <h2 className="text-xl font-extrabold text-ink mb-1">Connexion</h2>
          <p className="text-sm text-ink-light mb-6">Accédez à votre espace de gestion.</p>

          {error && (
            <div className="mb-4 rounded-lg bg-danger/10 border border-danger/30 text-danger text-sm px-3 py-2 flex items-start gap-2">
              <WineOff size={16} className="mt-0.5 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div className="mb-4">
              <label className="label">Identifiant</label>
              <div className="relative">
                <User size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-light/50" />
                <input
                  className="input pl-9"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="admin"
                  autoFocus
                  required
                />
              </div>
            </div>
            <div className="mb-5">
              <label className="label">Mot de passe</label>
              <div className="relative">
                <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-light/50" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  className="input pl-9 pr-9"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                />
                <button
                  type="button"
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-light/50"
                  onClick={() => setShowPassword((v) => !v)}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <button type="submit" className="btn-primary w-full py-2.5" disabled={loading}>
              {loading ? <Loader2 size={16} className="animate-spin" /> : null}
              {loading ? 'Connexion...' : 'Se connecter'}
            </button>
          </form>

          <div className="mt-6 pt-5 border-t border-black/5">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-ink-light/70 mb-2">Comptes de démonstration</p>
            <div className="flex flex-wrap gap-1.5">
              {DEMO_ACCOUNTS.map((acc) => (
                <button
                  key={acc.username}
                  type="button"
                  onClick={() => { setUsername(acc.username); setPassword('password123'); }}
                  className="text-[11px] px-2.5 py-1 rounded-full bg-white border border-black/10 hover:border-bordeaux-300 hover:text-bordeaux-700 text-ink-light"
                >
                  {acc.username} · {acc.role}
                </button>
              ))}
            </div>
            <p className="text-[11px] text-ink-light/60 mt-2">Mot de passe pour tous : <code className="font-mono">password123</code></p>
          </div>
        </div>
      </div>
    </div>
  );
}
