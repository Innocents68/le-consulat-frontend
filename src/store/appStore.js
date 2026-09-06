import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export const useAppStore = create(
  persist(
    (set, get) => ({
      darkMode: false,
      sidebarCollapsed: false,
      sidebarMobileOpen: false,
      toggleDarkMode: () => {
        const next = !get().darkMode;
        set({ darkMode: next });
        document.documentElement.classList.toggle('dark', next);
      },
      setDarkMode: (value) => {
        set({ darkMode: value });
        document.documentElement.classList.toggle('dark', value);
      },
      toggleSidebar: () => set({ sidebarCollapsed: !get().sidebarCollapsed }),
      setSidebarMobileOpen: (value) => set({ sidebarMobileOpen: value }),
    }),
    {
      name: 'consulat-app-ui',
      partialize: (state) => ({ darkMode: state.darkMode, sidebarCollapsed: state.sidebarCollapsed }),
      onRehydrateStorage: () => (state) => {
        if (state?.darkMode) {
          document.documentElement.classList.add('dark');
        }
      },
    }
  )
);
