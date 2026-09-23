"""Resolve an area spec (district id, bbox, or GeoJSON polygon) to a WKT polygon."""
from __future__ import annotations

import json
from dataclasses import dataclass

# In production this is a model; here a static table.
DISTRICTS: dict[str, tuple[float, float, float, float]] = {
    "eixample": (2.16, 41.39, 2.18, 41.41),
    "gracia":   (2.15, 41.40, 2.17, 41.42),
}


@dataclass
class Area:
    wkt: str
    bbox: tuple[float, float, float, float]
    source: str


def _bbox_to_wkt(west: float, south: float, east: float, north: float) -> str:
    return (
        f"POLYGON(({west} {south}, {east} {south}, "
        f"{east} {north}, {west} {north}, {west} {south}))"
    )


def _geojson_ring_to_wkt(coords: list[list[float]]) -> str:
    ring = ", ".join(f"{x} {y}" for x, y in coords)
    if coords[0] != coords[-1]:
        ring += f", {coords[0][0]} {coords[0][1]}"
    return f"POLYGON(({ring}))"


def resolve(district: str | None, bbox: str | None, geojson: dict | None) -> Area:
    if district:
        key = district.lower()
        if key not in DISTRICTS:
            raise ValueError(f"unknown district: {district}")
        w, s, e, n = DISTRICTS[key]
        return Area(wkt=_bbox_to_wkt(w, s, e, n), bbox=(w, s, e, n), source=key)

    if bbox:
        w, s, e, n = (float(x) for x in bbox.split(","))
        return Area(wkt=_bbox_to_wkt(w, s, e, n), bbox=(w, s, e, n), source="bbox")

    if geojson:
        gtype = geojson.get("type")
        if gtype == "Polygon":
            ring = geojson["coordinates"][0]
            wkt = _geojson_ring_to_wkt(ring)
        elif gtype == "MultiPolygon":
            # take outer ring of each polygon, union them
            polys = []
            for poly in geojson["coordinates"]:
                ring = poly[0]
                ring_wkt = ", ".join(f"{x} {y}" for x, y in ring)
                polys.append(f"(({ring_wkt}))")
            wkt = f"MULTIPOLYGON({', '.join(polys)})"
        else:
            raise ValueError(f"unsupported GeoJSON type: {gtype}")

        xs = _all_xs(geojson)
        ys = _all_ys(geojson)
        return Area(
            wkt=wkt,
            bbox=(min(xs), min(ys), max(xs), max(ys)),
            source="geojson",
        )

    raise ValueError("one of district, bbox, or geojson is required")


def _all_xs(gj: dict) -> list[float]:
    return _flatten(gj["coordinates"], 0)


def _all_ys(gj: dict) -> list[float]:
    return _flatten(gj["coordinates"], 1)


def _flatten(coords, idx: int) -> list[float]:
    if isinstance(coords[0], (int, float)):
        return [coords[idx]]
    out = []
    for c in coords:
        out.extend(_flatten(c, idx))
    return out
