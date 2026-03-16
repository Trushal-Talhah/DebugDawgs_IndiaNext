import { useState } from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  ScanSearch,
  FlaskConical,
  ShieldAlert,
  Settings,
  PanelLeftClose,
  PanelLeft,
} from 'lucide-react';

const NAV_ITEMS = [
  { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/analyze', icon: ScanSearch, label: 'Analyze' },
  { to: '/sandbox', icon: FlaskConical, label: 'Sandbox' },
  { to: '/incidents', icon: ShieldAlert, label: 'Incidents' },
  { to: '/settings', icon: Settings, label: 'Settings' },
];

function Sidebar() {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <aside
      className={`${
        collapsed ? 'w-16' : 'w-52'
      } bg-bg border-r border-border flex flex-col shrink-0 transition-[width] duration-200 ease-in-out`}
    >
      {/* Nav links */}
      <nav className="flex-1 py-3 flex flex-col gap-0.5 px-2" aria-label="Main navigation">
        {NAV_ITEMS.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium no-underline transition-colors ${
                isActive
                  ? 'bg-accent/10 text-accent'
                  : 'text-muted hover:text-text hover:bg-panel'
              }`
            }
            title={collapsed ? label : undefined}
            aria-label={label}
          >
            <Icon className="w-[18px] h-[18px] shrink-0" />
            {!collapsed && <span>{label}</span>}
          </NavLink>
        ))}
      </nav>

      {/* Collapse toggle */}
      <div className="px-2 py-3 border-t border-border">
        <button
          onClick={() => setCollapsed((c) => !c)}
          className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-muted hover:text-text hover:bg-panel transition-colors w-full"
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {collapsed ? (
            <PanelLeft className="w-[18px] h-[18px] shrink-0" />
          ) : (
            <>
              <PanelLeftClose className="w-[18px] h-[18px] shrink-0" />
              <span>Collapse</span>
            </>
          )}
        </button>
      </div>
    </aside>
  );
}

export default Sidebar;
