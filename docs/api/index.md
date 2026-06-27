# API Overview

Import everything from the package root:

```ts
import {
  BBox,
  Enclosure,
  GeometryDefaults,
  IO,
  Line2D,
  Polygon,
  Shape,
  SimplePolygon,
  SimpleShape,
  Vec2,
  Vec3,
} from 'geometry-core';
```

## Public groups

| Group | Exports |
| --- | --- |
| Vectors | `Vec`, `Vec2`, `Vec3`, `Size2`, `Size3`, `BBox` |
| Segments | `Segment`, `Segment2D`, `Line`, `Line2D`, `Ray`, `Ray2D`, `Intersection`, `Graph` |
| Contours | `Contour`, `Polygon`, `SimplePolygon`, `Triangle` |
| Shapes | `SimpleShape`, `Shape` |
| SVG I/O | `IO.fromSVG`, `IO.inflate`, element-specific SVG readers, `IO.SourceElement` |
| Utilities | `Loop`, `GeometryDefaults`, `PerformanceTracker`, `itertools` |
| Types | `Geometry`, `Transformable`, `Transformable2D`, `Traceable`, `Poolable`, `SegmentLike`, `Enclosure` |

## Object model

Most objects implement one or more shared interfaces:

- `Geometry`: exposes `bbox`, `corners`, `edges`, and `d()` for SVG path data.
- `Transformable`: exposes `translate()` and `scale()`.
- `Transformable2D`: adds `rotate()` and `reflect()`.
- `Traceable`: exposes `len` and `pointAt(t)`.

Transformations return new objects. Cached duals such as `reversed`, `positive`, and `negative` may reuse computed values internally.

## Current limitations

- Boolean operations are polygonal and depend on line segment topology.
- Generic `Line` does not implement arbitrary-dimensional segment intersection; use `Line2D` for current intersection support.
- SVG import supports line-based path commands and common polygonal elements. Curves, arcs, ellipses, and SVG transforms are not implemented yet.
