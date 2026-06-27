# Shapes

Shapes group polygon loops into filled regions.

## SimpleShape

`SimpleShape` represents one connected filled region with one outer `SimplePolygon` and zero or more hole loops.

```ts
import { SimplePolygon, SimpleShape, Vec2 } from 'geometry-core';

const outer = new SimplePolygon([
  new Vec2([0, 0]),
  new Vec2([0, 100]),
  new Vec2([100, 100]),
  new Vec2([100, 0]),
]);

const hole = new SimplePolygon([
  new Vec2([25, 25]),
  new Vec2([25, 75]),
  new Vec2([75, 75]),
  new Vec2([75, 25]),
]);

const shape = new SimpleShape(outer, [hole]);
console.log(shape.area);
```

Constructor normalization:

- `outer` is converted to positive orientation.
- holes are converted to negative orientation.

Common API:

| API | Purpose |
| --- | --- |
| `outer`, `holes` | Boundary loops. |
| `area`, `len`, `bbox`, `corners`, `edges` | Geometry and traceable properties. |
| `d(digits?)` | Multiline SVG path data. |
| `translate`, `scale`, `rotate`, `reflect` | 2D transforms. |
| `pointAt(t)` | Trace over outer and hole perimeters. |
| `encloses(point)` | Point classification against outer and holes. |
| `valid`, `problem` | Validation result and diagnostic. |
| `intersections(other)` | Intersection graph against another simple shape. |

## Shape

`Shape` is a collection of `SimpleShape` regions.

```ts
import { Shape, Vec2 } from 'geometry-core';

const a = new Shape([outer]);
const b = new Shape([hole.translate(new Vec2([40, 0]))]);

const union = a.union(b);
const cut = a.subtraction(b);
```

Shape API:

| API | Purpose |
| --- | --- |
| `shapes`, `length`, iterator | Access component simple shapes. |
| `area`, `len`, `bbox`, `corners`, `edges` | Aggregate geometry. |
| `d(digits?)` | Multiline SVG path data. |
| `translate`, `scale`, `rotate`, `reflect` | Transform all loops. |
| `pointAt(t)` | Trace aggregate boundary length. |
| `encloses(point)` | First non-outside component classification. |
| `union`, `intersection`, `subtraction`, `xor` | Boolean operations. |
| `Shape.fromSimplePolygons(polygons)` | Classify simple loops into regions and holes. |
| `Shape.fromPolygon(polygon)` | Convert a polygon decomposition to a shape. |

Static boolean helpers reduce multiple inputs:

```ts
const merged = Shape.union(shapeA, shapeB, shapeC);
```

## Error handling

`Shape.union()` catches boolean-operation failures according to `GeometryDefaults.errors`:

- `'throw'`: rethrow the error.
- `'preserve'`: warn and return the original shape.
- `'empty'`: warn and return an empty shape.

Other boolean methods currently call the operation directly.
