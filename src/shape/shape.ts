/* ---------------------------------------------------------
 * Copyright (c) 2025-present Yuxuan Zhang, zyx@z-yx.cc
 * This source code is licensed under the MIT license.
 * You may find the full license in project root directory.
 * ------------------------------------------------------ */

import Polygon, { SimplePolygon } from '../contour/polygon';
import { Line2D } from '../segment/line';
import { cat, enumerate, filter, map, next } from '../util/iter';
import { BBox, Vec2 } from '../vec';
import {
  Enclosure,
  Geometry,
  Poolable,
  SegmentLike,
  Traceable,
  Transformable2D,
} from '../types';
import BaseError, { LogicError } from '../util/error';
import { chain, Direction } from '../segment/topology';
import Intersection from '../segment/intersection';
import Config from '../util/config';
import { DEV } from '../util/debug';
import { clampPeriodic } from '../util/math';
import { Pool } from '../util/pool';

type BooleanOp = 'union' | 'intersection' | 'subtraction' | 'xor';

type BooleanOperation = (
  AL: 0 | 1,
  BL: 0 | 1,
  AR: 0 | 1,
  BR: 0 | 1,
) => 1 | 0 | -1;

function pack(a: 0 | 1, b: 0 | 1, c: 0 | 1, d: 0 | 1) {
  return (a << 3) | (b << 2) | (c << 1) | d;
}

const Operation: Record<BooleanOp, BooleanOperation> = {
  union(AL, AR, BL, BR) {
    return ((AL | BL) ^ (AR | BR)) as 1 | 0 | -1;
  },
  intersection(AL, AR, BL, BR) {
    return (~(AL & BL) & (AR & BR)) as 1 | 0 | -1;
  },
  subtraction(AL, AR, BL, BR) {
    switch (pack(AL, AR, BL, BR)) {
      case 0b0100:
        return 1;
      case 0b1101:
        return -1;
      default:
        return 0;
    }
  },
  xor(AL, AR, BL, BR) {
    switch (pack(AL, AR, BL, BR)) {
      case 0b0100:
      case 0b0001:
        return 1;
      case 0b1101:
      case 0b0111:
        return -1;
      default:
        return 0;
    }
  },
};

interface BooleanCandidate extends Geometry<Vec2>, Poolable<Vec2> {
  encloses(point: Vec2): Enclosure;
}

