import { useAppStore } from '../../store/useAppStore';

export default function FeatureCard() {
  const { lampFeatures, selectedFeatureId, setSelectedFeatureId } = useAppStore();

  if (!selectedFeatureId) return null;
  const feature = lampFeatures?.features.find(
    (f) => String(f.id) === selectedFeatureId
  );
  if (!feature) return null;

  const p = feature.properties ?? {};
  return (
    <div className="feature-card">
      <div className="feature-card-head">
        <strong>Selected feature</strong>
        <button onClick={() => setSelectedFeatureId(null)}>×</button>
      </div>
      <ul>
        <li><span>ID</span><span>{String(feature.id)}</span></li>
        {p.category && <li><span>Class</span><span>{p.category}</span></li>}
        <li><span>Contribution</span><span>1 of {(lampFeatures?.features.length ?? 0).toLocaleString()} lamps in area</span></li>
      </ul>
    </div>
  );
}
