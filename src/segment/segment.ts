/* ---------------------------------------------------------
 * Copyright (c) 2025-present Yuxuan Zhang, zyx@z-yx.cc
 * This source code is licensed under the MIT license.
 * You may find the full license in project root directory.
 * ------------------------------------------------------ */

import Intersection from './intersection';
import { ReadonlySafe, SegmentLike, Transformable2D, VecOf } from '../types';
import { id } from '../util/id';
import Vec, { BBox, Normalized, Vec2 } from '../vec';
import Line, { Line2D } from './line';
import Order, { Ascending, Descending } from './order';

// Immutable Segment
export default abstract class Segment<
  V extends Vec = Vec,
  P = unknown,
  L extends Line<V> = Line<V>,
> implements SegmentLike<V, P, L> {
  // Geometry Contract
  abstract get bbox(): BBox<V>;
  get edges() {
    return [];
  }
  get corners() {
    return [this.A, this.B];
  }
  abstract d(round?: number, M?: boolean): string;
  // Transformable Contract
  translate(
    offset: V,
    A = this.A.translate(offset),
    B = this.B.translate(offset),
  ): this {
    const params = this.paramsTranslate(offset, A, B);
    return this.recreate(A, B, params);
  }
  // Traceable Contract
  abstract get len(): number;
  abstract pointAt(t: number): V;
  /**
   * #### Override to handle param transformation.
   * `A` and `B` have been transformed to destination by the caller.
   */
  paramsTranslate(offset: V, A: V, B: V) {
    return this.params as P;
  }
  scale(
    factor: number,
    center?: V,
    A = this.A.scale(factor, center),
    B = this.B.scale(factor, center),
  ): this {
    const params = this.paramsScale(factor, center, A, B);
    return this.recreate(A, B, params);
  }
  /**
   * #### Override to handle param transformation.
   * `A` and `B` have been transformed to destination by the caller.
   */
  paramsScale(factor: number, center: V | undefined, A: V, B: V) {
    return this.params as P;
  }

  // Loop Contract
  abstract recreate(a: V, b: Vec, params: P): this;

  // SegmentLike Contract
  readonly A: V;
  readonly B: V;
  readonly params: ReadonlySafe<P>;
  readonly pseudo: 'Z' | boolean = false;
  get mid() {
    if (this.__mid__ === undefined) this.__mid__ = this.pointAt(0.5);
    return this.__mid__;
  }
  get delta() {
    this.__delta__ ??= this.B.sub(this.A);
    return this.__delta__;
  }
  abstract tAt(p: V): number;
  abstract tangentAt(t: number): Normalized<V>;
  abstract splitAt(...s: (number | V)[]): this[];
  abstract flatten(eps: number): L[];

  // Poolable Contract
  pool(pool: (v: V) => V) {
    const A = pool(this.A);
    const B = pool(this.B);
    if (A === this.A && B === this.B) return this;
    return this.recreate(A, B, this.params);
  }

  // Cached properties
  private __mid__?: V;
  private __delta__?: V;
  private __reversed__?: this;
  private __canonical__?: boolean;

  constructor(a: V, b: Vec, params: P) {
    this.A = a;
    this.B = b instanceof a.ctor ? b : b.like(a);
    this.params = (
      typeof params === 'object' && params !== null ? { ...params } : params
    ) as ReadonlySafe<P>;
  }
  get typeName(): string {
    return this.constructor.name;
  }
  get Vec() {
    return this.A.ctor;
  }
  get dim() {
    return this.A.dim;
  }
  toString() {
    return `${this.typeName}(${this.d(4, true)})`;
  }
  toJSON() {
    return this.toString();
  }
  [Symbol.toStringTag]() {
    return this.typeName;
  }
  [Symbol.iterator]() {
    return this.corners[Symbol.iterator]();
  }
  // Cached reversed dual
  get reversed(): this {
    if (this.__reversed__ === undefined) {
      this.__reversed__ = this.getReversed();
      this.__reversed__.__reversed__ = this;
    }
    return this.__reversed__;
  }
  protected abstract getReversed(): this;
  // Cached canonical flag for consistent sorting
  compare(other: SegmentLike<V>): number {
    const a = this;
    const b = other;
    return (
      a.bbox.A.compare(b.bbox.A) || // Smallest bottom-left corner
      a.bbox.B.compare(b.bbox.B) || // Smallest top-right corner
      a.tangentAt(0).angle(b.tangentAt(0)) || // Smallest angle
      id(a) - id(b) // Arbitrary but consistent order for identical geometry
    );
  }
  get canonical(): boolean {
    if (this.__canonical__ === undefined) {
      this.__canonical__ = this.compare(this.reversed) >= 0;
      this.reversed.__canonical__ = !this.__canonical__;
    }
    return this.__canonical__;
  }
  get forward(): this {
    return this.canonical ? this : this.reversed;
  }
  get backward(): this {
    return this.canonical ? this.reversed : this;
  }
  abstract intersection<S extends SegmentLike<V>>(
    other: S,
  ): Intersection<this, S, V>;
  abstract xIntersection(x: number): Intersection<this, null, V>;
  // Static methods
  static sort<S extends SegmentLike<V>, V extends Vec = VecOf<S>>(
    segments: Iterable<S>,
    mode?: 'ascending',
  ): S[] & Ascending<S>;
  static sort<S extends SegmentLike<V>, V extends Vec = VecOf<S>>(
    segments: Iterable<S>,
    mode: 'descending',
  ): S[] & Descending<S>;
  static sort<S extends SegmentLike<V>, V extends Vec = VecOf<S>>(
    segments: Iterable<S>,
    mode: 'ascending' | 'descending' = 'ascending',
  ) {
    const compare = {
      ascending: (a: S, b: S) => a.compare(b),
      descending: (a: S, b: S) => b.compare(a),
    }[mode];
    return Order.sort(segments, mode, compare);
  }
}

export abstract class Segment2D<P = unknown>
  extends Segment<Vec2, P, Line2D>
  implements Transformable2D
{
  // Transformable2D Contract
  rotate(
    angle: number,
    center?: Vec2,
    A = this.A.rotate(angle, center),
    B = this.B.rotate(angle, center),
  ): this {
    const params = this.paramsRotate(angle, center, A, B);
    return this.recreate(A, B, params);
  }
  /**
   * #### Override to handle param transformation.
   * `A` and `B` have been transformed to destination by the caller.
   */
  paramsRotate(angle: number, center: Vec2 | undefined, A: Vec2, B: Vec2) {
    return this.params as P;
  }
  reflect(
    axis?: Vec2,
    center?: Vec2,
    A = this.A.reflect(axis, center),
    B = this.B.reflect(axis, center),
  ): this {
    const params = this.paramsReflect(axis, center, A, B);
    return this.recreate(A, B, params);
  }
  /**
   * #### Override to handle param transformation.
   * `A` and `B` have been transformed to destination by the caller.
   */
  paramsReflect(
    axis: Vec2 | undefined,
    center: Vec2 | undefined,
    A: Vec2,
    B: Vec2,
  ) {
    return this.params as P;
  }
}
