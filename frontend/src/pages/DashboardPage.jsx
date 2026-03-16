import { Link } from 'react-router-dom';
import { ScanSearch } from 'lucide-react';
import StatsOverview from '../components/dashboard/StatsOverview';
import RecentIncidents from '../components/dashboard/RecentIncidents';
import { DASHBOARD_STATS, SAMPLE_INCIDENTS } from '../data/sampleData';

function DashboardPage() {
  return (
    <div className="space-y-6 animate-fade-in">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-text">Dashboard</h1>
          <p className="text-sm text-muted mt-0.5">Threat detection overview</p>
        </div>
        <Link
          to="/analyze"
          className="flex items-center gap-2 px-4 py-2.5 bg-accent text-white text-sm font-semibold rounded-lg hover:bg-accent/90 transition-colors no-underline"
        >
          <ScanSearch className="w-4 h-4" />
          Analyze Input
        </Link>
      </div>

      {/* Stats */}
      <StatsOverview stats={DASHBOARD_STATS} />

      {/* Recent incidents */}
      <RecentIncidents incidents={SAMPLE_INCIDENTS.slice(0, 5)} />
    </div>
  );
}

export default DashboardPage;
