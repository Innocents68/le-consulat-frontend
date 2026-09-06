import { useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { ChevronDown, PanelLeftClose, PanelLeftOpen, X } from 'lucide-react';
import { NAV_GROUPS } from './navConfig';
import { useAppStore } from '../store/appStore';
import { usePermissions } from '../hooks/usePermissions';

function LogoBadge({ collapsed }) {
  return (
    <div className={`flex items-center gap-3 px-4 py-5 ${collapsed ? 'justify-center px-2' : ''}`}>
      <div className="shrink-0 h-11 w-11 rounded-full bg-gold/90 border-2 border-gold-light flex items-center justify-center text-bordeaux-900 font-black text-[9px] leading-none text-center">
        LE<br />CONSULAT
      </div>
      {!collapsed && (
        <div className="leading-tight">
          <p className="font-extrabold tracking-wide text-white text-[15px]">LE CONSULAT</p>
          <p className="text-[10px] uppercase tracking-[0.15em] text-cream-200/70">Cave - Restaurant</p>
        </div>
      )}
    </div>
  );
}

function GroupLink({ item, collapsed, onNavigate }) {
  return (
    <NavLink
      to={item.to}
      onClick={onNavigate}
      className={({ isActive }) =>
        `flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${collapsed ? 'justify-center px-2' : ''} ${
          isActive
            ? 'bg-white/15 text-white shadow-inner border-l-2 border-gold'
            : 'text-cream-100/80 hover:bg-white/10 hover:text-white'
        }`
      }
      title={collapsed ? item.label : undefined}
    >
      <item.icon size={18} className="shrink-0" />
      {!collapsed && <span className="truncate">{item.label}</span>}
    </NavLink>
  );
}

function GroupWithChildren({ group, collapsed, onNavigate }) {
  const location = useLocation();
  const containsActive = group.items.some((it) => location.pathname.startsWith(it.to));
  const [open, setOpen] = useState(containsActive);

  if (collapsed) {
    return (
      <div className="relative group/nav">
        <button
          className={`w-full flex items-center justify-center rounded-lg px-2 py-2.5 text-sm font-medium transition-colors ${
            containsActive ? 'bg-white/15 text-white' : 'text-cream-100/80 hover:bg-white/10 hover:text-white'
          }`}
          title={group.label}
        >
          <group.icon size={18} />
        </button>
        <div className="hidden group-hover/nav:block absolute left-full top-0 ml-1 w-52 rounded-lg bg-bordeaux-800 shadow-popover py-1.5 z-50 border border-white/10">
          {group.items.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              onClick={onNavigate}
              className={({ isActive }) =>
                `block px-3 py-2 text-sm ${isActive ? 'text-gold font-semibold' : 'text-cream-100/85 hover:text-white'}`
              }
            >
              {item.label}
            </NavLink>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div>
      <button
        onClick={() => setOpen((o) => !o)}
        className={`w-full flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
          containsActive ? 'text-white' : 'text-cream-100/80 hover:bg-white/10 hover:text-white'
        }`}
      >
        <group.icon size={18} className="shrink-0" />
        <span className="flex-1 text-left truncate">{group.label}</span>
        <ChevronDown size={15} className={`transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <div className="ml-4 mt-0.5 mb-1 flex flex-col gap-0.5 border-l border-white/15 pl-3">
          {group.items.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              onClick={onNavigate}
              className={({ isActive }) =>
                `flex items-center gap-2 rounded-md px-2.5 py-1.5 text-[13px] font-medium transition-colors ${
                  isActive ? 'bg-white/15 text-white border-l-2 border-gold -ml-[2px] pl-[10px]' : 'text-cream-100/70 hover:bg-white/10 hover:text-white'
                }`
              }
            >
              <item.icon size={15} className="shrink-0" />
              <span className="truncate">{item.label}</span>
            </NavLink>
          ))}
        </div>
      )}
    </div>
  );
}

export default function Sidebar() {
  const { sidebarCollapsed, toggleSidebar, sidebarMobileOpen, setSidebarMobileOpen } = useAppStore();
  const { canView } = usePermissions();

  const visibleGroups = NAV_GROUPS
    .map((g) => {
      if (g.items) {
        const items = g.items.filter((it) => canView(it.module));
        if (items.length === 0) return null;
        return { ...g, items };
      }
      return canView(g.module) ? g : null;
    })
    .filter(Boolean);

  const closeMobile = () => setSidebarMobileOpen(false);

  return (
    <>
      {/* Mobile overlay */}
      {sidebarMobileOpen && (
        <div className="fixed inset-0 bg-black/50 z-40 lg:hidden" onClick={closeMobile} />
      )}

      <aside
        className={`fixed lg:sticky top-0 z-50 lg:z-30 h-screen bg-bordeaux-700 dark:bg-night-900 flex flex-col transition-all duration-200 shrink-0
          ${sidebarCollapsed ? 'lg:w-[76px]' : 'lg:w-[248px]'}
          ${sidebarMobileOpen ? 'translate-x-0 w-[260px]' : '-translate-x-full w-[260px] lg:translate-x-0'}
        `}
      >
        <button
          className="lg:hidden absolute top-3 right-3 text-white/80 p-1.5 rounded-lg hover:bg-white/10"
          onClick={closeMobile}
        >
          <X size={18} />
        </button>

        <LogoBadge collapsed={sidebarCollapsed} />

        <nav className="flex-1 overflow-y-auto px-2.5 flex flex-col gap-1 pb-4">
          {visibleGroups.map((g) =>
            g.items ? (
              <GroupWithChildren key={g.id} group={g} collapsed={sidebarCollapsed} onNavigate={closeMobile} />
            ) : (
              <GroupLink key={g.id} item={g} collapsed={sidebarCollapsed} onNavigate={closeMobile} />
            )
          )}
        </nav>

        <div className="hidden lg:flex items-center justify-center border-t border-white/10 py-2">
          <button
            onClick={toggleSidebar}
            className="text-cream-100/70 hover:text-white p-2 rounded-lg hover:bg-white/10"
            title={sidebarCollapsed ? 'Étendre' : 'Réduire'}
          >
            {sidebarCollapsed ? <PanelLeftOpen size={18} /> : <PanelLeftClose size={18} />}
          </button>
        </div>
      </aside>
    </>
  );
}
