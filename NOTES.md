# NOTES.md

Reference for every quantity the dashboard reports: definition, computation,
thresholds, and scope of applicability. Thresholds without external backing are
marked author-defined.

---

## KPI reference

### `lit_street_share`

**Definition.** Proportion of street-centreline length within the drawn area
that lies within 25 m of an Overture street lamp.

**Computation.** Clip street segments and lamp points to the area polygon.
Reproject both to EPSG:32631 (UTM 31N, metres). For each street segment,
evaluate `ST_DWithin(segment, lamp, 25)` against every lamp in the area. Sum the
`ST_Length` of segments that satisfy the predicate. Divide by total clipped
street length. Executed in DuckDB; no per-feature iteration in Python.

**Thresholds.**

| Parameter | Value | Origin |
|---|---|---|
| Lamp reach | 25 m | Author-defined. Approximates the ground footprint of a single residential street lamp at typical mounting height and cutoff angle. No external source. |
| Band: poorly lit | < 40 % | Author-defined. Partitions the observed distribution across Barcelona districts. |
| Band: partly covered | 40–70 % | Author-defined. Same partition. |
| Band: well lit | ≥ 70 % | Author-defined. Same partition. |

**Scope and limitations.** The reported value characterises Overture's lamp
inventory within the area, not the city's lighting. The current release
(2026-08-19.0) documents approximately 132 street lamps for approximately
275 km of path network in the Eixample test area, with pronounced spatial
clustering. Low values are more likely to indicate incomplete source data than
absence of illumination. The computation does not account for lamp luminous
intensity, spectrum, operating state, measured night-time illuminance,
walkable surfaces outside Overture's `transportation` theme, parks, or private
forecourts.

---

### `street_length_km`

**Definition.** Total centreline length of Overture `transportation.segment`
features intersecting the drawn area.

**Computation.** Sum of `ST_Length_Spheroid(ST_FlipCoordinates(clipped_geom))`
over clipped segments, divided by 1000.

**Thresholds.** None. Reported as an absolute quantity.

**Scope and limitations.** The `transportation.segment` feature class
aggregates roadway, footway, cycleway, steps, pedestrian paths, and
metro/tram track. In dense Barcelona blocks, footways constitute approximately
63 % of feature count. Reported length therefore overstates roadway extent by
a material margin and is more accurately described as path-network length.
Width, lane count, directionality, and access restrictions are not
represented.

---

### `building_count`

**Definition.** Count of Overture `buildings.building` footprints intersecting
the drawn area.

**Computation.** `COUNT(*)` over features whose geometry intersects the area
polygon. Features are clipped to the boundary; partial intersections are
included.

**Thresholds.** None.

**Scope and limitations.** Counts footprint geometries. Does not represent
dwelling units, households, or population. A multi-unit residential block and
a single-storey outbuilding each contribute one unit to the count.

---

### `building_area_ha`

**Definition.** Sum of clipped building footprint area, expressed in hectares.

**Computation.** `SUM(ST_Area_Spheroid(ST_FlipCoordinates(clipped_geom))) ÷ 10⁴`.

**Thresholds.** None.

**Scope and limitations.** Planimetric footprint area. Not gross floor area,
not net internal area, not built volume. Height is not incorporated; two
footprints of equal area but different building height contribute equal
values.

---

### `avg_building_height`

**Definition.** Arithmetic mean of the `height` attribute over buildings in
the drawn area that carry a height value.

**Computation.** `AVG(height)` over the subset of clipped building features
with a non-null height attribute.

**Thresholds.** None.

**Scope and limitations.** Computed over the subset of buildings with a
height value, not the full building set. Coverage is uneven across the source
dataset. The mean is sensitive to outlier values. The metric does not
represent floor count, roof height, or occupancy.

---

### `water_area_ha`

**Definition.** Clipped area of Overture `base.water` polygons intersecting
the drawn area, in hectares.

**Computation.** `SUM(ST_Area_Spheroid(ST_FlipCoordinates(clipped_geom))) ÷ 10⁴`.

**Thresholds.** None.

