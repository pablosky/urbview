import { useAppStore } from '../../store/useAppStore';

export default function KpiPanel() {
  const { lampKpis, areaKm2, loading, error, areaInfo } = useAppStore();

  if (loading) return <p className="muted">Loading…</p>;
  if (error) return <p className="error">{error}</p>;
  if (!lampKpis) return <p className="muted">Draw an area to begin.</p>;

  const count = lampKpis.count ?? 0;
  const density = areaKm2 > 0 ? count / areaKm2 : 0;

  if (count === 0) {
    return (
      <div className="empty-state">
        <strong>No lamps found</strong>
        <p className="muted">
          There are no Overture street lamps inside the drawn area.
        </p>
      </div>
    );
  }

  return (
    <ul className="kpi-list">
      <li>
        <span className="kpi-label">Street lamps</span>
        <span className="kpi-value">{count.toLocaleString()}</span>
      </li>
      <li>
        <span className="kpi-label">Density</span>
        <span className="kpi-value">{density.toFixed(1)}<small> /km²</small></span>
      </li>
      <li>
        <span className="kpi-label">Area</span>
        <span className="kpi-value">{areaKm2.toFixed(2)}<small> km²</small></span>
      </li>
      <li className="kpi-source">
        source: {areaInfo?.source ?? 'district'}
      </li>
    </ul>
  );
}
