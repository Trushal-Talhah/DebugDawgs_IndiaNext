import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ScanSearch } from 'lucide-react';
import StatsOverview from '../components/dashboard/StatsOverview';
import RecentIncidents from '../components/dashboard/RecentIncidents';
import DashboardCharts from '../components/dashboard/DashboardCharts';
import { getIncidents, transformIncident } from '../lib/api';

function DashboardPage() {
  const [incidents, setIncidents] = useState([]);
  const [stats, setStats] = useState({
    threatsToday: 0,
    highRisk: 0,
    mediumRisk: 0,
    lowRisk: 0,
    blockedToday: 0,
    pendingReview: 0,
  });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      try {
        const data = await getIncidents(50);
        const transformed = data.map(transformIncident);
        setIncidents(transformed);

        // Calculate stats from real data
        const today = new Date().toDateString();
        const todayIncidents = transformed.filter(
          (inc) => new Date(inc.timestamp).toDateString() === today
        );

        setStats({
          threatsToday: todayIncidents.length,
          highRisk: todayIncidents.filter((inc) => inc.risk >= 70).length,
          mediumRisk: todayIncidents.filter((inc) => inc.risk >= 40 && inc.risk < 70).length,
          lowRisk: todayIncidents.filter((inc) => inc.risk < 40).length,
          blockedToday: todayIncidents.filter((inc) => inc.status === 'blocked' || inc.status === 'quarantined').length,
          pendingReview: todayIncidents.filter((inc) => inc.status === 'flagged').length,
        });
      } catch (err) {
        console.error('Failed to fetch dashboard data:', err);
      } finally {
        setIsLoading(false);
      }
    }

    fetchData();
  }, []);

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
      <StatsOverview stats={stats} isLoading={isLoading} />

      {/* Visual Charts */}
      <DashboardCharts stats={stats} incidents={incidents} />

      {/* Recent incidents */}
      {isLoading ? (
        <div className="bg-bg rounded-xl border border-border p-10 flex flex-col items-center justify-center gap-3">
          <div className="w-8 h-8 border-3 border-accent/20 border-t-accent rounded-full animate-spin" />
          <p className="text-sm text-muted">Loading incidents...</p>
        </div>
      ) : (
        <RecentIncidents incidents={incidents.slice(0, 5)} />
      )}
    </div>
  );
}

export default DashboardPage;
