from __future__ import annotations

import json

from django.http import HttpRequest, JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_http_methods

from .areas import resolve
from .duck import (
    LAYERS,
    area_km2,
    connect,
    feature_contribution,
    geometry_for_layer,
    kpis_for_layer,
    lit_street_share,
)


# --------------------------------------------------------------------- KPI specs

def _band_lit(v: float) -> str:
    if v >= 70:
        return "Well lit"
    if v >= 40:
        return "Partly covered"
    return "Poorly lit"


KPI_SPECS: list[dict] = [
    {
        "key": "lit_street_share",
        "label": "Street length within 25 m of a lamp",
        "unit": "%",
        "definition": (
            "Share of street-centreline metres inside the area that fall within "
            "25 m of a street lamp. Does not measure brightness, lamp condition, "
            "or actual night-time illumination."
        ),
        "band": _band_lit,
        "requires": ["streets", "street_lamps"],
        "compute": lambda raw, derived, km2: derived["lit_street_share"]["pct"],
    },
    {
        "key": "street_length_km",
        "label": "Street length",
        "unit": "km",
        "definition": "Total centreline length of streets clipped to the area.",
        "requires": ["streets"],
        "compute": lambda raw, derived, km2: round(raw["streets"]["length_m"] / 1000, 2),
    },
    {
        "key": "building_count",
        "label": "Buildings",
        "unit": "",
        "definition": "Number of building footprints intersecting the area (clipped, not counted whole).",
        "requires": ["buildings"],
        "compute": lambda raw, derived, km2: int(raw["buildings"]["count"]),
    },
    {
        "key": "building_area_ha",
        "label": "Building footprint area",
        "unit": "ha",
        "definition": "Sum of clipped building footprint area.",
        "requires": ["buildings"],
        "compute": lambda raw, derived, km2: round(raw["buildings"]["area_m2"] / 10_000, 2),
    },
    {
        "key": "avg_building_height",
        "label": "Average building height",
        "unit": "m",
        "definition": (
            "Mean height attribute of clipped buildings. Buildings without a "
            "height tag are excluded from the mean."
        ),
        "requires": ["buildings"],
        "compute": lambda raw, derived, km2: round(raw["buildings"]["avg_height"] or 0.0, 1),
    },
    {
        "key": "water_area_ha",
        "label": "Water area",
        "unit": "ha",
        "definition": "Clipped area of inland water polygons.",
        "requires": ["water"],
        "compute": lambda raw, derived, km2: round(raw["water"]["area_m2"] / 10_000, 2),
    },
]


def build_kpis(raw: dict, derived: dict, wanted: list[str]) -> list[dict]:
    out = []
    for spec in KPI_SPECS:
        if not all(layer in wanted for layer in spec["requires"]):
            continue
        try:
            value = spec["compute"](raw, derived, None)
        except (KeyError, TypeError):
            continue
        item = {
            "key": spec["key"],
            "label": spec["label"],
            "value": value,
            "unit": spec["unit"],
            "definition": spec["definition"],
        }
        if "band" in spec:
            item["band"] = spec["band"](value)
        out.append(item)
    return out


# -------------------------------------------------------------------- insights

def build_insights(area_name: str, kpis: list[dict]) -> list[str]:
    by = {k["key"]: k for k in kpis}
    out: list[str] = []

    if "lit_street_share" in by:
        k = by["lit_street_share"]
        out.append(
            f"{k['value']}% of street metres in {area_name} run within 25 m of "
            f"a street lamp — {k['band'].lower()}."
        )
        if k["value"] < 30:
            out.append(
                "Overture's lamp inventory is sparse here — the low share "
                "reflects missing data more than unlit streets."
            )
    if "building_count" in by and "building_area_ha" in by:
        out.append(
            f"{by['building_count']['value']:,} building footprints cover "
            f"{by['building_area_ha']['value']} ha."
        )
    if "street_length_km" in by:
        out.append(
            f"The area contains {by['street_length_km']['value']} km of street centreline."
        )
    if "water_area_ha" in by and by["water_area_ha"]["value"] > 0:
        out.append(f"Inland water covers {by['water_area_ha']['value']} ha.")
    return out


# ---------------------------------------------------------------------- legend

def build_legend(wanted: list[str]) -> dict | None:
    if "streets" not in wanted:
        return None
    return {
        "type": "categorical",
        "field": "lit",
        "title": "Street lighting coverage",
        "items": [
            {"value": True,  "label": "Within 25 m of a lamp",       "color": "#16a34a"},
            {"value": False, "label": "More than 25 m from a lamp",  "color": "#b91c1c"},
        ],
    }


# ---------------------------------------------------------------------- views

@csrf_exempt
@require_http_methods(["GET", "POST"])
def kpis(request: HttpRequest) -> JsonResponse:
    district = request.GET.get("district")
    bbox = request.GET.get("bbox")
    geojson = None
    if request.method == "POST":
        try:
            geojson = json.loads(request.body or "{}").get("geojson")
        except json.JSONDecodeError:
            return JsonResponse({"error": "invalid JSON body"}, status=400)

    try:
        area = resolve(district, bbox, geojson)
    except ValueError as e:
        return JsonResponse({"error": str(e)}, status=400)

    layers_param = request.GET.get("layers")
    wanted = (
        [l.strip() for l in layers_param.split(",") if l.strip()]
        if layers_param
        else list(LAYERS.keys())
    )
    bad = [l for l in wanted if l not in LAYERS]
    if bad:
        return JsonResponse({"error": f"unknown layers: {bad}"}, status=400)

    include_geometry = request.GET.get("include_geometry", "1") in ("1", "true", "yes")
    area_sql = f"ST_GeomFromText('{area.wkt}')"

    con = connect()
    try:
        raw = {layer: kpis_for_layer(con, layer, area_sql) for layer in wanted}

        derived: dict = {}
        if "streets" in wanted:
            derived["lit_street_share"] = lit_street_share(con, area_sql)

        kpi_list = build_kpis(raw, derived, wanted)
        insights = build_insights(area.name, kpi_list)
        vectors = (
            [geometry_for_layer(con, l, area_sql) for l in wanted]
            if include_geometry
            else []
        )
        km2 = round(area_km2(con, area_sql), 3)
    finally:
        con.close()

    return JsonResponse({
        "area": {
            "name": area.name,
            "km2": km2,
            "bbox": list(area.bbox),
            "source": area.source,
        },
        "kpis": kpi_list,
        "by_layer": raw,
        "insights": insights,
        "legend": build_legend(wanted),
        "layers": {"vectors": vectors},
    })


@csrf_exempt
@require_http_methods(["GET", "POST"])
def feature(request: HttpRequest, layer: str, fid: str) -> JsonResponse:
    district = request.GET.get("district")
    bbox = request.GET.get("bbox")
    geojson = None
    if request.method == "POST":
        try:
            geojson = json.loads(request.body or "{}").get("geojson")
        except json.JSONDecodeError:
            return JsonResponse({"error": "invalid JSON body"}, status=400)

    if layer not in LAYERS:
        return JsonResponse({"error": f"unknown layer: {layer}"}, status=400)

    try:
        area = resolve(district, bbox, geojson)
    except ValueError as e:
        return JsonResponse({"error": str(e)}, status=400)

    con = connect()
    try:
        detail = feature_contribution(
            con, layer, str(fid), f"ST_GeomFromText('{area.wkt}')"
        )
    finally:
        con.close()

    if detail is None:
        return JsonResponse({"error": "feature not found in this area"}, status=404)
    return JsonResponse(detail)
