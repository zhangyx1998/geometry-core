# Vectors and Boxes

## Vec

`Vec` is the base immutable coordinate container. It can represent any number of dimensions.

```ts
import { Vec } from 'geometry-core';

const a = new Vec([1, 2, 3]);
const b = a.add([3, 2, 1]);

console.log(b.d());      // "4,4,4"
console.log(a.dot(b));   // 24
```

Common methods and getters:

| API | Purpose |
| --- | --- |
| `data`, `dim`, `at(i, fallback)` | Access coordinates. |
| `add`, `sub`, `mul`, `div` | Element-wise arithmetic with a scalar or iterable. |
| `dot`, `angle` | Vector dot product and unsigned angle. |
| `len`, `unit`, `isNormalized` | Cached length and normalized vector. |
| `eq(other, eps)`, `compare(other, eps)` | Approximate equality and lexicographic ordering. |
| `neg` | Cached negated vector. |
| `translate`, `scale` | Transformable interface. |
| `d(digits?, sep?)` | Coordinate string for SVG output. |

Static helpers include `Vec.sum`, `Vec.sorted`, `Vec.unique`, `Vec.min`, `Vec.max`, `Vec.range`, and `Vec.parse`.

## Vec2

`Vec2` fixes dimensionality to `[x, y]` and adds 2D operations.

```ts
import { Vec2 } from 'geometry-core';

const p = new Vec2([10, 0]);
const q = p.rotate(Math.PI / 2);

console.log(q.x, q.y);
console.log(Vec2.X.cross(Vec2.Y)); // 1
```

Additional API:

| API | Purpose |
| --- | --- |
| `x`, `y` | Coordinate getters. |
| `rotate(radians, center?)` | Rotate around the origin or a center. |
| `reflect(axis?, center?)` | Reflect across an axis, defaulting to the y-axis. |
| `cross(other)` | 2D scalar cross product. |
| `angle(other)` | Signed angle in `[-pi, pi]`. |
| `vec3` | Upgrade to `Vec3` with `z = 0`. |
| `Vec2.origin`, `Vec2.X`, `Vec2.Y` | Shared axis vectors. |

## Vec3

`Vec3` fixes dimensionality to `[x, y, z]`.

```ts
import { Vec3 } from 'geometry-core';

const n = Vec3.X.cross(Vec3.Y);
console.log(n.eq(Vec3.Z)); // true
```

`Vec3.cross()` returns a `Vec3`. `Vec3.angle(other, normal?)` returns an unsigned angle by default, or a signed orientation around `normal` in `[0, 2pi)`.

## Size2 and Size3

`Size2` and `Size3` are vector subclasses with dimension aliases:

- `Size2.width`, `Size2.height`
- `Size3.width`, `Size3.height`, `Size3.depth`

They are mainly returned by bounding boxes.

## BBox

`BBox` stores inclusive lower and upper corners as `A` and `B`.

```ts
import { BBox, Vec2 } from 'geometry-core';

const box = new BBox(new Vec2([0, 0]), [10, 20]);

console.log(box.size.width); // 10
console.log(box.center.d()); // "5,10"
console.log(box.viewBox);    // "0 0 10 20"
```

Common API:

| API | Purpose |
| --- | --- |
| `size`, `center`, `corners`, `viewBox` | Cached box information. |
| `square` | Smallest square box with the same center. |
| `aspect(...sides)` | Expand to match an aspect ratio. |
| `expand(delta)`, `shrink(delta)` | Pad or contract the box. |
| `translate(offset)` | Move the box without changing its size. |
| `intersect(other, inclusive?)` | Return the intersection box or `null`. |
| `BBox.merge(boxes)` | Merge boxes into one containing box. |