function booleanOperation(
  a: BooleanCandidate,
  b: BooleanCandidate,
  op: BooleanOperation,
  eps = Config.eps,
): Shape {
  const pool = Pool<Vec2>({ sort: (a, b) => a.compare(b, eps) });
  a = a.pool(pool);
  b = b.pool(pool);
  const loops_a = Array.from(a.edges);
  const loops_b = Array.from(b.edges);
  const candidates = Intersection.candidates(loops_a, loops_b);
  const intersections = new Intersection.Graph(candidates);
  const oriented = new Set<SegmentLike<Vec2>>();
  const split_a = new Set(intersections.split(loops_a, false));
  const split_b = new Set(intersections.split(loops_b, false));
  const q = (n: number) => Math.round(n / eps);
  const pv = (v: Vec2) => `${q(v.x)},${q(v.y)}`;
  const key = (s: SegmentLike<Vec2>) => `${pv(s.A)}:${pv(s.B)}`;
  const keyR = (s: SegmentLike<Vec2>) => `${pv(s.B)}:${pv(s.A)}`;
  const bucketsB = new Map<string, SegmentLike<Vec2>[]>();
  for (const s of split_b) {
    const k = key(s);
    const bucket = bucketsB.get(k);
    if (bucket) bucket.push(s);
    else bucketsB.set(k, [s]);
  }
  const pullB = (k: string) => {
    const bucket = bucketsB.get(k);
    if (!bucket || bucket.length === 0) return;
    while (bucket.length > 0) {
      const s = bucket.pop()!;
      if (split_b.has(s)) {
        if (bucket.length === 0) bucketsB.delete(k);
        return s;
      }
    }
    bucketsB.delete(k);
  };
  for (const piece of split_a) {
    // All traces follow CW/CCW convention
    const AL = 0;
    const AR = 1;
    const { mid } = piece;
    const other = pullB(key(piece)) ?? pullB(keyR(piece));
    if (other) {
      split_b.delete(other);
      if (piece.delta.dot(other.delta) > 0) {
        // Same direction, keep only one
        const BL = AL;
        const BR = AR;
        const flag = op(AL, AR, BL, BR);
        if (flag) oriented.add(flag > 0 ? piece : piece.reversed);
      } else {
        // Opposite direction, keep or discard both
        const BL = AR;
        const BR = AL;
        const flag = op(AL, AR, BL, BR);
        if (flag) {
          oriented.add(piece);
          oriented.add(other);
        }
      }
      continue;
    }
    switch (b.encloses(mid)) {
      case Enclosure.Boundary:
        // Boundary overlap should be consumed by endpoint pairing.
        break;
      case Enclosure.Inside: {
        const BL = 1;
        const BR = 1;
        const flag = op(AL, AR, BL, BR);
        if (flag) oriented.add(flag > 0 ? piece : piece.reversed);
        break;
      }
      case Enclosure.Outside: {
        const BL = 0;
        const BR = 0;
        const flag = op(AL, AR, BL, BR);
        if (flag) oriented.add(flag > 0 ? piece : piece.reversed);
        break;
      }
    }
  }
  for (const piece of split_b) {
    const BL = 0;
    const BR = 1;
    const { mid } = piece;
    switch (a.encloses(mid)) {
      case Enclosure.Boundary:
        // Overlaps should have been consumed in the A pass.
        break;
      case Enclosure.Inside: {
        const AL = 1;
        const AR = 1;
        const flag = op(AL, AR, BL, BR);
        if (flag) oriented.add(flag > 0 ? piece : piece.reversed);
        break;
      }
      case Enclosure.Outside: {
        const AL = 0;
        const AR = 0;
        const flag = op(AL, AR, BL, BR);
        if (flag) oriented.add(flag > 0 ? piece : piece.reversed);
        break;
      }
    }
  }
  const loops: SimplePolygon[] = [];
  while (oriented.size > 0) {
    const loop = Array.from(chain(oriented, Direction.CW, false, eps));
    if (loop.length < 3) continue;
    loops.push(new SimplePolygon(loop as Line2D[]));
  }
  return Shape.fromSimplePolygons(loops);
}

class ShapeValidationError extends BaseError<Polygon> {
  protected format(data?: Polygon) {
    if (data === undefined) return;
    return data.toJSON();
  }
}
/**
 * SimpleShape represents a single connected shape with one outer loop and zero
 * or more hole loops.
 *
 * Holes are represented as reversed loops to ensure consistent orientation and
 * simplify boolean operations. The constructor will automatically convert holes to
 * reversed loops, so users should provide holes in their natural orientation.
 */
