# Contours and Polygons

## Contour

`Contour` is a continuous closed loop of 2D segments. The constructor accepts points or segments and normalizes them into a connected chain.

```ts
import { Contour, Vec2 } from 'geometry-core';

const contour = new Contour([
  new Vec2([0, 0]),
  new Vec2([20, 0]),
  new Vec2([20, 20]),
  new Vec2([0, 20]),
]);

console.log(contour.d());   // SVG path data
console.log(contour.len);   // perimeter length
```

Common API:

| API | Purpose |
| --- | --- |
| `eps` | Epsilon used for normalization and tests. |
| `bbox`, `corners`, `edges`, `d()` | Geometry interface. |
| `translate`, `scale`, `rotate`, `reflect` | 2D transforms. |
| `len`, `pointAt(t)` | Trace the loop perimeter. |
| `reversed` | Cached reversed loop. |
| `flatten(eps?)` | Yield flattened line segments. |
| `sort(order)` | Cached segment sorting. |
| `intersections` | Cached internal intersection graph. |
| `encloses(point)` | Returns `Enclosure.Inside`, `Boundary`, or `Outside`. |
| `intersects(other, inclusive?)` | Segment intersection test. |

## Polygon

`Polygon` is a line-only `Contour<Line2D>`. It can represent simple polygons, self-intersecting loops, and loops with holes after decomposition.

```ts
import { Polygon, Vec2 } from 'geometry-core';

const poly = new Polygon([
  new Vec2([0, 0]),
  new Vec2([0, 40]),
  new Vec2([40, 40]),
  new Vec2([40, 0]),
]);

console.log(poly.area);
console.log(poly.outer.area);
```

Polygon-specific API:

| API | Purpose |
| --- | --- |
| `area` | Area of the outer simple loop. |
| `outer` | Largest positive-area `SimplePolygon`. |
| `inner` | Hole loops as `SimplePolygon[]`. |
| `Polygon.signedArea(edges)` | Signed shoelace-style area. |
| `Polygon.fromCells(cells)` | Convert a boolean grid to boundary polygons. |

## SimplePolygon

`SimplePolygon` represents one non-self-intersecting loop with no holes. Its `area` is signed.

```ts
import { SimplePolygon, Vec2 } from 'geometry-core';

const square = new SimplePolygon([
  new Vec2([0, 0]),
  new Vec2([0, 10]),
  new Vec2([10, 10]),
  new Vec2([10, 0]),
]);

const outward = square.offset(2, 'miter');
console.log(square.positive.area);
console.log(outward[0]?.d());
```

SimplePolygon-specific API:

| API | Purpose |
| --- | --- |
| `area` | Signed area. |
| `sign` | `1`, `0`, or `-1` based on signed area and `eps`. |
| `positive`, `negative` | Orientation-normalized loop variants. |
| `offset(delta, type?, param?)` | Offset with `miter`, `square`, or `bevel` joins. |

Offset returns an array because offsets can disappear, split, or produce multiple valid loops.

## Triangle

`Triangle` is a `Polygon` subclass that must contain exactly three edges.

```ts
import { Triangle, Vec2 } from 'geometry-core';

const tri = new Triangle([
  new Vec2([0, 0]),
  new Vec2([10, 0]),
  new Vec2([0, 10]),
]);

console.log(tri.centroid.d());
console.log(tri.norm.z);
```

Additional API:

| API | Purpose |
| --- | --- |
| `centroid` | Average of the three corners. |
| `norm` | 3D normal vector derived from edge directions. |
| `encloses(point)` | Fast same-side triangle containment check. |
