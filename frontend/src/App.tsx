import 'maplibre-gl/dist/maplibre-gl.css';
import './maplibre-gl-draw.css';
import './App.css';
import MapView from './components/Map/MapView';
import { useAppStore } from './store/useAppStore';

import KpiPanel from './components/Dashboard/KpiPanel';
import ChartPanel from './components/Dashboard/ChartPanel';
import FeatureCard from './components/Dashboard/FeatureCard';
import InsightsPanel from './components/Dashboard/InsightsPanel';
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

// function Dashboard() {
//   const { kpis, loading, error, areaInfo } = useAppStore();

//   return (
//     <div className="dashboard-container">
//       <div className="panel">
//         <h2>KPIs</h2>
//         {loading && <p>Loading…</p>}
//         {error && <p style={{ color: 'red' }}>{error}</p>}
//         {!loading && !error && kpis && (
//           <ul style={{ listStyle: 'none', display: 'grid', gap: 8 }}>
//             <li><strong>Total:</strong> {kpis.count ?? 0}</li>
//             {kpis.length_m !== undefined && (
//               <li><strong>Length:</strong> {(kpis.length_m / 1000).toFixed(2)} km</li>
//             )}
//             {kpis.area_m2 !== undefined && (
//               <li><strong>Area:</strong> {(kpis.area_m2 / 1e6).toFixed(3)} km²</li>
//             )}
//           </ul>
//         )}
//         {!loading && !error && !kpis && <p>Draw an area to begin.</p>}
//         <p style={{ marginTop: 12, fontSize: 12, color: '#64748b' }}>
//           {areaInfo?.source === 'geojson' ? 'Drawn area' : areaInfo?.source ?? 'Whole district'}
//         </p>
//       </div>

//       <div className="panel">
//         <h2>Chart</h2>
//         <p style={{ color: '#94a3b8' }}>Coming in Step 3…</p>
//       </div>
//     </div>
//   );
// }

export default function App() {
  return (
    <div className="app-container">
      <div className="map-container">
        <MapView />
      </div>
      <Dashboard />
    </div>
  );
}
