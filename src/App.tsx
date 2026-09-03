import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Layout } from './components/Layout';
import { DashboardPage } from './pages/DashboardPage';
import { NetworkPage } from './pages/NetworkPage';
import { ProposalsPage } from './pages/ProposalsPage';
import { AuditPage } from './pages/AuditPage';
import { SettingsPage } from './pages/SettingsPage';
import './styles/App.css';
import { API_BASE } from './config';

// Render's free tier spins the backend down when idle; ping it on load so it's warm by the time data fetches happen.
fetch(`${API_BASE}/health`).catch(() => {});


function App() {
  return (
    <BrowserRouter>
      <Layout>
        <Routes>
          <Route path="/" element={<DashboardPage />} />
          <Route path="/network" element={<NetworkPage />} />
          <Route path="/proposals" element={<ProposalsPage />} />
          <Route path="/audit" element={<AuditPage />} />
          <Route path="/settings" element={<SettingsPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Layout>
    </BrowserRouter>
  );
}

export default App;