export class SimpleShape
  implements Geometry<Vec2>, Transformable2D, Traceable<Vec2>, Poolable<Vec2>
{
  // Geometry Contract
  __eps__?: number;
  get eps() {
    if (this.__eps__ === undefined) {
      const { outer, holes } = this;
      this.__eps__ = Math.max(outer.eps, ...holes.map((h) => h.eps));
    }
    return this.__eps__;
  }
  get bbox(): BBox<Vec2> {
    return this.outer.bbox;
  }
  get corners(): Iterable<Vec2> {
    return cat([this.outer.corners, ...this.holes.map((hole) => hole.corners)]);
  }
  get edges(): Iterable<Line2D> {
    return cat([this.outer.edges, ...this.holes.map((hole) => hole.edges)]);
  }
  d(digits = 0): string {
    return [this.outer, ...this.holes].map((loop) => loop.d(digits)).join('\n');
  }
  // Transform helper
  protected recreate(
    outer: SimplePolygon,
    holes: Iterable<SimplePolygon>,
    ...args: unknown[]
  ): this {
    const constructor = this.constructor as new (
      outer: SimplePolygon,
      holes: Iterable<SimplePolygon>,
      ...args: unknown[]
    ) => this;
    return new constructor(outer, holes, ...args) as this;
  }
  transform(fn: (p: SimplePolygon) => SimplePolygon): this {
    const { outer, holes } = this;
    const s = this.recreate(
      fn(outer),
      holes.map((h) => fn(h)),
    );
    // Reuse cached properties if available
    s.__eps__ = this.__eps__;
    s.__valid__ = this.__valid__;
    return s;
  }
  // Transformable Contract
  translate(offset: Vec2): this {
    if (offset.eq(0)) return this;
    return this.transform((p) => p.translate(offset));
  }
  scale(factor: number, center?: Vec2): this {
    if (factor === 1) return this;
    return this.transform((p) => p.scale(factor, center));
  }
  rotate(radians: number, center?: Vec2): this {
    if (radians === 0) return this;
    return this.transform((p) => p.rotate(radians, center));
  }
  reflect(axis?: Vec2, center?: Vec2): this {
    return this.transform((p) => p.reflect(axis, center));
  }
  // Traceable Contract
  pointAt(t: number): Vec2 {
    let len = this.len * clampPeriodic(t, 0, 1);
    for (const shape of [this.outer, ...this.holes]) {
      if (len <= shape.len) return shape.pointAt(len / shape.len);
      len -= shape.len;
    }
    throw new LogicError('Unexpectedly ran out of shapes while tracing').data({
      t,
      len: this.len,
      shape: this,
    });
  }
  /** Length of all contours, inside or outside */
  get len() {
    return this.holes.reduce((sum, hole) => sum + hole.len, this.outer.len);
  }
  // Poolable Contract
  pool(pool: (v: Vec2) => Vec2) {
    return this.transform((p) => p.pool(pool));
  }
  // SimpleShape Implementation
  readonly outer: SimplePolygon;
  readonly holes: readonly SimplePolygon[];
  constructor(
    outer: SimplePolygon,
    holes: Iterable<SimplePolygon> = [],
    private __valid__?: ShapeValidationError | null,
  ) {
    outer = outer.positive;
    this.outer = outer;
    this.holes = Object.freeze(Array.from(holes, (h) => h.negative));
  }
  get area(): number {
    return (
      this.outer.area + this.holes.reduce((sum, hole) => sum + hole.area, 0)
    );
  }
  toString() {
    return this.d();
  }
  encloses(point: Vec2): Enclosure {
    const outer = this.outer.encloses(point);
    if (outer !== Enclosure.Inside) return outer;
    const holes = map(this.holes, (hole) => -hole.encloses(point));
    const filtered = filter(holes, (e) => e !== Enclosure.Inside);
    return next(filtered, () => Enclosure.Inside);
  }
  union(other: SimpleShape | Shape): Shape {
    return booleanOperation(this, other, Operation.union);
  }
  intersection(other: SimpleShape | Shape): Shape {
    return booleanOperation(this, other, Operation.intersection);
  }
  subtraction(other: SimpleShape | Shape): Shape {
    return booleanOperation(this, other, Operation.subtraction);
  }
  xor(other: SimpleShape | Shape): Shape {
    return booleanOperation(this, other, Operation.xor);
  }
  // Basic utilities
  intersections(other: SimpleShape) {
    const candidates = Intersection.candidates(this.edges, other.edges);
    return new Intersection.Graph(candidates);
  }
  // Validation
  get valid() {
    return this.problem === null;
  }
  get problem(): ShapeValidationError | null {
    if (this.__valid__ === undefined) this.__valid__ = this.validate();
    return this.__valid__;
  }
  private validate(): ShapeValidationError | null {
    const { outer, holes } = this;
    if (outer.area <= outer.eps)
      return new ShapeValidationError(
        'Outer polygon must have positive area, got',
        outer.area,
      ).data(outer);
    for (const [i, hole] of enumerate(holes)) {
      // Area check
      if (hole.area >= 0)
        return new ShapeValidationError(
          'Hole must have negative area, got',
          hole.area,
        ).data(hole);
      // Enclosure check
      for (const corner of hole.corners) {
        if (outer.encloses(corner) !== Enclosure.Inside)
          return new ShapeValidationError(
            'Hole must be strictly enclosed by outer, got corner',
            corner,
          ).data(hole);
      }
      // Mutual exclusion check
      for (const other of (holes as SimplePolygon[]).slice(0, i)) {
        if (hole.intersects(other))
          return new ShapeValidationError(
            'Holes must not intersect, got',
            ['- this : {}', '- other: ' + other.d()].join('\n'),
          ).data(hole);
      }
    }
    return null;
  }
}

