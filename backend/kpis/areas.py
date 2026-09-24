"""Resolve an area spec (district id, bbox, or GeoJSON polygon) to a WKT polygon."""
from __future__ import annotations

from dataclasses import dataclass

DISTRICTS: dict[str, tuple[float, float, float, float]] = {
    "eixample": (2.16, 41.39, 2.18, 41.41),
    "gracia":   (2.15, 41.40, 2.17, 41.42),
}


@dataclass
class Area:
    name: str
    wkt: str
    bbox: tuple[float, float, float, float]
    source: str


def _bbox_to_wkt(w: float, s: float, e: float, n: float) -> str:
    return (
        f"POLYGON(({w} {s}, {e} {s}, "
        f"{e} {n}, {w} {n}, {w} {s}))"
    )


def _geojson_ring_to_wkt(coords) -> str:
    ring = ", ".join(f"{float(x)} {float(y)}" for x, y in coords)
    if coords[0] != coords[-1]:
        ring += f", {float(coords[0][0])} {float(coords[0][1])}"
    return f"POLYGON(({ring}))"


def resolve(district: str | None, bbox: str | None, geojson: dict | None) -> Area:
    if district:
        key = district.lower()
        if key not in DISTRICTS:
            raise ValueError(f"unknown district: {district}")
        w, s, e, n = DISTRICTS[key]
        return Area(
            name=key.title(),
            wkt=_bbox_to_wkt(w, s, e, n),
            bbox=(w, s, e, n),
            source=key,
        )

    if bbox:
        w, s, e, n = (float(x) for x in bbox.split(","))
        return Area(
            name="Custom area",
            wkt=_bbox_to_wkt(w, s, e, n),
            bbox=(w, s, e, n),
            source="bbox",
        )

    if geojson:
        gtype = geojson.get("type")
        if gtype == "Polygon":
            wkt = _geojson_ring_to_wkt(geojson["coordinates"][0])
        elif gtype == "MultiPolygon":
            polys = []
            for poly in geojson["coordinates"]:
                ring = ", ".join(f"{float(x)} {float(y)}" for x, y in poly[0])
                polys.append(f"(({ring}))")
            wkt = f"MULTIPOLYGON({', '.join(polys)})"
        else:
            raise ValueError(f"unsupported GeoJSON type: {gtype}")

        xs, ys = _flatten(geojson["coordinates"], 0), _flatten(geojson["coordinates"], 1)
        return Area(
            name="Custom area",
            wkt=wkt,
            bbox=(min(xs), min(ys), max(xs), max(ys)),
            source="geojson",
        )

    raise ValueError("one of district, bbox, or geojson is required")


def _flatten(coords, idx: int) -> list[float]:
    if isinstance(coords[0], (int, float)):
        return [float(coords[idx])]
    out: list[float] = []
    for c in coords:
        out.extend(_flatten(c, idx))
    return out
