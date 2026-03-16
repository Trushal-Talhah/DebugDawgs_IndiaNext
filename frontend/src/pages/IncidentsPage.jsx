import { useState, useEffect } from 'react';
import { Search, Filter, RefreshCw } from 'lucide-react';
import RecentIncidents from '../components/dashboard/RecentIncidents';
import { getIncidents, transformIncident } from '../lib/api';

const FILTER_OPTIONS = ['all', 'quarantined', 'blocked', 'flagged', 'cleared'];

function IncidentsPage() {
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [incidents, setIncidents] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  async function fetchIncidents() {
    setIsLoading(true);
    setError(null);
    try {
      const data = await getIncidents(100);
      setIncidents(data.map(transformIncident));
    } catch (err) {
      setError(err.message || 'Failed to load incidents');
      console.error('Failed to fetch incidents:', err);
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    fetchIncidents();
  }, []);

  const filtered = incidents.filter((inc) => {
    const matchesFilter = filter === 'all' || inc.status === filter;
    const matchesSearch =
      !search ||
      inc.source.toLowerCase().includes(search.toLowerCase()) ||
      inc.id.toLowerCase().includes(search.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  return (
    <div className="space-y-5 animate-fade-in">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-text">Incidents</h1>
          <p className="text-sm text-muted mt-0.5">All detected threats and their current status</p>
        </div>
        <button
          onClick={fetchIncidents}
          disabled={isLoading}
          className="flex items-center gap-2 px-3 py-2 text-sm text-muted hover:text-text border border-border rounded-lg hover:bg-panel transition-colors disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {/* Toolbar */}
      <div className="flex items-center gap-3 flex-wrap">
        {/* Search */}
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search incidents..."
            className="w-full pl-9 pr-3 py-2 text-sm bg-bg border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent"
            aria-label="Search incidents"
          />
        </div>

        {/* Filters */}
        <div className="flex items-center gap-1.5" role="group" aria-label="Filter by status">
          <Filter className="w-4 h-4 text-muted mr-1" />
          {FILTER_OPTIONS.map((option) => (
            <button
              key={option}
              onClick={() => setFilter(option)}
              className={`px-2.5 py-1 text-xs font-medium rounded-md capitalize transition-colors ${
                filter === option
                  ? 'bg-accent text-white'
                  : 'text-muted hover:text-text hover:bg-panel border border-border'
              }`}
              aria-pressed={filter === option}
            >
              {option}
            </button>
          ))}
        </div>
      </div>

      {/* Error state */}
      {error && (
        <div className="bg-danger-light rounded-xl border border-danger/20 p-5">
          <p className="text-sm text-danger font-medium">Failed to load incidents</p>
          <p className="text-sm text-danger/80 mt-1">{error}</p>
          <button
            onClick={fetchIncidents}
            className="mt-3 text-xs text-danger hover:text-danger/80 font-medium"
          >
            Try again
          </button>
        </div>
      )}

      {/* Loading state */}
      {isLoading && !error && (
        <div className="bg-bg rounded-xl border border-border p-10 flex flex-col items-center justify-center gap-3">
          <div className="w-8 h-8 border-3 border-accent/20 border-t-accent rounded-full animate-spin" />
          <p className="text-sm text-muted">Loading incidents...</p>
        </div>
      )}

      {/* Table */}
      {!isLoading && !error && (
        <>
          <RecentIncidents incidents={filtered} />

          {/* Count */}
          <p className="text-xs text-muted text-right">
            Showing {filtered.length} of {incidents.length} incidents
          </p>
        </>
      )}
    </div>
  );
}

export default IncidentsPage;
