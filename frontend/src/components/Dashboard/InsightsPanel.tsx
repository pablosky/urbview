import { useAppStore } from '../../store/useAppStore';

export default function InsightsPanel() {
  const { insights, loading, error } = useAppStore();

  if (loading || error || insights.length === 0) return null;

  return (
    <div className="insights-panel">
      <ul className="insights-list">
        {insights.map((s, i) => (
          <li key={i}>{s}</li>
        ))}
      </ul>
    </div>
  );
}
