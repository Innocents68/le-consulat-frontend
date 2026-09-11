import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate, useLocation } from 'react-router-dom';
import { Eye, EyeOff, Lock, User, Loader2, WineOff, ArrowRight } from 'lucide-react';
import { login } from '../features/auth/authApi';
import { useAuthStore } from '../store/authStore';
import api, { apiErrorMessage, fileUrl } from '../lib/api';
import loginImage from '../assets/login.jpg';

const ETABLISSEMENTS = ['Maquis', 'Restaurant', 'Cave à vin'];

export default function Login() {
  const navigate = useNavigate();
  const location = useLocation();
  const setAuth = useAuthStore((s) => s.login);
  // EF-043 : le logo/nom configurés dans les Paramètres doivent s'afficher dès l'écran de
  // connexion — endpoint public, accessible sans authentification.
  const { data: parametres } = useQuery({ queryKey: ['parametres-publics'], queryFn: async () => (await api.get('/parametres/publics')).data });
  const nom = parametres?.nomMagasin || 'LE CONSULAT';
  const [username, setUsername] = useState('admin');
  const [password, setPassword] = useState('admin123');
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
      const dest = location.state?.from?.pathname || '/';
      navigate(dest, { replace: true });
    } catch (err) {
      setError(apiErrorMessage(err, "Identifiants invalides ou serveur indisponible."));
    } finally {
      setLoading(false);
    }
  }

  const Logo = ({ className }) => (
    parametres?.logoUrl ? (
      <img src={fileUrl(parametres.logoUrl)} alt={nom} className={`${className} object-cover border-2 border-gold-light shadow-lg`} />
    ) : (
      <div className={`${className} bg-gold border-2 border-gold-light shadow-lg flex items-center justify-center text-bordeaux-950 font-black text-[10px] text-center leading-none`}>
        LE<br />CONSULAT
      </div>
    )
  );

  return (
    <div className="min-h-screen relative bg-night-900 overflow-hidden">
      {/* Full-bleed photo — a real dining scene, not a flat brand color */}
      <div
        className="hidden lg:block absolute inset-0 bg-cover animate-kenburns"
        style={{ backgroundImage: `url(${loginImage})`, backgroundPosition: 'center center' }}
      />
      <div className="hidden lg:block absolute inset-0 bg-gradient-to-t from-bordeaux-950/50 via-transparent to-bordeaux-950/20" />

      {/* Mobile header banner — shorter crop, same photo */}
      <div
        className="lg:hidden h-64 bg-cover relative"
        style={{ backgroundImage: `url(${loginImage})`, backgroundPosition: 'left center' }}
      >
        <div className="absolute inset-0 bg-gradient-to-b from-bordeaux-950/70 via-bordeaux-950/40 to-bordeaux-950/85" />
        <div className="relative h-full flex flex-col items-center justify-center gap-3 px-6 animate-fade-up">
          <Logo className="h-14 w-14 rounded-full" />
          <p className="text-lg font-extrabold text-cream-100 tracking-wide">{nom}</p>
          <p className="text-[11px] uppercase tracking-[0.25em] text-gold-light/90">Cave · Restaurant · Maquis</p>
        </div>
      </div>

      <div className="relative z-10 min-h-[calc(100vh-16rem)] lg:min-h-screen flex flex-col lg:flex-row">
        {/* Brand copy — sits over the photo's built-in dark gradient (left side of the image) */}
        <div className="hidden lg:flex flex-col justify-between w-[52%] p-14">
          <div className="flex items-center gap-4 animate-fade-up">
            <Logo className="h-16 w-16 rounded-full" />
            <div>
              <p className="text-2xl font-extrabold text-cream-100 tracking-wide">{nom}</p>
              <p className="text-xs uppercase tracking-[0.25em] text-gold-light/90">Cave · Restaurant · Maquis</p>
            </div>
          </div>

          <div className="animate-fade-up" style={{ animationDelay: '120ms' }}>
            <div className="h-px w-16 bg-gold mb-5" />
            <h1 className="font-display text-5xl font-bold text-cream-100 leading-[1.15] mb-4">
              L'art de recevoir,<br />piloté avec précision.
            </h1>
            <p className="text-cream-200/80 max-w-md text-[15px] leading-relaxed">
              Ventes, cuisine, cave à vin et finances réunis dans un seul espace élégant et rapide,
              pensé pour le rythme d'une vraie maison.
            </p>
            <div className="flex flex-wrap gap-2 mt-7">
              {ETABLISSEMENTS.map((e) => (
                <span key={e} className="text-xs font-semibold uppercase tracking-wider text-cream-100/90 bg-white/10 border border-white/20 rounded-full px-3.5 py-1.5 backdrop-blur-sm">
                  {e}
                </span>
              ))}
            </div>
          </div>

          <p className="text-xs text-cream-200/50 animate-fade-up" style={{ animationDelay: '200ms' }}>
            © {new Date().getFullYear()} {nom} — Tous droits réservés.
          </p>
        </div>

        {/* Floating form card — plenty of photo showing around it, like a hero booking widget */}
        <div className="flex-1 flex items-center justify-center p-6 lg:p-14">
          <div className="w-full max-w-sm animate-fade-up">
            <div className="bg-white rounded-2xl shadow-2xl ring-1 ring-black/5 p-8">
              <h2 className="font-display text-2xl font-bold text-ink mb-1">Bienvenue</h2>
              <p className="text-sm text-ink-light mb-7">Connectez-vous pour accéder à votre espace de gestion.</p>

              {error && (
                <div className="mb-4 rounded-lg bg-danger/10 border border-danger/30 text-danger text-sm px-3 py-2 flex items-start gap-2">
                  <WineOff size={16} className="mt-0.5 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              <form onSubmit={handleSubmit}>
                <div className="mb-4">
                  <label className="label">Identifiant</label>
                  <div className="relative group">
                    <User size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-light/50 group-focus-within:text-bordeaux-600 transition-colors" />
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
                <div className="mb-6">
                  <label className="label">Mot de passe</label>
                  <div className="relative group">
                    <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-light/50 group-focus-within:text-bordeaux-600 transition-colors" />
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
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-light/50 hover:text-ink transition-colors"
                      onClick={() => setShowPassword((v) => !v)}
                    >
                      {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  className="w-full py-3 rounded-lg bg-bordeaux-700 text-white font-semibold text-sm flex items-center justify-center gap-2 shadow-md hover:bg-bordeaux-800 hover:shadow-lg active:scale-[0.99] transition-all disabled:opacity-50 disabled:cursor-not-allowed group"
                  disabled={loading}
                >
                  {loading ? <Loader2 size={16} className="animate-spin" /> : null}
                  {loading ? 'Connexion...' : 'Se connecter'}
                  {!loading && <ArrowRight size={15} className="group-hover:translate-x-0.5 transition-transform" />}
                </button>
              </form>

              <div className="mt-6 pt-5 border-t border-black/5">
                {/* <p className="text-[11px] text-ink-light/60">Compte par défaut : <code className="font-mono">admin</code> / <code className="font-mono">admin123</code></p> */}
              </div>
            </div>
            <p className="lg:hidden text-center text-xs text-ink-light/50 mt-5">
              © {new Date().getFullYear()} {nom} — Tous droits réservés.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
