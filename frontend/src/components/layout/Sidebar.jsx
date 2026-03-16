import { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  ScanSearch,
  ShieldAlert,
  Settings,
  PanelLeftClose,
  PanelLeft,
  LogOut,
  Mail,
  Link as LinkIcon,
  MessageSquare,
  Image,
  FileText,
  Bot
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

const NAV_ITEMS = [
  { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  {
    to: '/analyze',
    icon: ScanSearch,
    label: 'Analyze',
    subItems: [
      { to: '/analyze?type=email', label: 'Email', icon: Mail },
      { to: '/analyze?type=general', label: 'General Input', icon: ScanSearch },
      { to: '/analyze?type=image', label: 'Deepfake Image', icon: Image },
    ]
  },
  { to: '/incidents', icon: ShieldAlert, label: 'Incidents' },
  { to: '/settings', icon: Settings, label: 'Settings' },
];

function Sidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const [analyzeExpanded, setAnalyzeExpanded] = useState(false);
  const { currentUser, logout } = useAuth();
  const navigate = useNavigate();

  async function handleLogout() {
    await logout();
    navigate('/login');
  }

  const displayName = currentUser?.displayName || currentUser?.email?.split('@')[0] || 'User';
  const email = currentUser?.email ?? '';
  const photoURL = currentUser?.photoURL;
  const initials = displayName
    .split(' ')
    .map((n) => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  return (
    <aside
      className={`${
        collapsed ? 'w-16' : 'w-52'
      } bg-bg border-r border-border flex flex-col shrink-0 transition-[width] duration-200 ease-in-out`}
    >
      {/* Nav links */}
      <nav className="flex-1 py-3 flex flex-col gap-0.5 px-2" aria-label="Main navigation">
        {NAV_ITEMS.map(({ to, icon: Icon, label, subItems }) => (
          <div key={label}>
            {subItems ? (
              <div
                className={`flex items-center justify-between px-3 py-2 rounded-lg text-sm font-medium cursor-pointer transition-colors ${
                  window.location.pathname.startsWith(to)
                    ? 'bg-accent/10 text-accent'
                    : 'text-muted hover:text-text hover:bg-panel'
                }`}
                onClick={() => {
                  if (collapsed) {
                    setCollapsed(false);
                    setAnalyzeExpanded(true);
                  } else {
                    setAnalyzeExpanded(!analyzeExpanded);
                  }
                  if (!window.location.pathname.startsWith(to)) {
                    navigate(to);
                  }
                }}
                title={collapsed ? label : undefined}
                aria-label={label}
              >
                <div className="flex items-center gap-3">
                  <Icon className="w-[18px] h-[18px] shrink-0" />
                  {!collapsed && <span>{label}</span>}
                </div>
                {!collapsed && (
                  <svg className={`w-4 h-4 transition-transform ${analyzeExpanded ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                )}
              </div>
            ) : (
              <NavLink
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
            )}

            {/* Sub-items drop down */}
            {subItems && analyzeExpanded && !collapsed && (
              <div className="flex flex-col gap-0.5 mt-1 mb-1 pl-9 pr-2">
                {subItems.map((sub) => {
                  // Determine exactly if this exact type is active
                  const isActive = window.location.pathname + window.location.search === sub.to;
                  const SubIcon = sub.icon;
                  return (
                    <NavLink
                      key={sub.to}
                      to={sub.to}
                      className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-medium no-underline transition-colors ${
                        isActive
                          ? 'text-accent bg-accent/5'
                          : 'text-muted hover:text-text hover:bg-panel'
                      }`}
                    >
                      <SubIcon className="w-4 h-4 shrink-0" />
                      <span>{sub.label}</span>
                    </NavLink>
                  );
                })}
              </div>
            )}
          </div>
        ))}
      </nav>

      {/* User card + logout */}
      <div className="px-2 pb-2 border-t border-border pt-2 space-y-1">
        {/* user info row */}
        {!collapsed && (
          <div className="flex items-center gap-2.5 px-3 py-2 rounded-lg bg-panel">
            {photoURL ? (
              <img src={photoURL} alt={displayName} className="w-7 h-7 rounded-full object-cover shrink-0" />
            ) : (
              <span className="w-7 h-7 rounded-full bg-accent/10 text-accent text-[11px] font-bold flex items-center justify-center shrink-0">
                {initials}
              </span>
            )}
            <div className="min-w-0 flex-1">
              <p className="text-xs font-semibold text-text truncate">{displayName}</p>
              <p className="text-[10px] text-muted truncate">{email}</p>
            </div>
          </div>
        )}

        {/* logout button */}
        <button
          onClick={handleLogout}
          className={`flex items-center gap-3 w-full px-3 py-2 rounded-lg text-sm text-danger hover:bg-danger/5 transition-colors`}
          title={collapsed ? 'Sign out' : undefined}
          aria-label="Sign out"
        >
          <LogOut className="w-[18px] h-[18px] shrink-0" />
          {!collapsed && <span>Sign out</span>}
        </button>

        {/* collapse toggle */}
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
