---
layout: home

hero:
  name: Geometry Core
  text: TypeScript primitives for planar geometry
  tagline: Vectors, line segments, contours, polygons, SVG import helpers, and boolean shape operations packaged as immutable geometry objects.
  actions:
    - theme: brand
      text: API Reference
      link: /api/
    - theme: alt
      text: Conventions
      link: /conventions
    - theme: alt
      text: Playground
      link: /playground/offset

features:
  - title: Immutable primitives
    details: Vectors, segments, contours, polygons, and shapes return transformed copies instead of mutating existing objects.
  - title: SVG path data
    details: Geometry objects expose d() methods for SVG output, and IO helpers inflate supported SVG elements back into geometry.
  - title: Shape operations
    details: SimpleShape and Shape support union, intersection, subtraction, and xor over polygonal boundaries.
---

## Install

```sh
npm install geometry-core
```

```ts
import { Polygon, Shape, Vec2 } from 'geometry-core';

const square = new Polygon([
  new Vec2([0, 0]),
  new Vec2([0, 40]),
  new Vec2([40, 40]),
  new Vec2([40, 0]),
]);

const moved = new Shape([square.outer]).translate(new Vec2([10, 0]));
console.log(moved.area);
```

## Current scope

`geometry-core` is focused on polygonal 2D geometry. Generic `Vec` and `Vec3` are available, but most topology, intersection, offset, boolean, and SVG helpers operate on `Vec2`, `Line2D`, `Polygon`, `SimplePolygon`, `SimpleShape`, and `Shape`.
