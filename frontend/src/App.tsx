import 'maplibre-gl/dist/maplibre-gl.css';
import './maplibre-gl-draw.css';
import './App.css';
import MapView from './components/Map/MapView';
import { useAppStore } from './store/useAppStore';

import KpiPanel from './components/Dashboard/KpiPanel';
import ChartPanel from './components/Dashboard/ChartPanel';
import FeatureCard from './components/Dashboard/FeatureCard';
import InsightsPanel from './components/Dashboard/InsightsPanel';
import { UserMenu } from './components/Auth/UserMenu';
// frontend/src/App.tsx (inside Dashboard)
import RecentSaves from './components/Dashboard/RecentSaves';

function Dashboard() {
  return (
    <div className="dashboard-container">
      <div className="panel">
        <h2>Street lamps</h2>
        <KpiPanel />
      </div>
      <div className="panel">
        <h2>Insights</h2>
        <InsightsPanel />
      </div>
      <div className="panel">
        <h2>Recent KPIs Saved</h2>
        <RecentSaves />
      </div>

      <div className="panel">
        <h2>Buildings by subtype</h2>
        <ChartPanel />
      </div>
      <div className="panel">
        <h2>Feature</h2>
        <FeatureCard />
      </div>

    </div>
  );
}

export default function App() {
  return (
    <div className="app-container">
      <div className="map-container" style={{ position: 'relative' }}>
        <MapView />

        {/* Floating user menu over the top-right of the map */}
        <div
          style={{
            position: 'absolute',
            top: '1rem',
            right: '1rem',
            zIndex: 20,
          }}
        >
          <UserMenu />
        </div>
      </div>
      <Dashboard />
    </div>
  );
}
