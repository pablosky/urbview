from __future__ import annotations

import json

from django.http import HttpRequest, JsonResponse
from django.views.decorators.http import require_http_methods
from django.views.decorators.csrf import csrf_exempt

from .areas import resolve
from .duck import LAYERS, connect, geometry_for_layer, kpis_for_layer

@csrf_exempt
@require_http_methods(["GET", "POST"])
def kpis(request: HttpRequest) -> JsonResponse:
    # Area can come from query string (district/bbox) or POST body (geojson).
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

    include_geometry = True #  request.GET.get("include_geometry") in ("1", "true", "yes")
    layers_param = request.GET.get("layers")
    wanted = (
        [l.strip() for l in layers_param.split(",") if l.strip()]
        if layers_param
        else list(LAYERS.keys())
    )
    bad = [l for l in wanted if l not in LAYERS]
    if bad:
        return JsonResponse({"error": f"unknown layers: {bad}"}, status=400)

    area_sql = f"ST_GeomFromText('{area.wkt}')"

    con = connect()
    try:
        result = {
            "area": {"source": area.source, "bbox": area.bbox},
            "kpis": {},
            "geometry": {},
        }
        for layer in wanted:
            result["kpis"][layer] = kpis_for_layer(con, layer, area_sql)
            if include_geometry:
                result["geometry"][layer] = geometry_for_layer(con, layer, area_sql)
    finally:
        con.close()

    return JsonResponse(result)
