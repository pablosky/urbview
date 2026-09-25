"""DuckDB access layer. All clipping + aggregation happens in SQL."""
from __future__ import annotations

import json
from pathlib import Path
from typing import Any

import duckdb

DATA_DIR = Path(__file__).resolve().parent.parent / "data"

# We assume source parquet stores lon/lat (GeoJSON convention).
# If yours stores lat/lon, wrap geometries with ST_FlipCoordinates in _metric().
SRC_CRS = "EPSG:4326"
METRIC_CRS = "EPSG:32631"  # UTM 31N — metres; covers Barcelona.

LAYERS: dict[str, dict[str, Any]] = {
    "buildings": {
        "file": "buildings.parquet",
        "geom": "geometry",
        "group_by": "subtype",
        "props": ["height", "subtype"],
    },
    "streets": {
        "file": "streets.parquet",
        "geom": "geometry",
        "group_by": "class",
        "props": ["class"],
    },
    "places": {
        "file": "places.parquet",
        "geom": "geometry",
        "group_by": "categories.primary",
        "props": ["categories.primary"],
    },
    "land_use": {
        "file": "land_use.parquet",
        "geom": "geometry",
        "group_by": "subtype",
        "props": ["subtype"],
    },
    "water": {
        "file": "water.parquet",
        "geom": "geometry",
        "group_by": None,
        "props": [],
    },
    "infrastructure": {
        "file": "infrastructure.parquet",
        "geom": "geometry",
        "group_by": "subtype",
        "props": ["subtype", "class"],
    },
    "street_lamps": {
        "file": "infrastructure.parquet",
        "geom": "geometry",
        "group_by": None,
        "where": "class = 'street_lamp' AND subtype = 'transportation'",
        "props": ["class", "subtype"],
    },
}


def connect() -> duckdb.DuckDBPyConnection:
    con = duckdb.connect()
    con.execute("INSTALL spatial; LOAD spatial;")
    return con


def _metric(geom_expr: str) -> str:
    """Reproject a WGS84 geometry expression into metres (METRIC_CRS)."""
    return f"ST_Transform({geom_expr}, '{SRC_CRS}', '{METRIC_CRS}')"


def _where_clause(spec: dict[str, Any], area_geom_sql: str) -> str:
    parts = [f"ST_Intersects(t.{spec['geom']}, {area_geom_sql})"]
    if spec.get("where"):
        parts.append(spec["where"])
    return " AND ".join(parts)


# ---------------------------------------------------------------- scalar KPIs

def area_km2(con: duckdb.DuckDBPyConnection, area_geom_sql: str) -> float:
    q = f"SELECT ST_Area_Spheroid({area_geom_sql}) / 1e6"
    return float(con.execute(q).fetchone()[0])


def lit_street_share(
    con: duckdb.DuckDBPyConnection, area_geom_sql: str
) -> dict[str, float]:
    """Share of street-centreline metres that lie within 25 m of a street lamp."""
    streets = DATA_DIR / LAYERS["streets"]["file"]
    infra = DATA_DIR / LAYERS["infrastructure"]["file"]
    sql = f"""
        WITH area AS (SELECT {area_geom_sql} AS g),
        streets_m AS (
            SELECT {_metric(f"ST_Intersection(s.geometry, (SELECT g FROM area))")} AS g
            FROM read_parquet('{streets}') s
            WHERE ST_Intersects(s.geometry, (SELECT g FROM area))
        ),
        lamps_m AS (
            SELECT {_metric("l.geometry")} AS g
            FROM read_parquet('{infra}') l
            WHERE l.class = 'street_lamp' AND l.subtype = 'transportation'
              AND ST_Intersects(l.geometry, (SELECT g FROM area))
        )
        SELECT
            COALESCE(SUM(ST_Length(s.g)), 0) AS total_m,
            COALESCE(SUM(
                CASE WHEN EXISTS (
                    SELECT 1 FROM lamps_m l WHERE ST_DWithin(s.g, l.g, 25)
                ) THEN ST_Length(s.g) ELSE 0 END
            ), 0) AS lit_m
        FROM streets_m s
    """
    total_m, lit_m = con.execute(sql).fetchone()
    total_m, lit_m = float(total_m), float(lit_m)
    pct = round(lit_m / total_m * 100, 1) if total_m else 0.0
    return {"total_m": total_m, "lit_m": lit_m, "pct": pct}


# ---------------------------------------------------------------- raw per-layer

