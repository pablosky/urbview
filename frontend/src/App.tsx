import React from 'react';
import 'maplibre-gl/dist/maplibre-gl.css';
import '@mapbox/mapbox-gl-draw/dist/mapbox-gl-draw.css';
import './App.css';

// Placeholders for our components
const MapView = () => <div className="map-container">Map will go here</div>;
const Dashboard = () => (
  <div className="dashboard-container">
    <div className="panel">
      <h2>KPIs</h2>
      <p>Loading state will go here...</p>
    </div>
    <div className="panel">
      <h2>Chart</h2>
      <p>Chart will go here...</p>
    </div>
  </div>
);

function App() {
  return (
    <div className="app-container">
      <MapView />
      <Dashboard />
    </div>
  );
}

export default App;
