import { useEffect, useRef } from 'react';
import * as maplibregl from 'maplibre-gl';
import { MapLibreDraw } from '@birkskyum/maplibre-gl-draw';
import { useAppStore } from '../../store/useAppStore';

const CITY_CENTER: [number, number] = [2.158, 41.3868];
const CITY_ZOOM = 13;

const MAP_STYLE = {
  version: 8 as const,
  sources: {
    osm: {
      type: 'raster' as const,
      tiles: ['https://tile.openstreetmap.org/{z}/{x}/{y}.png'],
      tileSize: 256,
      attribution: '© OpenStreetMap contributors',
    },
  },
  layers: [{ id: 'osm', type: 'raster' as const, source: 'osm' }],
};

export default function MapView() {
  const mapContainer = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const drawRef = useRef<MapLibreDraw | null>(null);
  const {
    setDrawnPolygon,
    setSelectedFeatureId,
    lampFeatures,
    buildingsFeatures,
    selectedCategory,
    selectedFeatureId,
  } = useAppStore();

  // --- Init map, draw control, sources, layers (once) ---
  useEffect(() => {
    if (!mapContainer.current || mapRef.current) return;

    const map = new maplibregl.Map({
      container: mapContainer.current,
      style: MAP_STYLE,
      center: CITY_CENTER,
      zoom: CITY_ZOOM,
    });

    map.addControl(new maplibregl.NavigationControl(), 'top-right');

    const draw = new MapLibreDraw({
      displayControlsDefault: false,
      controls: { polygon: true, trash: true },
      defaultMode: 'simple_select',
    });
    map.addControl(draw, 'top-left');

    mapRef.current = map;
    drawRef.current = draw;

    map.on('load', () => {
      map.addSource('lamps', {
        type: 'geojson',
        data: { type: 'FeatureCollection', features: [] },
      });

      map.addLayer({
        id: 'lamps-layer',
        type: 'circle',
        source: 'lamps',
        paint: {
          'circle-radius': [
            'case',
            ['boolean', ['feature-state', 'selected'], false],
            9,
            5,
          ],
          'circle-color': [
            'case',
            ['boolean', ['feature-state', 'selected'], false],
            '#ef4444',
            '#2563eb',
          ],
          'circle-stroke-color': '#ffffff',
          'circle-stroke-width': 1.5,
          'circle-opacity': 0.85,
        },
      });

      map.addSource('buildings', {
        type: 'geojson',
        data: { type: 'FeatureCollection', features: [] },
      });
      map.addLayer({
        id: 'buildings-layer',
        type: 'fill',
        source: 'buildings',
        paint: {
          'fill-color': '#94a3b8',
          'fill-opacity': 0.35,
          'fill-outline-color': '#64748b',
        },
      });
    });

    map.on('draw.create', (e: any) => {
      const poly = e.features?.[0]?.geometry;
      if (poly) setDrawnPolygon(poly);
    });
    map.on('draw.update', (e: any) => {
      const poly = e.features?.[0]?.geometry;
      if (poly) setDrawnPolygon(poly);
    });
    map.on('draw.delete', () => setDrawnPolygon(null));

    map.on('click', 'lamps-layer', (e) => {
      const f = e.features?.[0];
      if (f && f.id !== undefined) setSelectedFeatureId(String(f.id));
    });

    map.on('click', (e) => {
      const hits = map.queryRenderedFeatures(e.point, {
        layers: ['lamps-layer'],
      });
      if (hits.length === 0) setSelectedFeatureId(null);
    });

    map.on('mouseenter', 'lamps-layer', () => {
      map.getCanvas().style.cursor = 'pointer';
    });
    map.on('mouseleave', 'lamps-layer', () => {
      map.getCanvas().style.cursor = '';
    });

    return () => {
      map.remove();
      mapRef.current = null;
      drawRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // --- Push lamp features into the map ---
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !map.isStyleLoaded()) return;
    const src = map.getSource('lamps') as maplibregl.GeoJSONSource | undefined;
    if (!src) return;
    src.setData(lampFeatures ?? { type: 'FeatureCollection', features: [] });
  }, [lampFeatures]);

  // --- Push building features into the map ---
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !map.isStyleLoaded()) return;
    const src = map.getSource('buildings') as maplibregl.GeoJSONSource | undefined;
    if (!src) return;
    src.setData(buildingsFeatures ?? { type: 'FeatureCollection', features: [] });
  }, [buildingsFeatures]);

  // --- Dim non-selected building categories ---
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !map.getLayer('buildings-layer')) return;
    if (selectedCategory) {
      map.setPaintProperty('buildings-layer', 'fill-opacity', [
        'case',
        ['==', ['get', 'category'], selectedCategory],
        0.65,
        0.08,
      ]);
    } else {
      map.setPaintProperty('buildings-layer', 'fill-opacity', 0.35);
    }
  }, [selectedCategory]);

  // --- Highlight the selected lamp ---
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !map.getLayer('lamps-layer')) return;
    if (selectedFeatureId !== null) {
      map.setFeatureState(
        { source: 'lamps', id: selectedFeatureId },
        { selected: true }
      );
    } else {
      map.querySourceFeatures('lamps').forEach((f) => {
        if (f.id !== undefined) {
          map.setFeatureState(
            { source: 'lamps', id: f.id },
            { selected: false }
          );
        }
      });
    }
  }, [selectedFeatureId]);

  return <div ref={mapContainer} style={{ width: '100%', height: '100%' }} />;
}
