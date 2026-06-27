# geometry-core

Core TypeScript utilities for polygonal computational geometry.

`geometry-core` provides immutable vectors, bounding boxes, line segments, contours, polygons, shape boolean operations, and SVG import/export helpers.

## Install

```sh
npm install geometry-core
```

## Quick start

```ts
import { Polygon, Shape, Vec2 } from 'geometry-core';

const square = new Polygon([
  new Vec2([0, 0]),
  new Vec2([0, 100]),
  new Vec2([100, 100]),
  new Vec2([100, 0]),
]);

const shifted = new Shape([square.outer]).translate(new Vec2([25, 0]));

console.log(square.area);
console.log(shifted.d(2));
```

## Main exports

- `Vec`, `Vec2`, `Vec3`, `Size2`, `Size3`, `BBox`
- `Segment`, `Segment2D`, `Line`, `Line2D`, `Ray`, `Ray2D`
- `Intersection`, `Graph`
- `Contour`, `Polygon`, `SimplePolygon`, `Triangle`
- `SimpleShape`, `Shape`
- `IO` for supported SVG element import
- `GeometryDefaults`, `Loop`, `PerformanceTracker`, `itertools`
- Shared types including `Geometry`, `Transformable`, `Transformable2D`, `Traceable`, `SegmentLike`, and `Enclosure`

## Examples

### Vectors

```ts
import { Vec2 } from 'geometry-core';

const p = new Vec2([10, 0]);
const q = p.rotate(Math.PI / 2);

console.log(q.d(2));
```

### Line intersections

```ts
import { Line2D, Vec2 } from 'geometry-core';

const a = new Line2D(new Vec2([0, 0]), new Vec2([10, 10]), undefined);
const b = new Line2D(new Vec2([0, 10]), new Vec2([10, 0]), undefined);

const hit = a.intersection(b);
console.log(hit.type);
console.log(hit.points[0]?.v.d());
```

### Polygon offsets

```ts
import { SimplePolygon, Vec2 } from 'geometry-core';

const square = new SimplePolygon([
  new Vec2([0, 0]),
  new Vec2([0, 20]),
  new Vec2([20, 20]),
  new Vec2([20, 0]),
]);

const expanded = square.offset(4, 'miter');
console.log(expanded[0]?.area);
```

### Shape boolean operations

```ts
import { Shape, Vec2 } from 'geometry-core';

const a = new Shape([square]);
const b = new Shape([square.translate(new Vec2([10, 0]))]);

const union = a.union(b);
const overlap = a.intersection(b);
```

### SVG import

```ts
import { IO } from 'geometry-core';

const geometry = [...IO.fromSVG(svgElement)];
```

Supported SVG import currently includes line-based path commands, `polygon`, `polyline`, `rect`, `circle` approximation, `line`, `svg`, and `g`. Curves, arcs, ellipses, and SVG transforms are not implemented yet.

## Publishing model

The repository root is a private build workspace. The package is published from `dist/`, where Rollup emits the publishable `package.json`, `README.md`, `LICENSE`, `index.mjs`, `index.cjs`, and `index.d.ts`.

## License

MIT
