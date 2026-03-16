import { useState } from 'react';
import { Search, Filter } from 'lucide-react';
import RecentIncidents from '../components/dashboard/RecentIncidents';
import { SAMPLE_INCIDENTS } from '../data/sampleData';

const FILTER_OPTIONS = ['all', 'quarantined', 'blocked', 'flagged', 'cleared'];

function IncidentsPage() {
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');

  const filtered = SAMPLE_INCIDENTS.filter((inc) => {
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
      <div>
        <h1 className="text-xl font-semibold text-text">Incidents</h1>
        <p className="text-sm text-muted mt-0.5">All detected threats and their current status</p>
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

      {/* Table */}
      <RecentIncidents incidents={filtered} />

      {/* Count */}
      <p className="text-xs text-muted text-right">
        Showing {filtered.length} of {SAMPLE_INCIDENTS.length} incidents
      </p>
    </div>
  );
}

export default IncidentsPage;