def kpis_for_layer(
    con: duckdb.DuckDBPyConnection,
    layer: str,
    area_geom_sql: str,
) -> dict[str, Any]:
    spec = LAYERS[layer]
    path = DATA_DIR / spec["file"]
    geom = spec["geom"]
    where_sql = _where_clause(spec, area_geom_sql)

    base = f"""
        WITH clipped AS (
            SELECT t.*,
                   ST_Intersection(t.{geom}, {area_geom_sql}) AS clipped_geom
            FROM read_parquet('{path}') t
            WHERE {where_sql}
        )
    """

    if layer == "buildings":
        agg = """
            SELECT
                COUNT(*) AS count,
                COALESCE(SUM(ST_Area_Spheroid(ST_FlipCoordinates(clipped_geom))), 0) AS area_m2,
                AVG(height) AS avg_height
            FROM clipped
        """
    elif layer == "streets":
        agg = """
            SELECT
                COUNT(*) AS count,
                COALESCE(SUM(ST_Length_Spheroid(ST_FlipCoordinates(clipped_geom))), 0) AS length_m
            FROM clipped
        """
    elif layer in ("land_use", "water"):
        agg = """
            SELECT
                COUNT(*) AS count,
                COALESCE(SUM(ST_Area_Spheroid(ST_FlipCoordinates(clipped_geom))), 0) AS area_m2
            FROM clipped
        """
    else:
        agg = "SELECT COUNT(*) AS count FROM clipped"

    row = con.execute(base + agg).fetchone()
    kpis = dict(zip([d[0] for d in con.description], row))

    if spec["group_by"]:
        gb_sql = f"""
            {base}
            SELECT {spec["group_by"]} AS k, COUNT(*) AS n
            FROM clipped
            GROUP BY 1
            ORDER BY n DESC
        """
        try:
            rows = con.execute(gb_sql).fetchall()
            kpis[f"by_{spec['group_by'].split('.')[-1]}"] = {
                str(k): int(n) for k, n in rows if k is not None
            }
        except duckdb.Error:
            pass

    return kpis


# ---------------------------------------------------------------- vector output

def _feature_collection(name: str, features: list[dict]) -> dict:
    return {"type": "FeatureCollection", "name": name, "features": features}


def _street_features(
    con: duckdb.DuckDBPyConnection,
    area_geom_sql: str,
    limit: int,
) -> dict:
    """Streets as features, each tagged with `lit` (within 25 m of a lamp)."""
    streets = DATA_DIR / LAYERS["streets"]["file"]
    infra = DATA_DIR / LAYERS["infrastructure"]["file"]
    sql = f"""
        WITH area AS (SELECT {area_geom_sql} AS g),
        lamps_m AS (
            SELECT {_metric("l.geometry")} AS g
            FROM read_parquet('{infra}') l
            WHERE l.class = 'street_lamp' AND l.subtype = 'transportation'
              AND ST_Intersects(l.geometry, (SELECT g FROM area))
        ),
        clipped AS (
            SELECT
                s.id AS id,
                s.class AS class,
                ST_Intersection(s.geometry, (SELECT g FROM area)) AS g_wgs,
                {_metric("ST_Intersection(s.geometry, (SELECT g FROM area))")} AS g_m
            FROM read_parquet('{streets}') s
            WHERE ST_Intersects(s.geometry, (SELECT g FROM area))
            LIMIT {int(limit)}
        )
        SELECT
            id, class,
            ST_AsGeoJSON(g_wgs) AS gj,
            EXISTS (SELECT 1 FROM lamps_m l WHERE ST_DWithin(g_m, l.g, 25)) AS lit
        FROM clipped
    """
    features = []
    for fid, cls, gj, lit in con.execute(sql).fetchall():
        if gj is None:
            continue
        features.append({
            "type": "Feature",
            "id": fid,
            "properties": {"class": cls, "lit": bool(lit)},
            "geometry": json.loads(gj),
        })
    return _feature_collection("streets", features)