function classifySimplePolygons(
  polygons: Iterable<SimplePolygon>,
): SimpleShape[] {
  const loops = Array.from(polygons, (p) => p.positive);
  if (loops.length === 0) return [];

  const parent = new Array<number>(loops.length).fill(-1);
  const depth = new Array<number>(loops.length).fill(0);

  for (let i = 0; i < loops.length; i++) {
    const child = loops[i]!;
    const probe = child.at(0).A;
    let best: number | null = null;
    let bestArea = Infinity;
    for (let j = 0; j < loops.length; j++) {
      if (i === j) continue;
      const candidate = loops[j]!;
      if (candidate.encloses(probe) !== Enclosure.Inside) continue;
      if (candidate.area < bestArea) {
        bestArea = candidate.area;
        best = j;
      }
    }
    if (best !== null) parent[i] = best;
  }

  for (let i = 0; i < loops.length; i++) {
    let d = 0;
    let p = parent[i]!;
    while (p >= 0) {
      d++;
      p = parent[p]!;
    }
    depth[i] = d;
  }

  const children = new Map<number, number[]>();
  for (let i = 0; i < loops.length; i++) {
    const p = parent[i]!;
    if (p < 0) continue;
    const arr = children.get(p);
    if (arr) arr.push(i);
    else children.set(p, [i]);
  }

  const out: SimpleShape[] = [];
  for (let i = 0; i < loops.length; i++) {
    if (depth[i]! % 2 !== 0) continue;
    const holes = (children.get(i) ?? [])
      .filter((j) => depth[j]! % 2 === 1)
      .map((j) => loops[j]!);
    out.push(new SimpleShape(loops[i]!, holes));
  }
  return out;
}

