# Conventions

Geometry objects are designed as value-like immutable objects. Transformations return new objects, while frequently used derived values are cached lazily.

## Getter vs method

- Class getters must not impose heavy computation overhead.
- If a value is expensive to derive, compute it lazily and cache it on first access so subsequent getter reads are cheap.
- Any routine that is not cached must be exposed as a method, even when it takes zero arguments.

## Naming guidance

- Prefer noun-like names for cached getters (for example, `area`, `bounds`, `centroid`).
- Prefer verb-like names for methods that perform work each call (for example, `computeArea()`, `toPolygon()`, `intersects()`).

## Coordinates

- `Vec2` stores `[x, y]`.
- `Vec3` stores `[x, y, z]`.
- Missing dimensions are filled with zero and extra dimensions are truncated by fixed-dimension subclasses.
- Angles are radians unless a method explicitly says otherwise.

## Orientation

- `SimplePolygon.area` is signed.
- `SimplePolygon.positive` returns a counter-clockwise positive-area loop.
- `SimplePolygon.negative` returns the reversed negative-area loop.
- `SimpleShape` normalizes its outer loop to positive orientation and holes to negative orientation.

## Epsilon

Most 2D topology code accepts or reads an epsilon value. The default is `GeometryDefaults.eps`, currently `1e-6`.
