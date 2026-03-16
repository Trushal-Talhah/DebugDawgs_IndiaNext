import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Search, Bell, Shield, X } from 'lucide-react';

function Header() {
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  return (
    <header className="h-14 border-b border-border bg-bg flex items-center justify-between px-4 shrink-0">
      {/* Left: Logo */}
      <Link to="/" className="flex items-center gap-2 text-text no-underline">
        <Shield className="w-5 h-5 text-accent" strokeWidth={2.5} />
        <span className="font-semibold text-base tracking-tight">SentinelAI</span>
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
              aria-label="Global search"
            />
            <button
              onClick={() => { setSearchOpen(false); setSearchQuery(''); }}
              className="absolute right-2 top-1/2 -translate-y-1/2 p-0.5 text-muted hover:text-text"
              aria-label="Close search"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        ) : (
          <button
            onClick={() => setSearchOpen(true)}
            className="flex items-center gap-2 px-3 py-1.5 text-sm text-muted bg-panel border border-border rounded-lg hover:border-accent/40 transition-colors w-full"
            aria-label="Open search"
          >
            <Search className="w-4 h-4" />
            <span>Search...</span>
            <kbd className="ml-auto text-xs bg-bg border border-border rounded px-1.5 py-0.5 font-mono text-muted">⌘K</kbd>
          </button>
        )}
      </div>

      {/* Right: Notifications + Profile */}
      <div className="flex items-center gap-3">
        <button
          className="relative p-1.5 text-muted hover:text-text rounded-md hover:bg-panel transition-colors"
          aria-label="Notifications"
        >
          <Bell className="w-4.5 h-4.5" />
          <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-danger rounded-full" />
        </button>

        <button
          className="w-7 h-7 rounded-full bg-accent text-white text-xs font-semibold flex items-center justify-center hover:opacity-90 transition-opacity"
          aria-label="User profile"
        >
          JD
        </button>
      </div>
    </header>
  );
}

export default Header;
