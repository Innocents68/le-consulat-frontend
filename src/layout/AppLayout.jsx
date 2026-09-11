import { useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import Topbar from './Topbar';
import { fetchMe } from '../features/auth/authApi';
import { useAuthStore } from '../store/authStore';

export default function AppLayout() {
  const setUser = useAuthStore((s) => s.setUser);

  // Refresh the cached user (role/établissement/etc.) once per app load — the persisted
  // session could be stale if an admin edited this account (e.g. changed établissement)
  // since the last login.
  useEffect(() => {
    fetchMe().then(setUser).catch(() => {});
  }, [setUser]);

  return (
    <div className="flex min-h-screen bg-cream dark:bg-night-900">
      <Sidebar />
      <div className="flex-1 min-w-0 flex flex-col">
        <Topbar />
        <main className="flex-1 p-4 sm:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
