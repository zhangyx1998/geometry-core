/* ---------------------------------------------------------
 * Copyright (c) 2025-present Yuxuan Zhang, zyx@z-yx.cc
 * This source code is licensed under the MIT license.
 * You may find the full license in project root directory.
 * ------------------------------------------------------ */
import type { Vec, Vec2, BBox, Normalized, Intersection, Line } from '.';

/** Base interface for all geometric objects */
export interface Geometry<V extends Vec = Vec2> {
  /** Epsilon value (float point error capacity) for geometric operations */
  readonly eps?: number;
  /** Bounding box of the geometry */
  readonly bbox: BBox<V>;
  /** Corners in the geometry */
  readonly corners: Iterable<V>;
  /** Edges in the geometry, may be empty */
  readonly edges: Iterable<SegmentLike<V>>;
  /** Get SVG data string */
  d(digits?: number, ...args: unknown[]): string;
}

export type ReadonlySafe<T> = T extends object ? Readonly<T> : T;

export type VecOf<S> = S extends Geometry<infer V> ? V : never;

/** N-dimensional linear transformation interface */
export interface Transformable<V extends Vec> {
  /**
   * #### Translate the geometry by the specified offset vector
   * Returns a new geometry of the same type as this geometry.
   */
  translate(offset: V): this;
  /**
   * #### Scale the geometry by the specified factor from the specified center point
   * Default center is the origin [...0].
   */
  scale(factor: number, center?: V): this;
}

/** 2D-specific linear transformation interface */
export interface Transformable2D extends Transformable<Vec2> {
  /**
   * #### Rotate the geometry by the specified angle (in radians) around the specified center
   * Default center is the origin [...0].
   */
  rotate(radians: number, center?: Vec2): this;
  /**
   * #### Reflect the geometry across the specified axis
   * Default axis is the y-axis.
   * Default center is the origin [...0].
   */
  reflect(axis?: Vec2, center?: Vec2): this;
}

export interface Traceable<V extends Vec> {
  /** Get the length of the segment */
  get len(): number;
  /** Returns the point at parameter t (0 <= t <= 1) */
  pointAt(t: number): V;
}

export interface Poolable<V extends Vec> {
  /** Ensure strict equality of internal points */
  pool(pool: (v: V) => V): this;
}

/** Miniature segment interface for computational geometry */
export interface SegmentLike<
  V extends Vec,
  P = unknown,
  L extends Line<V> = Line<V>,
>
  extends Geometry<V>, Transformable<V>, Traceable<V>, Poolable<V> {
  /** Start point of the segment */
  readonly A: V;
  /** End point of the segment */
  readonly B: V;
  /** Internal parameters to fully define the segment */
  readonly params: ReadonlySafe<P>;
  /** Pseudo segment is created by contour auto-closing */
  readonly pseudo?: 'Z' | boolean;
  readonly typeName: string;
  readonly bbox: BBox<V>;
  /** Middle point of the segment, cached */
  readonly mid: V;
  /** Vector from A to B, cached */
  readonly delta: V;
  /** Pointing to +x, +y, +z, etc. (cached) */
  readonly forward: this;
  /** Pointing to -x, -y, -z, etc. (cached) */
  readonly backward: this;
  /** Reversed segment with identical shape (cached) */
  readonly reversed: this;
  /** Recreate the segment with new endpoints and parameters */
  recreate(a: V, b: Vec, params: P, pseudo?: 'Z' | true): this;
  /** Convert to SVG path string, `M` for move-to command */
  d(digits?: number, M?: boolean): string;
  /** Returns value of t at given point, approximates if point not on segment */
  tAt(p: V): number;
  /** Returns the unit tangent vector at parameter t */
  tangentAt(t: number): Normalized<V>;
  /**
   * #### Splits the segment at parameter [...s[]], s in (0, 1)
   * Caller is responsible for ensuring `s[]` is **in range** and **sorted**.
   *
   * Returns split segments [...s[n]] of the same type as this segment,
   * guarantees point strict equality at split points, i.e.
   * + seg[0].pointAt(0) === this.A
   * + seg[i].pointAt(1) === this.pointAt(s[i])
   * + seg[i].B === seg[i+1].A for i in [0, n-2]
   * + seg[n-1].pointAt(0) === this.B
   */
  splitAt(...s: (number | V)[]): this[];
  /** #### Breaks a parametric curve into line segments */
  flatten(eps: number): L[];
  /**
   * #### Lexicographical comparison by:
   * 1. Smallest bottom-left corner of bounding box
   * 2. Smallest top-right corner of bounding box
   * 3. Smallest angle of tangent vector at start point (ccw)
   * 4. Arbitrary but consistent order for segments with identical geometry
   */
  compare(other: SegmentLike<V>): number;
  /**
   * #### Get intersection points between this segment and another.
   * Inclusive starting points, exclusive ending points, i.e. `t` is within [0, 1).
   */
  intersection<S extends SegmentLike<V>>(other: S): Intersection<this, S, V>;
  /**
   * #### Get the intersection points with a hyperplane at location x.
   */
  xIntersection(x: number): Intersection<this, null, V>;
}

export type ParamOf<S, V extends Vec = VecOf<S>> =
  S extends SegmentLike<V, infer P> ? P : never;

export type PointOnSegment<V extends Vec> = {
  /** `s.pointAt(t) = v` */
  readonly t: number;
  /** `s.tAt(v) = t` */
  readonly v: V;
};

export type SplitPoint<V extends Vec, O = unknown> = PointOnSegment<V> & {
  /** wind flag */
  w: boolean;
  /** counterpart that produced this split point */
  o?: O;
};

export enum Enclosure {
  Outside = -1,
  Boundary = 0,
  Inside = 1,
}
