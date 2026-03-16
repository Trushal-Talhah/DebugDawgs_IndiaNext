import { useRef, useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Search, Bell, X, LogOut, UserPlus, ChevronDown } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import logo from '../../logo.png';

function Header() {
  const { currentUser, logout, loginWithGoogle, loginWithGitHub } = useAuth();
  const navigate = useNavigate();
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [menuOpen, setMenuOpen] = useState(false);
  const [addAccountOpen, setAddAccountOpen] = useState(false);
  const menuRef = useRef(null);

  /* close dropdown on outside click */
  useEffect(() => {
    function handleClickOutside(e) {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setMenuOpen(false);
        setAddAccountOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  async function handleLogout() {
    setMenuOpen(false);
    await logout();
    navigate('/login');
  }

  async function handleAddAccount(provider) {
    setMenuOpen(false);
    setAddAccountOpen(false);
    try {
      if (provider === 'google') await loginWithGoogle();
      else await loginWithGitHub();
      navigate('/dashboard');
    } catch (err) {
      console.error('Add account error:', err);
    }
  }

  /* derive avatar info from currentUser */
  const displayName = currentUser?.displayName || currentUser?.email || 'User';
  const email = currentUser?.email ?? '';
  const photoURL = currentUser?.photoURL;
  const initials = displayName
    .split(' ')
    .map((n) => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  return (
    <header className="h-14 border-b border-border bg-bg flex items-center justify-between px-4 shrink-0">
        {/* Left: Logo */}
        <Link to="/" className="flex items-center text-text no-underline">
          <img src={logo} alt="SentinelAI" className="h-6 w-auto" />
        </Link>

      {/* Center: Search */}
      <div className="flex-1 max-w-md mx-8">
        {searchOpen ? (
          <div className="relative animate-fade-in">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search incidents, domains, IPs..."
              className="w-full pl-9 pr-8 py-1.5 text-sm bg-panel border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent"
              autoFocus
            />
            <button
              onClick={() => { setSearchOpen(false); setSearchQuery(''); }}
              className="absolute right-2 top-1/2 -translate-y-1/2 p-0.5 text-muted hover:text-text"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        ) : (
          <button
            onClick={() => setSearchOpen(true)}
            className="flex items-center gap-2 px-3 py-1.5 text-sm text-muted bg-panel border border-border rounded-lg hover:border-accent/40 transition-colors w-full"
          >
            <Search className="w-4 h-4" />
            <span>Search...</span>
          </button>
        )}
      </div>

      {/* Right: Notifications + Profile dropdown */}
      <div className="flex items-center gap-3">
        <button
          className="relative p-1.5 text-muted hover:text-text rounded-md hover:bg-panel transition-colors"
          aria-label="Notifications"
        >
          <Bell className="w-[18px] h-[18px]" />
          <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-danger rounded-full" />
        </button>

        {/* Avatar + dropdown */}
        <div className="relative" ref={menuRef}>
          <button
            onClick={() => setMenuOpen((v) => !v)}
            className="flex items-center gap-1.5 pl-1 pr-2 py-1 rounded-full hover:bg-panel transition-colors"
          >
            {photoURL ? (
              <img src={photoURL} alt={displayName} className="w-7 h-7 rounded-full object-cover" />
            ) : (
              <span className="w-7 h-7 rounded-full bg-accent text-white text-xs font-semibold flex items-center justify-center">
                {initials}
              </span>
            )}
            <ChevronDown className={`w-3.5 h-3.5 text-muted transition-transform ${menuOpen ? 'rotate-180' : ''}`} />
          </button>

          {/* Dropdown menu */}
          {menuOpen && (
            <div className="absolute right-0 top-full mt-2 w-64 bg-bg border border-border rounded-xl shadow-xl py-2 z-50 animate-fade-in">
              {/* User info */}
              <div className="px-4 py-3 border-b border-border">
                <div className="flex items-center gap-3">
                  {photoURL ? (
                    <img src={photoURL} alt={displayName} className="w-9 h-9 rounded-full object-cover" />
                  ) : (
                    <span className="w-9 h-9 rounded-full bg-accent/10 text-accent text-sm font-semibold flex items-center justify-center">
                      {initials}
                    </span>
                  )}
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-text truncate">{displayName}</p>
                    <p className="text-xs text-muted truncate">{email}</p>
                  </div>
                </div>
              </div>

              {/* Add another account */}
              <div className="px-2 py-1">
                <button
                  onClick={() => setAddAccountOpen((v) => !v)}
                  className="flex items-center gap-2.5 w-full px-3 py-2 rounded-lg text-sm text-text hover:bg-panel transition-colors"
                >
                  <UserPlus className="w-4 h-4 text-muted" />
                  <span className="flex-1 text-left">Add another account</span>
                  <ChevronDown className={`w-3.5 h-3.5 text-muted transition-transform ${addAccountOpen ? 'rotate-180' : ''}`} />
                </button>

                {addAccountOpen && (
                  <div className="mt-1 ml-3 pl-3 border-l border-border space-y-1">
                    <button
                      onClick={() => handleAddAccount('google')}
                      className="flex items-center gap-2.5 w-full px-3 py-2 rounded-lg text-sm text-text hover:bg-panel transition-colors"
                    >
                      <svg className="w-4 h-4" viewBox="0 0 24 24">
                        <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                        <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                        <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                        <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                      </svg>
                      Google
                    </button>
                    <button
                      onClick={() => handleAddAccount('github')}
                      className="flex items-center gap-2.5 w-full px-3 py-2 rounded-lg text-sm text-text hover:bg-panel transition-colors"
                    >
                      <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0 0 24 12c0-6.63-5.37-12-12-12z" />
                      </svg>
                      GitHub
                    </button>
                  </div>
                )}
              </div>

              {/* Divider + Logout */}
              <div className="px-2 pt-1 mt-1 border-t border-border">
                <button
                  onClick={handleLogout}
                  className="flex items-center gap-2.5 w-full px-3 py-2 rounded-lg text-sm text-danger hover:bg-danger/5 transition-colors"
                >
                  <LogOut className="w-4 h-4" />
                  Sign out
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}

export default Header;
