import axios from 'axios';
import { create } from 'zustand';
import type { FeatureCollection, Polygon } from 'geojson';
import type { ApiResponse, AreaInfo, FeatureDetail, Kpi, LayerKpis } from '../types';

export const LAMP_LAYER = 'street_lamps';
export const CHART_LAYER = 'buildings';
export const STREETS_LAYER = 'streets';
export const DEFAULT_DISTRICT = 'eixample';

interface CategoryDatum {
  category: string;
  count: number;
  layer: string;
}

interface AppState {
  drawnPolygon: Polygon | null;
  selectedFeatureId: string | null;
  selectedCategory: string | null;

  areaInfo: AreaInfo | null;
  lampFeatures: FeatureCollection | null;
  buildingsFeatures: FeatureCollection | null;
  streetsFeatures: FeatureCollection | null;
  lampKpis: LayerKpis | null;
  categoryData: CategoryDatum[];
  areaKm2: number;

  kpis: Kpi[];
  insights: string[];

  featureDetail: FeatureDetail | null;
  loadingFeature: boolean;

  loading: boolean;
  error: string | null;

  setDrawnPolygon: (p: Polygon | null) => void;
  setSelectedFeatureId: (id: string | null) => Promise<void>;
  setSelectedCategory: (c: string | null) => void;
  fetchData: (p: Polygon | null) => Promise<void>;
}

const EMPTY_FC = (): FeatureCollection => ({ type: 'FeatureCollection', features: [] });

let drawTimer: ReturnType<typeof setTimeout> | null = null;
let inflight: AbortController | null = null;

export const useAppStore = create<AppState>((set, get) => ({
  drawnPolygon: null,
  selectedFeatureId: null,
  selectedCategory: null,
  areaInfo: null,
  lampFeatures: null,
  buildingsFeatures: null,
  streetsFeatures: null,
  lampKpis: null,
  categoryData: [],
  areaKm2: 0,
  kpis: [],
  insights: [],
  featureDetail: null,
  loadingFeature: false,
  loading: false,
  error: null,

  setDrawnPolygon: (polygon) => {
    set({ drawnPolygon: polygon, selectedFeatureId: null, featureDetail: null });
    if (drawTimer) clearTimeout(drawTimer);
    drawTimer = setTimeout(() => get().fetchData(polygon), 300);
  },

  setSelectedFeatureId: async (id) => {
    set({ selectedFeatureId: id, featureDetail: null });
    if (id === null) return;

    const state = get();
    set({ loadingFeature: true });
    try {
      const params = new URLSearchParams();
      const body: Record<string, unknown> = {};
      if (state.drawnPolygon) {
        body.geojson = state.drawnPolygon;
      } else {
        params.set('district', DEFAULT_DISTRICT);
      }
      const url = `/api/feature/${LAMP_LAYER}/${encodeURIComponent(id)}?${params.toString()}`;
      const { data } = await axios.post<FeatureDetail>(url, body);
      set({ featureDetail: data, loadingFeature: false });
    } catch {
      set({ featureDetail: null, loadingFeature: false });
    }
  },

  setSelectedCategory: (category) => {
    set({ selectedCategory: get().selectedCategory === category ? null : category });
  },

  fetchData: async (polygon) => {
    inflight?.abort();
    inflight = new AbortController();
    set({
      loading: true,
      error: null,
      selectedCategory: null,
      selectedFeatureId: null,
      featureDetail: null,
    });

    const params = new URLSearchParams({
      layers: `${LAMP_LAYER},${CHART_LAYER},${STREETS_LAYER}`,
    });
    const body: Record<string, unknown> = {};
    if (polygon) {
      body.geojson = polygon;
    } else {
      params.set('district', DEFAULT_DISTRICT);
    }

    try {
      const { data } = await axios.post<ApiResponse>(
        `/api/kpis/?${params.toString()}`,
        body,
        { signal: inflight.signal },
      );

      const vectors = data.layers?.vectors ?? [];
      const byName: Record<string, FeatureCollection> = Object.fromEntries(
        vectors.map((fc: any) => [fc.name, fc]),
      );

      const lampFeatures = byName[LAMP_LAYER] ?? EMPTY_FC();
      const buildingsFeatures = byName[CHART_LAYER] ?? EMPTY_FC();
      const streetsFeatures = byName[STREETS_LAYER] ?? EMPTY_FC();
      const lampKpis = data.by_layer?.[LAMP_LAYER] ?? null;

      const bucket = data.by_layer?.[CHART_LAYER]?.by_subtype ?? {};
      const categoryData: CategoryDatum[] = Object.entries(bucket)
        .map(([category, count]) => ({
          category,
          count: count as number,
          layer: CHART_LAYER,
        }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 8);

      set({
        areaInfo: data.area,
        areaKm2: data.area?.km2 ?? 0,
        lampFeatures,
        buildingsFeatures,
        streetsFeatures,
        lampKpis,
        categoryData,
        kpis: data.kpis ?? [],
        insights: data.insights ?? [],
        loading: false,
      });
    } catch (err: any) {
      if (err?.name === 'CanceledError' || err?.code === 'ERR_CANCELED') return;
      set({
        error: err.response?.data?.error ?? err.message ?? 'Request failed',
        loading: false,
      });
    }
  },
}));
