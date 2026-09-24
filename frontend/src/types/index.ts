import type { Feature, FeatureCollection, Geometry } from 'geojson';

export interface AreaInfo {
  name: string;
  km2: number;
  bbox: [number, number, number, number];
  source: string;
}

export interface Kpi {
  key: string;
  label: string;
  value: number;
  unit: string;
  band?: string;
  definition: string;
}

export interface LayerKpis {
  count: number;
  area_m2?: number;
  length_m?: number;
  avg_height?: number;
  by_subtype?: Record<string, number>;
  by_class?: Record<string, number>;
  by_primary?: Record<string, number>;
}

export interface ApiResponse {
  area: AreaInfo;
  kpis: Kpi[];
  by_layer: Record<string, LayerKpis>;
  insights: string[];
  legend: any | null;
  layers: { vectors: FeatureCollection[] };
}
