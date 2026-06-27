# Segments and Rays

## Segment

`Segment` is the abstract base for finite traceable geometry between endpoints `A` and `B`. `Segment2D` adds 2D transforms.

Common segment API:

| API | Purpose |
| --- | --- |
| `A`, `B`, `delta`, `mid` | Endpoints and cached derived vectors. |
| `bbox`, `corners`, `edges` | Geometry interface. |
| `len`, `pointAt(t)` | Traceable interface. |
| `translate`, `scale` | Generic transforms. |
| `rotate`, `reflect` | 2D transforms on `Segment2D`. |
| `reversed`, `forward`, `backward` | Cached orientation variants. |
| `splitAt(...tOrPoint)` | Split into same-type segments. |
| `intersection(other)` | Intersect with another segment. |
| `xIntersection(x)` | Intersect with the vertical line `x = value`. |
| `Segment.sort(segments, order?)` | Stable geometric ordering. |

## Line and Line2D

`Line` is a straight finite segment. `Line2D` is the currently supported 2D line segment implementation.

```ts
import { Line2D, Vec2 } from 'geometry-core';

const a = new Line2D(new Vec2([0, 0]), new Vec2([10, 10]), undefined);
const b = new Line2D(new Vec2([0, 10]), new Vec2([10, 0]), undefined);

const hit = a.intersection(b);
console.log(hit.type);          // "cross"
console.log(hit.points[0]?.v);  // Vec2(5.0000,5.0000)
```

Line-specific API:

| API | Purpose |
| --- | --- |
| `d(digits?, M?)` | SVG line command, optionally with a move command. |
| `pointAt(t)`, `tAt(point)` | Convert between parameter and point. |
| `tangentAt(t)` | Unit direction. |
| `splitAt(...items)` | Split by parameter or point. |
| `eq(other, eps?)` | Endpoint equality. |
| `flatten()` | Returns `[this]`. |

`Line2D` adds:

| API | Purpose |
| --- | --- |
| `det(pointOrLine)` | 2D determinant from segment direction. |
| `relation(point)` | `1`, `0`, or `-1` side classification. |
| `splitX(x)`, `splitY(y)` | Split around vertical or horizontal coordinates. |
| `intersection(other)` | `none`, `cross`, `tangent`, or `overlap`. |

Intersection endpoint convention is start-inclusive and end-exclusive for crossing tests, which helps avoid double-counting connected contours.

## Intersection and Graph

`Intersection` is returned by segment intersection methods.

```ts
for (const side of a.intersection(b)) {
  console.log(side.segment, side.points);
}
```

Fields:

| API | Purpose |
| --- | --- |
| `type` | `'none'`, `'cross'`, `'tangent'`, or `'overlap'`. |
| `segment`, `counterpart` | The segment pair. |
| `points` | Points on `segment`, each with `t` and `v`. |
| `other` | Counterpart-oriented intersection. |
| iterator | Iterates this intersection and its counterpart when present. |

`Graph` stores pairwise intersections and can split segment chains at intersection points. It is mainly used by contour, polygon, and shape operations.

## Ray and Ray2D

`Ray` represents a half-line from an origin in a normalized direction.

```ts
import { Ray2D, Vec2 } from 'geometry-core';

const ray = new Ray2D(Vec2.origin, Vec2.X);
console.log(ray.pointAt(20).d()); // "20,0"
```

`Ray2D` supports `rotate`, `reflect`, SVG path output via `d()`, and intersections with `Ray2D` or `Line2D`.