def geometry_for_layer(
    con: duckdb.DuckDBPyConnection,
    layer: str,
    area_geom_sql: str,
    limit: int = 5000,
) -> dict:
    if layer == "streets":
        return _street_features(con, area_geom_sql, limit)

    spec = LAYERS[layer]
    path = DATA_DIR / spec["file"]
    geom = spec["geom"]
    where_sql = _where_clause(spec, area_geom_sql)
    parts = ["'id'", "t.id"]
    for p in spec.get("props", []):
        parts.extend([f"'{p.split('.')[-1]}'", f"t.{p}"])
    props_sql = f"json_object({', '.join(parts)})"

    sql = f"""
        WITH clipped AS (
            SELECT
                t.id AS id,
                {props_sql} AS props,
                ST_AsGeoJSON(
                    ST_Intersection(t.{geom}, {area_geom_sql})
                ) AS gj
            FROM read_parquet('{path}') t
            WHERE {where_sql}
            LIMIT {int(limit)}
        )
        SELECT id, props, gj FROM clipped
    """
    features = []
    for fid, props_json, gj in con.execute(sql).fetchall():
        if gj is None:
            continue
        if isinstance(props_json, str):
            props_json = json.loads(props_json)
        features.append({
            "type": "Feature",
            "id": fid,
            "properties": props_json or {},
            "geometry": json.loads(gj),
        })
    return _feature_collection(layer, features)


# ---------------------------------------------------------------- feature detail

def feature_contribution(
    con: duckdb.DuckDBPyConnection,
    layer: str,
    feature_id: str,
    area_geom_sql: str,
) -> dict[str, Any] | None:
    """What a single feature contributes inside the area. Returns None if not found."""
    spec = LAYERS[layer]
    path = DATA_DIR / spec["file"]
    fid = feature_id.replace("'", "''")

    if layer == "street_lamps":
        streets = DATA_DIR / LAYERS["streets"]["file"]
        sql = f"""
            WITH area AS (SELECT {area_geom_sql} AS g),
            lamp AS (
                SELECT {_metric("geometry")} AS g
                FROM read_parquet('{path}')
                WHERE id = '{fid}'
                  AND class = 'street_lamp'
                  AND subtype = 'transportation'
            ),
            streets_m AS (
                SELECT {_metric("ST_Intersection(s.geometry, (SELECT g FROM area))")} AS g
                FROM read_parquet('{streets}') s
                WHERE ST_Intersects(s.geometry, (SELECT g FROM area))
            )
            SELECT COALESCE(SUM(
                CASE WHEN ST_DWithin(s.g, l.g, 25) THEN ST_Length(s.g) ELSE 0 END
            ), 0)
            FROM streets_m s, lamp l
        """
        row = con.execute(sql).fetchone()
        if row is None:
            return None
        metres = round(float(row[0]), 1)
        return {
            "layer": layer,
            "id": feature_id,
            "label": f"Lights {metres} m of street",
            "contribution": {"street_m": metres},
        }

    if layer == "buildings":
        sql = f"""
            WITH area AS (SELECT {area_geom_sql} AS g)
            SELECT height,
                   ST_Area_Spheroid(ST_FlipCoordinates(
                       ST_Intersection(geometry, (SELECT g FROM area))
                   ))
            FROM read_parquet('{path}')
            WHERE id = '{fid}'
        """
        row = con.execute(sql).fetchone()
        if row is None:
            return None
        height, area_m2 = row
        m2 = round(float(area_m2 or 0), 1)
        parts = [f"{m2} m² footprint"]
        if height is not None:
            parts.append(f"{round(float(height), 1)} m tall")
        return {
            "layer": layer,
            "id": feature_id,
            "label": ", ".join(parts),
            "contribution": {
                "footprint_m2": m2,
                "height_m": float(height) if height is not None else None,
            },
        }

    if layer == "streets":
        infra = DATA_DIR / LAYERS["infrastructure"]["file"]
        sql = f"""
            WITH area AS (SELECT {area_geom_sql} AS g),
            s AS (
                SELECT {_metric("ST_Intersection(geometry, (SELECT g FROM area))")} AS g,
                       class
                FROM read_parquet('{path}')
                WHERE id = '{fid}'
                  AND ST_Intersects(geometry, (SELECT g FROM area))
            ),
            lamps_m AS (
                SELECT {_metric("geometry")} AS g
                FROM read_parquet('{infra}')
                WHERE class = 'street_lamp' AND subtype = 'transportation'
                  AND ST_Intersects(geometry, (SELECT g FROM area))
            )
            SELECT class,
                   ST_Length(s.g),
                   EXISTS (SELECT 1 FROM lamps_m l WHERE ST_DWithin(s.g, l.g, 25))
            FROM s
        """
        row = con.execute(sql).fetchone()
        if row is None:
            return None
        cls, length_m, lit = row
        length_m = round(float(length_m or 0), 1)
        return {
            "layer": layer,
            "id": feature_id,
            "label": f"{length_m} m, {'lit' if lit else 'unlit'} ({cls or 'unclassified'})",
            "contribution": {"length_m": length_m, "lit": bool(lit), "class": cls},
        }

    return None
