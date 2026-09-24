import type { Feature, FeatureCollection, Geometry } from 'geojson';

export interface AreaInfo {
  source: string;      // 'district' | 'bbox' | 'geojson' | ...
  bbox: [number, number, number, number];
}

// Union of all KPI shapes your layers can return. Extra keys are optional.
export interface LayerKpis {
  count: number;
  area_m2?: number;
  length_m?: number;
  avg_height?: number;
  by_class?: Record<string, number>;
  by_primary?: Record<string, number>;
  by_subtype?: Record<string, number>;
}

// Backend returns geometries as a list of {id, geometry, properties}
export interface RawFeature {
  id: string | number;
  geometry: Geometry;
  properties: { id: string | number; category: string | null };
}

export interface ApiResponse {
  area: AreaInfo;
  kpis: Record<string, LayerKpis>;
  geometry: Record<string, RawFeature[]>;
}

// After frontend conversion
export type FeatureCollectionOf<T> = FeatureCollection<Geometry, T>;
