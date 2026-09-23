"""Extract Overture layers for a district bbox into local Parquet.

Commit this script. Do not commit the data.
"""
import sys
from pathlib import Path

import duckdb

RELEASE = "2026-08-19.0"  # check STAC catalog for latest
S3_BASE = f"s3://overturemaps-us-west-2/release/{RELEASE}"

# Eixample, Barcelona — adjust to your district.
# Format: west, south, east, north
BBOX = (2.16, 41.39, 2.18, 41.41)#(2.15, 41.38, 2.20, 41.42)

LAYERS = {
    # name: (theme, type)
    "buildings": ("buildings", "building"),
    "streets": ("transportation", "segment"),
    "places": ("places", "place"),
    "land_use": ("base", "land_use"),
    "water": ("base", "water"),
    "infrastructure": ("base", "infrastructure"),  # contains street lamps
}

OUT_DIR = Path("data")
# bbox predicate pushdown: this is the part that matters.
# Parquet files carry bbox.* summary columns, so DuckDB only reads
# the row groups that intersect — not the whole dataset.

def extract(con: duckdb.DuckDBPyConnection, name: str, theme: str, ftype: str) -> None:
    path = f"{S3_BASE}/theme={theme}/type={ftype}/*"
    out = OUT_DIR / f"{name}.parquet"

    print("extracting {path}")
    west, south, east, north = BBOX

    # query = f"""
    #     COPY (
    #         SELECT *
    #         FROM read_parquet('{path}', hive_partitioning=1)
    #         WHERE bbox.xmin >= {west}
    #           AND bbox.xmax <= {east}
    #           AND bbox.ymin >= {south}
    #           AND bbox.ymax <= {north}
    #     ) TO '{out}' (FORMAT PARQUET)
    # """
    #
    # query = f"""
    #     COPY (
    #         SELECT *
    #         FROM read_parquet('{path}', hive_partitioning=1)
    #         WHERE bbox.xmin > {west}
    #           AND bbox.ymin > {south}
    #           AND bbox.xmax < {east}
    #           AND bbox.ymax < {north}
    #     ) TO '{out}' (FORMAT PARQUET)
    #     """
    query = f"""
        COPY (
            SELECT *
            FROM read_parquet('{path}', hive_partitioning=1)
            WHERE bbox.xmin < {east}
              AND bbox.ymin < {north}
              AND bbox.xmax > {west}
              AND bbox.ymax > {south}
        ) TO '{out}' (FORMAT PARQUET)
    """
    print(f"  {name}: {path}")
    con.execute(query)
    size = out.stat().st_size / 1024 / 1024
    print(f"    -> {out} ({size:.1f} MB)")


def main() -> None:
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    print('hola')
    con = duckdb.connect()
    con.execute("INSTALL spatial; LOAD spatial;")
    con.execute("INSTALL httpfs; LOAD httpfs;")
    con.execute("SET s3_region='us-west-2';")

    for name, (theme, ftype) in LAYERS.items():
        extract(con, name, theme, ftype)

    print('end')
if __name__ == "__main__":
    sys.exit(main())
