import { Routes, Route } from 'react-router-dom';
import Layout from './components/layout/Layout';
import DashboardPage from './pages/DashboardPage';
import AnalyzePage from './pages/AnalyzePage';
import IncidentsPage from './pages/IncidentsPage';
import SandboxPage from './pages/SandboxPage';
import SettingsPage from './pages/SettingsPage';
import LandingPage from './pages/LandingPage';

function App() {
  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route element={<Layout />}>
        <Route path="dashboard" element={<DashboardPage />} />
        <Route path="analyze" element={<AnalyzePage />} />
        <Route path="incidents" element={<IncidentsPage />} />
        <Route path="sandbox" element={<SandboxPage />} />
        <Route path="settings" element={<SettingsPage />} />
      </Route>
    </Routes>
  );
}

export default App;
