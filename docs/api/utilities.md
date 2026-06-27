# Utilities

## GeometryDefaults

`GeometryDefaults` is the exported configuration object.

```ts
import { GeometryDefaults } from 'geometry-core';

GeometryDefaults.eps = 1e-8;
GeometryDefaults.errors = 'throw';
```

Fields:

| Field | Default | Purpose |
| --- | --- | --- |
| `eps` | `1e-6` | Floating-point tolerance for approximate comparisons and topology. |
| `errors` | `'throw'` | Error handling mode used by `Shape.union()`. |

`errors` accepts `'throw'`, `'preserve'`, or `'empty'`.

## Loop

`Loop<T>` is an immutable circular array-like collection used by contours.

```ts
import { Loop } from 'geometry-core';

const loop = new Loop([1, 2, 3]);
console.log(loop.at(-1)); // 3
console.log([...loop.slice(1, 3)]); // [2, 3, 1]
```

Common API:

| API | Purpose |
| --- | --- |
| `length`, iterator | Basic collection access. |
| `at(index)` | Circular indexing. |
| `slice(index, count)` | Circular forward or backward slice generator. |
| `loopRotate(start?, reverse?)` | Return a rotated loop. |
| `walk(start?, reverse?)` | Yield contextual nodes with `prev` and `next`. |
| `map`, `filter`, `reduce`, `every`, `some` | Loop-aware collection helpers. |
| `reversed` | Cached reversed loop. |
| `segment(criterion)` | Split into contiguous matching ranges. |
| `search(key, replacer)` | Stateful min/max-style search. |

## itertools

`itertools` exports iterator helpers from `src/util/iter`.

Common helpers include:

- `map`
- `filter`
- `pairwise`
- `zip`
- `cat`
- `enumerate`
- `every`
- `next`

These return iterables or generators and are used internally to avoid eager array allocation.

## PerformanceTracker

`PerformanceTracker` is exported for local timing and instrumentation. It is a utility export, not required for normal geometry operations.
