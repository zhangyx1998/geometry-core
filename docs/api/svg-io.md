# SVG I/O

Every `Geometry` object exposes `d()` for SVG path data. The `IO` namespace contains helpers for reading supported SVG elements back into geometry.

```ts
import { IO, Shape } from 'geometry-core';

const items = [...IO.fromSVG(svgElement)];
const shapes = items.filter((item): item is Shape => item instanceof Shape);
```

## Supported import helpers

| API | Input | Output |
| --- | --- | --- |
| `IO.fromSVG(el)` | `<svg>` or `<g>` | Generator of geometry items. |
| `IO.inflate(el)` | Any supported SVG element | Generator of geometry items. |
| `IO.fromPathElement(el)` | `<path>` | `Polygon`, `Contour`, or `Shape`. |
| `IO.fromPolygonElement(el)` | `<polygon>` or `<polyline>` | `Polygon` or `Line2D`. |
| `IO.fromRectElement(el)` | `<rect>` | `SimplePolygon`. |
| `IO.fromCircleElement(el, eps?, divisions?)` | `<circle>` | Approximate `SimplePolygon`. |
| `IO.fromLineElement(el)` | `<line>` | `Line2D`. |

`IO.SourceElement` is a `WeakMap<Geometry<Vec2>, SVGElement>` that records the original SVG element for geometry produced by the import helpers.

## Path command support

Supported commands:

- `M`, `m`
- `L`, `l`
- `H`, `h`
- `V`, `v`
- `Z`, `z`

Unsupported commands currently throw:

- cubic Beziers: `C`, `c`, `S`, `s`
- quadratic Beziers: `Q`, `q`, `T`, `t`
- arcs: `A`, `a`
- ellipses via `<ellipse>`

SVG transforms in attributes or styles are currently ignored.

## Exporting path data

```ts
import { Shape } from 'geometry-core';

function render(shape: Shape) {
  return `<path d="${shape.d(2)}" fill="currentColor" />`;
}
```

For multiple loops, `Shape.d()` and `SimpleShape.d()` return newline-separated path commands.
