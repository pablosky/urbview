import axios from 'axios';
import { create } from 'zustand';
import type { Feature, FeatureCollection, Polygon } from 'geojson';
import type { ApiResponse, AreaInfo, LayerKpis } from '../types';

export const LAMP_LAYER = 'street_lamps';
export const CHART_LAYER = 'buildings';

interface CategoryDatum {
  category: string;
  count: number;
  layer: string;  // 'buildings' | 'street_lamps'
}

interface AppState {
  drawnPolygon: Polygon | null;
  selectedFeatureId: string | null;
  selectedCategory: string | null;

  areaInfo: AreaInfo | null;
  lampFeatures: FeatureCollection | null;
  lampKpis: LayerKpis | null;
  categoryData: CategoryDatum[];
  areaKm2: number;

  loading: boolean;
  error: string | null;

  setDrawnPolygon: (p: Polygon | null) => void;
  setSelectedFeatureId: (id: string | null) => void;
  setSelectedCategory: (c: string | null) => void;
  fetchData: (p: Polygon | null) => Promise<void>;
}

function toFeatureCollection(raw: any[]): FeatureCollection {
  return {
    type: 'FeatureCollection',
    features: raw.map<Feature>((r) => ({
      type: 'Feature',
      id: r.id,
      geometry: r.geometry,
      properties: r.properties ?? { id: r.id, category: null },
    })),
  };
}

// Shoelace + haversine, in km² — used only if backend didn't return area.
function polygonAreaKm2(poly: Polygon | null): number {
  if (!poly) return 0;
  const ring = poly.coordinates[0] as [number, number][];
  if (ring.length < 3) return 0;
  const R = 6371;
  let area = 0;
  for (let i = 0; i < ring.length - 1; i++) {
    const [x1, y1] = ring[i];
    const [x2, y2] = ring[i + 1];
    area += ((x2 - x1) * Math.PI / 180) *
            (2 + Math.sin(y1 * Math.PI / 180) + Math.sin(y2 * Math.PI / 180));
  }
  return Math.abs((area * R * R) / 2);
}

export const useAppStore = create<AppState>((set, get) => ({
  drawnPolygon: null,
  selectedFeatureId: null,
  selectedCategory: null,
  areaInfo: null,
  lampFeatures: null,
  lampKpis: null,
  categoryData: [],
  areaKm2: 0,
  loading: false,
  error: null,

  setDrawnPolygon: (polygon) => {
    set({ drawnPolygon: polygon, selectedFeatureId: null });
    get().fetchData(polygon);
  },
  setSelectedFeatureId: (id) => set({ selectedFeatureId: id }),
  setSelectedCategory: (category) => {
    set({ selectedCategory: get().selectedCategory === category ? null : category });
  },

  fetchData: async (polygon) => {
    set({ loading: true, error: null, selectedCategory: null, selectedFeatureId: null });
    try {
      const { data } = await axios.post<ApiResponse>(
        `/api/kpis/?layers=${LAMP_LAYER},${CHART_LAYER}`,
        { geojson: polygon ?? null }
      );

      const lampRaw = data.geometry?.[LAMP_LAYER] ?? [];
      const lampFeatures = toFeatureCollection(lampRaw);
      const lampKpis = data.kpis?.[LAMP_LAYER] ?? null;

      const chartBucket = data.kpis?.[CHART_LAYER]?.by_subtype ?? {};
      const categoryData: CategoryDatum[] = Object.entries(chartBucket)
        .map(([category, count]) => ({
          category,
          count: count as number,
          layer: CHART_LAYER,
        }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 8); // top 8 categories keeps the chart legible

      const areaKm2 = polygon
        ? polygonAreaKm2(polygon)
        : 25; // fallback district size for whole-district view

      set({
        areaInfo: data.area,
        lampFeatures,
        lampKpis,
        categoryData,
        areaKm2,
        loading: false,
      });
    } catch (err: any) {
      set({
        error: err.response?.data?.error ?? err.message ?? 'Request failed',
        loading: false,
      });
    }
  },
}));
