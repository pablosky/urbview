import { useAppStore } from '../../store/useAppStore';

export default function KpiPanel() {
  const { kpis, areaKm2, loading, error, areaInfo } = useAppStore();

  if (loading) return <p className="muted">Loading…</p>;
  if (error) return <p className="error">{error}</p>;
  if (!kpis.length) return <p className="muted">Draw an area to begin.</p>;

  return (
    <ul className="kpi-list">
      {kpis.map((k) => (
        <li key={k.key} title={k.definition}>
          <span className="kpi-label">{k.label}</span>
          <span className="kpi-value">
            {typeof k.value === 'number' ? k.value.toLocaleString() : k.value}
            {k.unit && <small> {k.unit}</small>}
          </span>
          {k.band && <span className="kpi-band">{k.band}</span>}
        </li>
      ))}
      <li>
        <span className="kpi-label">Area</span>
        <span className="kpi-value">
          {areaKm2.toFixed(2)}<small> km²</small>
        </span>
      </li>
      <li className="kpi-source">
        source: {areaInfo?.source ?? 'district'}
      </li>
    </ul>
  );
}
