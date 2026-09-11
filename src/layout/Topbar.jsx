import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Menu, Moon, Sun, LogOut, ChevronDown, Search } from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import { useAppStore } from '../store/appStore';
import api from '../lib/api';

export default function Topbar() {
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const { darkMode, toggleDarkMode, setSidebarMobileOpen } = useAppStore();
  const [menuOpen, setMenuOpen] = useState(false);

  const today = new Intl.DateTimeFormat('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }).format(new Date());

  function handleLogout() {
    api.post('/auth/logout').catch(() => {});
    logout();
    navigate('/login');
  }

  return (
    <header className="sticky top-0 z-20 bg-cream/90 dark:bg-night-900/90 backdrop-blur border-b border-black/5 dark:border-white/10 px-4 sm:px-6 py-3 flex items-center gap-3">
      <button className="lg:hidden p-2 -ml-2 rounded-lg hover:bg-black/5" onClick={() => setSidebarMobileOpen(true)}>
        <Menu size={20} />
      </button>

      <div className="relative hidden sm:block flex-1 max-w-sm">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-light/50" />
        <input className="input pl-9 py-2 bg-white dark:bg-night-800" placeholder="Rechercher..." />
      </div>

      <div className="ml-auto flex items-center gap-1.5 sm:gap-3">
        <span className="hidden md:inline-flex items-center gap-1.5 text-xs font-medium text-ink-light dark:text-cream-300/70 bg-white dark:bg-night-800 border border-black/5 dark:border-white/10 rounded-lg px-3 py-2 capitalize">
          {today}
        </span>

        <button
          onClick={toggleDarkMode}
          className="p-2 rounded-lg hover:bg-black/5 dark:hover:bg-white/10 text-ink-light dark:text-cream-200"
          title="Basculer le mode sombre"
        >
          {darkMode ? <Sun size={18} /> : <Moon size={18} />}
        </button>

        <div className="relative">
          <button
            onClick={() => setMenuOpen((o) => !o)}
            className="flex items-center gap-2 pl-1.5 pr-2.5 py-1.5 rounded-lg hover:bg-black/5 dark:hover:bg-white/10"
          >
            <div className="h-8 w-8 rounded-full bg-bordeaux-700 text-white flex items-center justify-center text-xs font-bold shrink-0">
              {user?.avatarInitiales || user?.nom?.slice(0, 2)?.toUpperCase() || 'U'}
            </div>
            <div className="hidden sm:block text-left leading-tight">
              <p className="text-sm font-semibold text-ink dark:text-cream-100">{user?.nom || user?.username}</p>
            </div>
            <ChevronDown size={14} className="text-ink-light hidden sm:block" />
          </button>

          {menuOpen && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setMenuOpen(false)} />
              <div className="absolute right-0 mt-2 w-48 rounded-xl bg-white dark:bg-night-800 shadow-popover border border-black/5 dark:border-white/10 py-1.5 z-20">
                <button
                  className="w-full flex items-center gap-2 px-3.5 py-2 text-sm text-danger hover:bg-danger/5"
                  onClick={handleLogout}
                >
                  <LogOut size={15} /> Déconnexion
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
