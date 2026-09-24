"""DuckDB access layer. All clipping + aggregation happens in SQL."""
from __future__ import annotations

import json
from pathlib import Path
from typing import Any

import duckdb

DATA_DIR = Path(__file__).resolve().parent.parent / "data"

# layer name -> (parquet file, geometry source, extra columns we care about)
LAYERS: dict[str, dict[str, Any]] = {
    "buildings": {
        "file": "buildings.parquet",
        "geom": "geometry",
        "group_by": None,
    },
    "streets": {
        "file": "streets.parquet",
        "geom": "geometry",
        "group_by": "class",
    },
    "places": {
        "file": "places.parquet",
        "geom": "geometry",
        "group_by": "categories.primary",
    },
    "land_use": {
        "file": "land_use.parquet",
        "geom": "geometry",
        "group_by": "subtype",
    },
    "water": {
        "file": "water.parquet",
        "geom": "geometry",
        "group_by": None,
    },
    "infrastructure": {
        "file": "infrastructure.parquet",
        "geom": "geometry",
        "group_by": "subtype",
    },
    "street_lamps": {
        "file": "infrastructure.parquet",
        "geom": "geometry",
        "group_by": "class",               # will just say 'street_lamp' — fine, or set None
        "where": "subtype = 'utility' AND class = 'street_lamp'",  # NEW
    },
}


def connect() -> duckdb.DuckDBPyConnection:
    con = duckdb.connect()
    con.execute("INSTALL spatial; LOAD spatial;")
    return con


def _area_geom_sql(bbox: tuple[float, float, float, float]) -> str:
    """Build a ST_GeometryFromText for the area polygon (from bbox)."""
    west, south, east, north = bbox
    wkt = (
        f"POLYGON(({west} {south}, {east} {south}, "
        f"{east} {north}, {west} {north}, {west} {south}))"
    )
    return f"ST_GeomFromText('{wkt}')"


# def kpis_for_layer(
#     con: duckdb.DuckDBPyConnection,
#     layer: str,
#     area_geom_sql: str,
# ) -> dict[str, Any]:
#     """One layer -> KPI dict. All aggregation in DuckDB."""
#     spec = LAYERS[layer]
#     path = DATA_DIR / spec["file"]
#     geom = spec["geom"]

#     # The clip + aggregate. Note: ST_Intersection is only computed once
#     # per feature, then reused for area/length and for the returned geometry.
#     base = f"""
#         WITH clipped AS (
#             SELECT
#                 t.*,
#                 ST_Intersection(t.{geom}, {area_geom_sql}) AS clipped_geom
#             FROM read_parquet('{path}') t
#             WHERE ST_Intersects(t.{geom}, {area_geom_sql})
#         )
#     """

#     # Layer-specific KPIs, still inside the engine.
#     if layer == "buildings":
#         agg = """
#             SELECT
#                 COUNT(*)                                   AS count,
#                 COALESCE(SUM(ST_Area(clipped_geom)), 0)    AS area_m2,
#                 AVG(height)                                AS avg_height
#             FROM clipped
#         """
#     elif layer == "streets":
#         agg = """
#             SELECT
#                 COUNT(*)                                      AS count,
#                 COALESCE(SUM(ST_Length(clipped_geom)), 0)     AS length_m
#             FROM clipped
#         """
#     elif layer in ("land_use", "water"):
#         agg = """
#             SELECT
#                 COUNT(*)                                   AS count,
#                 COALESCE(SUM(ST_Area(clipped_geom)), 0)    AS area_m2
#             FROM clipped
#         """
#     else:  # places, infrastructure
#         agg = "SELECT COUNT(*) AS count FROM clipped"

#     row = con.execute(base + agg).fetchone()
#     cols = [d[0] for d in con.description]
#     kpis = dict(zip(cols, row))

#     # Optional group-by breakdown — also in the engine.
#     if spec["group_by"]:
#         gb_sql = f"""
#             {base}
#             SELECT {spec["group_by"]} AS k, COUNT(*) AS n
#             FROM clipped
#             GROUP BY 1
#             ORDER BY n DESC
#         """
#         try:
#             rows = con.execute(gb_sql).fetchall()
#             kpis[f"by_{spec['group_by'].split('.')[-1]}"] = {
#                 str(k): int(n) for k, n in rows if k is not None
#             }
#         except duckdb.Error:
#             # column not present in this layer's schema; skip quietly
#             pass

#     return kpis
def kpis_for_layer(
    con: duckdb.DuckDBPyConnection,
    layer: str,
    area_geom_sql: str,
) -> dict[str, Any]:
    spec = LAYERS[layer]
    path = DATA_DIR / spec["file"]
    geom = spec["geom"]

    base = f"""
        WITH clipped AS (
            SELECT
                t.*,
                ST_Intersection(t.{geom}, {area_geom_sql}) AS clipped_geom
            FROM read_parquet('{path}') t
            WHERE ST_Intersects(t.{geom}, {area_geom_sql})
        )
    """
    where_extra = spec.get("where")
    where_sql = f"WHERE ST_Intersects(t.{geom}, {area_geom_sql})"
    if where_extra:
        where_sql += f" AND {where_extra}"

    if layer == "buildings":
        agg = """
            SELECT
                COUNT(*) AS count,
                COALESCE(SUM(ST_Area_Spheroid(
                    ST_FlipCoordinates(clipped_geom)
                )), 0) AS area_m2,
                AVG(height) AS avg_height
            FROM clipped
        """
    elif layer == "streets":
        agg = """
            SELECT
                COUNT(*) AS count,
                COALESCE(SUM(ST_Length_Spheroid(
                    ST_FlipCoordinates(clipped_geom)
                )), 0) AS length_m
            FROM clipped
        """
    elif layer in ("land_use", "water"):
        agg = """
            SELECT
                COUNT(*) AS count,
                COALESCE(SUM(ST_Area_Spheroid(
                    ST_FlipCoordinates(clipped_geom)
                )), 0) AS area_m2
            FROM clipped
        """
    else:
        agg = "SELECT COUNT(*) AS count FROM clipped"

    row = con.execute(base + agg).fetchone()
    cols = [d[0] for d in con.description]
    kpis = dict(zip(cols, row))

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

def geometry_for_layer(
    con: duckdb.DuckDBPyConnection,
    layer: str,
    area_geom_sql: str,
    limit: int = 5000,
) -> list[dict[str, Any]]:
    """Return clipped geometries as GeoJSON-ish dicts. Engine-side clip."""
    spec = LAYERS[layer]
    path = DATA_DIR / spec["file"]
    geom = spec["geom"]

    sql = f"""
        WITH clipped AS (
            SELECT
                ST_AsGeoJSON(
                    ST_Intersection(t.{geom}, {area_geom_sql})
                ) AS gj,
                t.id
            FROM read_parquet('{path}') t
            WHERE ST_Intersects(t.{geom}, {area_geom_sql})
            LIMIT {int(limit)}
        )
        SELECT id, gj FROM clipped
    """
    out = []
    for fid, gj in con.execute(sql).fetchall():
        if gj is None:
            continue
        out.append({"id": fid, "geometry": json.loads(gj)})
    return out
