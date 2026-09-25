import { useAppStore } from '../../store/useAppStore';

export default function FeatureCard() {
  const {
    selectedFeatureId,
    featureDetail,
    loadingFeature,
    setSelectedFeatureId,
  } = useAppStore();

  if (selectedFeatureId === null) return null;

  return (
    <div className="feature-card">
      <button
        className="feature-card-close"
        onClick={() => setSelectedFeatureId(null)}
        aria-label="Deselect"
      >
        ×
      </button>

      {loadingFeature && <p className="muted">Loading…</p>}

      {!loadingFeature && featureDetail && (
        <>
          <div className="feature-card-label">{featureDetail.label}</div>
          <div className="feature-card-formula">
            Street metres where distance(lamp, street) ≤ 25 m
          </div>
        </>
      )}

      {!loadingFeature && !featureDetail && (
        <p className="muted">Feature not in this area.</p>
      )}
    </div>
  );
}