**Scope and limitations.** Planimetric surface area. Excludes features below
Overture's size threshold, underground water, and water features not carried
by the source.

---

## Denominators

Two denominators are used across the dashboard.

- **Street length.** Used exclusively by `lit_street_share`. The denominator
  is the same quantity being measured; no external variable is introduced.
- **Area.** The `km2` field in the API response is the spherical area of the
  drawn polygon in metres squared, divided by 10⁶.

No metric uses population, household count, income, education, health, or any
other socioeconomic variable. This is a design constraint, not a data
limitation.

---

## Data source

Overture Maps, release `2026-08-19.0`. Retrieved from the public S3 Parquet
distribution (`s3://overturemaps-us-west-2/release/`) using DuckDB.

| Theme | Type | Layer(s) |
|---|---|---|
| buildings | building | buildings |
| transportation | segment | streets |
| places | place | places |
| base | land_use | land_use |
| base | water | water |
| base | infrastructure | infrastructure, street_lamps |

Extraction is scripted (`backend/scripts/extract_overture.py`) and version
controlled. Extracted data is not version controlled. The pipeline uses one
source; no external datasets are joined.

---

## Coverage gaps in the source

- **Street lamps.** Current release encodes lamps as `class = 'street_lamp'`,
  `subtype = 'transportation'`. Coverage in the Eixample test area is
  approximately 132 features over approximately 275 km of path network, with
  substantial spatial clustering. This is the primary driver of low
  `lit_street_share` values and is disclosed in the dashboard's generated
  insights when the value falls below 30 %.
- **Building heights.** The `height` attribute is present on a subset of
  building features only. `avg_building_height` is computed over that subset.
- **Land-use granularity.** `base.land_use` does not distinguish, for example,
  retail from office use.
- **Feature classification.** Footways and cycleways share a feature type with
  roadway in `transportation.segment`, affecting the `street_length_km`
  denominator as noted above.

---

## Known constraints and planned remediation

- **Street length includes non-roadway segments.** This overstates roadway
  extent. Remediation options: filter the streets layer by `class`, or rename
  the metric to reflect path-network length. Documented, not yet implemented.
- **Redundant Parquet scans.** `street_lamps` and `infrastructure` read the
  same file independently per request. Acceptable below 10 km² per request;
  would require materialisation at city scale.
- **Per-feature reprojection.** `ST_Transform` executes per feature in the
  lit-share and per-feature contribution paths. At an order-of-magnitude
  larger area this becomes the dominant cost. Remediation: cache a projected
  Parquet or promote the transform into a database view.
- **Geometry limit.** `geometry_for_layer` applies a 5000-feature limit before
  the lamp join in `_street_features`. This does not affect district-scale
  requests but could, in principle, cause the rendered `lit` flag and the
  aggregate `lit_street_share` to be computed over different subsets at large
  areas.
- **Identifier interpolation.** The feature ID in `/api/feature/` is
  quote-escaped but not parameterised. Adequate for read-only internal use;
  should be converted to bound parameters before any external exposure.
- **Non-additive per-feature values.** The per-lamp contribution reported by
  `/api/feature/street_lamps/<id>` sums street length within 25 m of that lamp
  without de-duplication against other lamps. Overlapping lamps produce
  overlapping contributions. Aggregate and per-feature values measure
  different quantities and are not expected to sum.

---

## Threshold summary

| Metric | Parameter | Value | Origin |
|---|---|---|---|
| `lit_street_share` | lamp reach | 25 m | Author-defined. No external standard. |
| `lit_street_share` | poorly lit | < 40 % | Author-defined. |
| `lit_street_share` | partly covered | 40–70 % | Author-defined. |
| `lit_street_share` | well lit | ≥ 70 % | Author-defined. |
| all others | — | — | No thresholds. |

The 25 m reach value has no external citation. It was selected to reflect
typical residential lamp spacing and is stated here to make the basis
traceable.

pdf generated with  npx @marp-team/marp-cli WALKTHROUGH.md -o WALKTHROUGH.pdf --pdf