export default class Shape
  implements
    Iterable<SimpleShape>,
    Geometry<Vec2>,
    Transformable2D,
    Traceable<Vec2>
{
  static fromSimplePolygons(polygons: Iterable<SimplePolygon>): Shape {
    return new Shape(classifySimplePolygons(polygons));
  }
  static fromPolygon(polygon: Polygon): Shape {
    return Shape.fromSimplePolygons(cat([[polygon.outer], polygon.inner]));
  }
  // Geometry Contract
  get bbox(): BBox<Vec2> {
    if (this.length === 0) return new BBox(Vec2.origin);
    return BBox.merge(map(this, (shape) => shape.bbox));
  }
  get corners() {
    return cat(map(this, (shape) => shape.corners));
  }
  get edges() {
    return cat(map(this, (shape) => shape.edges));
  }
  d(digits = 0): string {
    return Array.from(this, (shape) => shape.d(digits)).join('\n');
  }
  public readonly shapes: ReadonlyArray<SimpleShape>;
  [Symbol.iterator]() {
    return this.shapes[Symbol.iterator]();
  }
  get length() {
    return this.shapes.length;
  }
  // Transform helper
  protected recreate(s: Iterable<SimpleShape>, ...args: unknown[]): this {
    const constructor = this.constructor as new (
      s: Iterable<SimpleShape | SimplePolygon>,
      ...args: unknown[]
    ) => this;
    return new constructor(s, ...args) as this;
  }
  transform(fn: (p: SimplePolygon) => SimplePolygon): this {
    return this.recreate(map(this, (shape) => shape.transform(fn)));
  }
  // Transformable Contract
  translate(offset: Vec2): this {
    if (offset.eq(0)) return this;
    return this.transform((p) => p.translate(offset));
  }
  scale(factor: number, center?: Vec2): this {
    if (factor === 1) return this;
    return this.transform((p) => p.scale(factor, center));
  }
  rotate(radians: number, center?: Vec2): this {
    if (radians === 0) return this;
    return this.transform((p) => p.rotate(radians, center));
  }
  reflect(axis?: Vec2, center?: Vec2): this {
    return this.transform((p) => p.reflect(axis, center));
  }
  // Traceable Contract
  pointAt(t: number): Vec2 {
    if (this.length === 0) return Vec2.origin;
    let len = this.len * clampPeriodic(t, 0, 1);
    for (const shape of this) {
      if (len <= shape.len) return shape.pointAt(len / shape.len);
      len -= shape.len;
    }
    throw new LogicError('Unexpectedly ran out of shapes while tracing').data({
      t,
      len: this.len,
      shape: this,
    });
  }
  /** Length of all contours, inside or outside */
  get len() {
    return this.shapes.reduce((sum, shape) => sum + shape.len, 0);
  }
  // Poolable Contract
  pool(pool: (v: Vec2) => Vec2) {
    return this.transform((p) => p.pool(pool));
  }
  // Shape Implementation
  constructor(
    shapes: Iterable<SimpleShape | SimplePolygon> = [],
    readonly eps = Config.eps,
  ) {
    this.shapes = Object.freeze(
      Array.from(shapes).map((s) =>
        s instanceof SimpleShape ? s : new SimpleShape(s),
      ),
    );
    Object.setPrototypeOf(this, new.target.prototype);
  }
  get area(): number {
    return this.shapes.reduce((sum, shape) => sum + shape.area, 0);
  }
  toString() {
    return `Shape(${this.length} simple shape${this.length !== 1 ? 's' : ''})`;
  }
  encloses(point: Vec2): Enclosure {
    const encloses = map(this.shapes, (shape) => shape.encloses(point));
    const filtered = filter(encloses, (e) => e !== Enclosure.Outside);
    return next(filtered, () => Enclosure.Outside);
  }
  union(other: BooleanCandidate): Shape {
    try {
      return booleanOperation(this, other, Operation.union);
    } catch (e) {
      switch (Config.errors) {
        case 'throw':
          throw e;
        case 'preserve':
          if (DEV)
            console.warn(
              'Boolean operation failed, returning original shape with preserved valid parts.\n' +
                e,
            );
          return this; // In a more complete implementation, we would attempt to salvage valid parts instead of returning the whole shape.
        case 'empty':
          if (DEV)
            console.warn(
              'Boolean operation failed, returning empty shape.\n' + e,
            );
          return new Shape(); // Return an empty shape on failure.
      }
    }
  }
  intersection(other: BooleanCandidate): Shape {
    return booleanOperation(this, other, Operation.intersection);
  }
  subtraction(other: BooleanCandidate): Shape {
    return booleanOperation(this, other, Operation.subtraction);
  }
  xor(other: BooleanCandidate): Shape {
    return booleanOperation(this, other, Operation.xor);
  }

  static union(...shapes: BooleanCandidate[]): Shape {
    return shapes.reduce((a, b) => a.union(b), new Shape());
  }
  static intersection(...shapes: BooleanCandidate[]): Shape {
    return shapes.reduce((a, b) => a.intersection(b), new Shape());
  }
  static subtraction(...shapes: BooleanCandidate[]): Shape {
    return shapes.reduce((a, b) => a.subtraction(b), new Shape());
  }
  static xor(...shapes: BooleanCandidate[]): Shape {
    return shapes.reduce((a, b) => a.xor(b), new Shape());
  }
}
