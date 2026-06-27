/* ---------------------------------------------------------
 * Copyright (c) 2025-present Yuxuan Zhang, zyx@z-yx.cc
 * This source code is licensed under the MIT license.
 * You may find the full license in project root directory.
 * ------------------------------------------------------ */

import Segment, { Segment2D } from '../segment/segment';
import { Line2D } from '../segment/line';
import { BBox, Vec2 } from '../vec';
import Loop from '../util/loop';
import { Enclosure, Geometry, Traceable, Transformable2D } from '../types';
import Topology, { Chain } from '../segment/topology';
import { Ascending, Descending, Ordered } from '../segment/order';
import Intersection, { IntersectionGraph } from '../segment/intersection';
import normalizeContourArgs from './normalize';
import { LogicError } from '../util/error';
import Config from '../util/config';
import { Pool } from '../util/pool';

/**
 * ### A `Contour` is a a continuous loop of 2D segments.
 * Segments are guaranteed to be connected with strictly equal points.
 */
export default class Contour<S extends Segment2D = Segment2D>
  extends Loop<S | Line2D>
  implements Chain<S | Line2D>, Geometry<Vec2>, Transformable2D, Traceable<Vec2>
{
  constructor(
    args: Iterable<Vec2 | S>,
    eps = Config.eps,
    strict = false,
    private readonly pooler = Pool<Vec2>({ sort: (a, b) => a.compare(b, eps) }),
  ) {
    eps = Math.abs(eps);
    super(normalizeContourArgs(args, eps, strict, pooler));
    this.eps = eps;
  }
  // Cachable properties
  private __d__?: string;
  private __len__?: number;
  private __bbox__?: BBox<Vec2>;
  protected __area__?: number;
  private __sorted_ascending__?: Readonly<
    (S | Line2D)[] & Ascending<S | Line2D>
  >;
  private __sorted_descending__?: Readonly<
    (S | Line2D)[] & Descending<S | Line2D>
  >;
  private __intersections__?: Readonly<IntersectionGraph<S | Line2D>>;
  // Loop Contract
  protected override recreate(
    data: Iterable<S | Line2D>,
    eps = this.eps,
    strict = false,
    pooler?: (v: Vec2) => Vec2,
    ...args: unknown[]
  ) {
    return super.recreate(data, eps, strict, pooler, ...(args as unknown[]));
  }
  protected reverseData(arr: (S | Line2D)[]) {
    return arr.map((s) => s.reversed);
  }
  // Chain Contract
  get [Topology.CHAIN]() {
    return true as const;
  }
  // Geometry Contract
  readonly eps: number;
  get bbox(): BBox<Vec2> {
    if (this.__bbox__ === undefined) this.__bbox__ = BBox.merge(this.bboxes());
    return this.__bbox__;
  }
  get corners() {
    return [...this].map(({ A }) => A);
  }
  get edges() {
    return this;
  }
  d(digits = 0): string {
    if (this.__d__ === undefined)
      this.__d__ = Array.from(this.generatePathData(digits)).join(' ');
    return this.__d__;
  }
  private *generatePathData(digits = 0) {
    let last: S | Line2D | null = null;
    for (const s of this) {
      if (last === null) yield* ['M', s.A.d(digits)];
      else if (last.pseudo !== true) yield last.d(digits, false);
      else yield* ['M', s.B.d(digits)];
      last = s;
    }
    if (last && last.pseudo !== true) {
      if (last.pseudo === 'Z' || last instanceof Line2D) yield 'Z';
      else yield last.d(digits, false);
    }
  }
  /**
   * #### Transform this contour using given functions
   * - `v` transforms vertices (segment endpoints)
   * - `s` transforms segments, given original segment and transformed vertices
   * - `attrs` transforms cached properties when available
   * Point transformations are cached and reused for connected segments.
   */
  transform(
    v: (V: Vec2) => Vec2,
    s: (s: S, A: Vec2, B: Vec2) => S,
    attrs?: {
      [k: string]: (v: any) => any;
    },
  ): this {
    let A: Vec2 | null = null;
    const transformed = this.map((s0) => {
      A ??= v(s0.A);
      const B = v(s0.B);
      const s1 = s(s0 as S, A, B);
      A = B;
      return s1;
    });
    if (attrs) {
      for (const [k, f] of Object.entries(attrs)) {
        const v = (this as any)[k];
        if (v !== undefined) (transformed as any)[k] = f((this as any)[k]);
      }
    }
    return transformed;
  }
  // Transformable Contract
  translate(offset: Vec2) {
    if (offset.eq(0)) return this;
    return this.transform(
      (v) => v.translate(offset),
      (s, A, B) => s.translate(offset, A, B),
      {
        __len__: (v: number) => v,
        __area__: (v: number) => v,
      },
    );
  }
  scale(factor: number, center?: Vec2) {
    if (factor === 1) return this;
    return this.transform(
      (v) => v.scale(factor, center),
      (s, A, B) => s.scale(factor, center, A, B),
    );
  }
  // Transformable2D Contract
  rotate(radians: number, center?: Vec2) {
    if (radians === 0) return this;
    return this.transform(
      (v) => v.rotate(radians, center),
      (s, A, B) => s.rotate(radians, center, A, B),
      {
        __len__: (v: number) => v,
        __area__: (v: number) => v,
      },
    );
  }
  reflect(axis?: Vec2, center?: Vec2) {
    return this.transform(
      (v) => v.reflect(axis, center),
      (s, A, B) => s.reflect(axis, center, A, B),
    );
  }
  // Traceable Contract
  get len() {
    if (this.__len__ === undefined) {
      let len = 0;
      for (const s of this) len += s.len;
      return (this.__len__ = len);
    }
    return this.__len__;
  }
  pointAt(t: number): Vec2 {
    let loc = this.len * t;
    let s: S | Line2D | null = null;
    for (s of this) {
      if (loc <= s.len) return s.pointAt(loc / s.len);
      loc -= s.len;
    }
    if (s !== null) return s.B;
    throw new LogicError('Empty contour has no points').data(this);
  }
  // Poolable Contract
  pool(pooler: (v: Vec2) => Vec2) {
    if (pooler === this.pooler) return this;
    return this.recreate(this, this.eps, false, pooler);
  }
  // Reuse cached properties if possible
  protected postReverse(reversed: this) {
    reversed.__bbox__ = this.__bbox__;
  }
  get typeName(): string {
    return this.constructor.name;
  }
  toString() {
    return `${this.typeName}(${this.d(4)})`;
  }
  toJSON() {
    return this.toString();
  }
  *flatten(eps: number = this.eps) {
    if (eps <= 0) eps = Infinity;
    for (const segment of this) yield* segment.flatten(eps);
  }
  private *bboxes() {
    for (const seg of this) yield seg.bbox;
  }
  /** #### Lazy cached sorting according to segment sorting rules */
  sort<O extends 'ascending' | 'descending'>(
    order: O,
  ): Readonly<(S | Line2D)[] & Ordered<O, S | Line2D>> {
    switch (order) {
      case 'ascending': {
        if (!this.__sorted_ascending__) {
          const sorted = Segment.sort(this, 'ascending');
          this.__sorted_ascending__ = Object.freeze(sorted);
        }
        return this.__sorted_ascending__ as Readonly<
          (S | Line2D)[] & Ordered<O, S | Line2D>
        >;
      }
      case 'descending': {
        if (!this.__sorted_descending__) {
          const sorted = Segment.sort(this, 'descending');
          this.__sorted_descending__ = Object.freeze(sorted);
        }
        return this.__sorted_descending__ as Readonly<
          (S | Line2D)[] & Ordered<O, S | Line2D>
        >;
      }
      default:
        throw new Error(`Unknown sort order: ${order}`);
    }
  }
  /** #### Internal intersections (cached) */
  get intersections() {
    if (!this.__intersections__) {
      const segments = this.sort('ascending');
      const candidates = Intersection.candidates(segments);
      const intersections = new Intersection.Graph(candidates);
      this.__intersections__ = Object.freeze(intersections);
    }
    return this.__intersections__;
  }
  /**
   * #### Check if given point is inside contour.
   */
  encloses(point: Vec2): Enclosure {
    const { x: px, y: py } = point;
    const { eps } = this;
    let above_count = 0;
    for (const seg of this) {
      for (const { type, points } of seg.xIntersection(px)) {
        switch (type) {
          case 'cross':
            for (const { v, t } of points) {
              if (v.y < py - eps && t < 1) above_count++;
              if (Math.abs(v.y - py) <= eps) return Enclosure.Boundary;
            }
            continue;
          case 'tangent':
            for (const { v } of points)
              if (Math.abs(v.y - py) <= eps) return Enclosure.Boundary;
            continue;
          case 'overlap': {
            const [y0, y1] = points.map(({ v }) => v.y).sort((a, b) => a - b);
            if (y0 - eps <= py && py <= y1 + eps) return Enclosure.Boundary;
            continue;
          }
        }
      }
    }
    return above_count % 2 === 1 ? Enclosure.Inside : Enclosure.Outside;
  }
  /**
   * #### Check if this contour intersects with another.
   */
  intersects(other: Contour<S>, inclusive = true): boolean {
    if (this === other) return true;
    if (this.bbox.intersect(other.bbox, inclusive) === null) return false;
    for (const [s0, c] of Intersection.candidates(this, other)) {
      for (const s1 of c) {
        const { type } = s0.intersection(s1);
        if (type === 'none') continue;
        if (type === 'cross' || inclusive) return true;
      }
    }
    return false;
  }
}
