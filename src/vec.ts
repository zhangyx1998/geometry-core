/* ---------------------------------------------------------
 * Copyright (c) 2025-present Yuxuan Zhang, zyx@z-yx.cc
 * This source code is licensed under the MIT license.
 * You may find the full license in project root directory.
 * ------------------------------------------------------ */

import { Enclosure, Geometry, Transformable, Transformable2D } from './types';
import Config from './util/config';
import { enumerate, every, map, zip } from './util/iter';

type Broadcasted = { a: number; b: number; i: number };

type Broadcastable = number | Iterable<number>;

export type Normalized<V extends Vec, N extends boolean = true> = V & {
  isNormalized: N;
};

export default class Vec implements Geometry<Vec>, Transformable<Vec> {
  // Geometry Contract
  get bbox() {
    return new BBox(this, this);
  }
  get corners() {
    return [this];
  }
  get edges() {
    return [];
  }
  d(digits = 0, sep = ','): string {
    const arr = Array.from(this.data);
    if (digits > 0) return arr.map(x => x.toFixed(digits)).join(sep);
    else return ensureDim(this, this.dim).join(sep);
  }
  // Transformable Contract
  translate(offset: Vec): this {
    return this.add(offset);
  }
  scale(factor: number, center?: Vec): this {
    if (center === undefined) return this.mul(factor);
    return this.sub(center).mul(factor).add(center);
  }
  // Vec class
  readonly data: readonly number[];
  get typeName() {
    return this.constructor.name;
  }
  toString() {
    return `${this.typeName}(${this.d(4)})`;
  }
  toJSON() {
    return this.toString();
  }
  at(i: number, fallback: number = 0) {
    return this.data[i] ?? fallback;
  }
  [Symbol.toStringTag]() {
    return this.typeName;
  }
  like<V extends Vec>(
    derived: V | (new (data: Iterable<number>, eps?: number) => V),
  ) {
    const v =
      derived instanceof Vec
        ? new derived.ctor(this.data)
        : new derived(this.data);
    // Preserve length and normalization cache if possible
    if (v.dim >= this.dim) {
      v._len = this._len;
      if (this.isNormalized) v.setUnitVec(v);
    }
    return v;
  }
  get dim() {
    return this.data.length;
  }
  // Cached len property
  private _len?: number;
  get len() {
    if (this._len === undefined) this._len = Math.sqrt(this.dot(this));
    return this._len;
  }
  // Cached norm property
  private _unit?: this;
  /** #### Unit vector along the same direction of this vector */
  get unit(): Normalized<this> {
    if (this._unit === undefined) this._unit = this.normalize();
    return this._unit as Normalized<this>;
  }
  /**
   * Manually define or override the unit vector of this vector.
   * (internal)
   */
  protected setUnitVec(): Normalized<this>;
  protected setUnitVec(v: this): this;
  protected setUnitVec(value: this = this): this {
    this._unit = value;
    if (this.isNormalized) this._len = 1;
    return this;
  }
  get isNormalized() {
    return this._unit === this;
  }
  private normalize() {
    const { len } = this;
    if (len === 0) throw new TypeError('Cannot normalize zero-dim vector');
    const norm = len === 1 ? this : this.div(len);
    return norm.setUnitVec();
  }
  declare static readonly origin?: Normalized<Vec, false>;
  get origin(): this {
    return (this.constructor as any).origin ?? new this.ctor([]);
  }
  [Symbol.iterator]() {
    return this.data[Symbol.iterator]();
  }
  get ctor() {
    return this.constructor as new (data: Iterable<number>) => this;
  }
  constructor(data: Iterable<number>) {
    this.data = Array.from(data);
  }
  // Iterable operations
  protected *broadcast(other: Broadcastable): Generator<Broadcasted> {
    if (typeof other === 'number') {
      if (Number.isNaN(other)) throw new TypeError('Invalid number provided');
      let i = 0;
      for (const v of this.data) yield { a: v, b: other, i: ++i };
    } else {
      const v = other instanceof Vec ? other : new this.ctor(other);
      for (let i = 0; i < this.dim; i++)
        yield { a: this.at(i, 0), b: v.at(i, 0), i };
    }
  }
  map(cb: (_: Broadcasted) => number, other: Broadcastable): this {
    return new this.ctor(map(this.broadcast(other), cb));
  }
  // Basic algebraic operations
  add(other: Broadcastable): this {
    return this.map(Vec.add, other);
  }
  sub(other: Broadcastable): this {
    return this.map(Vec.sub, other);
  }
  mul(other: Broadcastable): this {
    return this.map(Vec.mul, other);
  }
  div(other: Broadcastable): this {
    return this.map(Vec.div, other);
  }
  dot(other: Broadcastable): number {
    let sum = 0;
    for (const { a, b } of this.broadcast(other)) sum += a * b;
    return sum;
  }
  angle(other: Vec): number {
    const aa = this.dot(this);
    const bb = other.dot(other);
    if (aa === 0 || bb === 0)
      throw new TypeError('Cannot compute angle with zero-length vector');
    const d = this.dot(other);
    const c2 = Math.max(0, aa * bb - d * d);
    return Math.atan2(Math.sqrt(c2), d);
  }
  eq(other: Broadcastable, eps = Config.eps): boolean {
    let sum = 0;
    if (this === other) return true;
    for (const { a, b } of this.broadcast(other)) {
      const delta = Math.abs(a - b);
      if (delta > eps) return false;
      sum += delta * delta;
    }
    return Math.sqrt(sum) <= eps;
  }
  // Cached dual for negation
  _neg?: this;
  get neg() {
    if (this._neg === undefined) {
      const neg = this.mul(-1);
      neg._neg = neg;
      neg._len = this._len;
      if (this.isNormalized) neg.setUnitVec(neg);
      this._neg = neg;
    }
    return this._neg;
  }
  /**
   * #### Lexicographical comparison by each dimension in order
   * 1. Negative: other is on +x, +y, etc. side of this vector
   * 2. Positive: other is on -x, -y, etc. side of this vector
   * 3. Zero: vectors are equal in all dimensions
   */
  compare(other: Broadcastable, eps = 0): number {
    for (const { a, b } of this.broadcast(other)) {
      const diff = a - b;
      if (diff && Math.abs(diff) > eps) return diff;
    }
    return 0;
  }
  static add({ a, b }: Broadcasted) {
    return a + b;
  }
  static sub({ a, b }: Broadcasted) {
    return a - b;
  }
  static mul({ a, b }: Broadcasted) {
    return a * b;
  }
  static div({ a, b }: Broadcasted) {
    return a / b;
  }
  // Sum multiple vectors element-wise
  static sum<V extends Vec>(vec: V, ...vecs: V[]): V {
    return vecs.reduce((a, b) => a.add(b), vec);
  }
  // Compare by each dimension in order
  static sorted<V extends Vec>(items: Iterable<V>, ascending = true): V[] {
    return [...items].sort(
      ascending ? (a, b) => a.compare(b) : (a, b) => b.compare(a),
    );
  }
  // Remove duplicates (with optional epsilon for approximate equality)
  static unique<V extends Vec>(items: Iterable<V>, eps = 1e-6): V[] {
    const result: V[] = [];
    for (const v of items) if (!result.some(u => v.eq(u, eps))) result.push(v);
    return result;
  }
  // Per axis scans
  static min<V extends Vec>(v: V, ...others: Iterable<number>[]): V {
    const values = [...v];
    const dim = v.dim;
    for (const other of others)
      for (const [i, n] of enumerate(ensureDim(other, dim)))
        if (n < values[i]) values[i] = n;
    return new v.ctor(values);
  }
  static max<V extends Vec>(v: V, ...others: Iterable<number>[]): V {
    const values = [...v];
    const dim = v.dim;
    for (const other of others)
      for (const [i, n] of enumerate(ensureDim(other, dim)))
        if (n > values[i]) values[i] = n;
    return new v.ctor(values);
  }
  /** #### Returns a tuple of [min, max], dimension-wise */
  static range<V extends Vec>(v: V, ...others: Iterable<number>[]): [V, V] {
    const min = [...v];
    const max = [...v];
    const dim = v.dim;
    for (const other of others)
      for (const [i, n] of enumerate(ensureDim(other, dim)))
        if (n < min[i]) min[i] = n;
        else if (n > max[i]) max[i] = n;
    const { ctor } = v;
    return [new ctor(min), new ctor(max)];
  }
  /** Convert from string representation */
  static parse(src: string, delimiter = /[,\s]+/, dim?: number): Vec {
    const parts = src.trim().split(delimiter);
    if (dim === undefined) return new Vec(parts.map(Number));
    return new Vec(ensureDim(parts.map(Number), dim));
  }
}

/**
 * ### Produces an array of number with specified length.
 * Missing values are filled with `fill` (default 0). Extra values are truncated.
 */
function ensureDim(v: Iterable<number>, dim: number, fill = 0) {
  const arr = [];
  for (const n of v) {
    if (arr.length >= dim) break;
    arr.push(n);
  }
  while (arr.length < dim) arr.push(fill);
  return arr;
}

export class Vec2 extends Vec implements Transformable2D {
  // Transformable2D Contract
  rotate(radians: number, center?: Vec2): this {
    const c = Math.cos(radians);
    const s = Math.sin(radians);
    const [x, y] = center === undefined ? this : this.sub(center);
    const rotated = new this.ctor([x * c - y * s, x * s + y * c]);
    return center === undefined ? rotated : rotated.add(center);
  }
  reflect(axis?: Vec2, center?: Vec2): this {
    const centered = center === undefined ? this : this.sub(center);
    const reflected =
      axis === undefined
        ? new this.ctor([-centered.x, centered.y])
        : centered.sub(axis.mul((2 * centered.dot(axis)) / axis.dot(axis)));
    return center === undefined ? reflected : reflected.add(center);
  }
  // Vec2 implementation
  constructor(data: Iterable<number>) {
    super(ensureDim(data, 2));
  }
  get dim() {
    return 2;
  }
  get x() {
    return this.at(0);
  }
  get y() {
    return this.at(1);
  }
  /** Upgrade to a three dimension with z = 0 */
  get vec3() {
    return new Vec3(this.data);
  }
  cross(other: Vec): number {
    const [ax, ay] = this;
    const [bx, by] = other.like(this);
    return ax * by - bx * ay;
  }
  /**
   * Angle from this vector to another in radians, range [-π, π]
   */
  angle(other: Vec): number {
    const a = this.unit;
    const b = other.like(this).unit;
    const c = a.cross(b);
    const d = a.dot(b);
    return Math.atan2(c, d);
  }
  // Unit axis norms
  static readonly origin = new Vec2([0, 0]) as Normalized<Vec2, false>;
  static readonly X = new Vec2([1, 0]).setUnitVec();
  static readonly Y = new Vec2([0, 1]).setUnitVec();
  /** Convert from string representation */
  static parse(src: string, delimiter = /[,\s]+/): Vec2 {
    const parts = src.trim().split(delimiter);
    return new this(parts.map(Number));
  }
}

export class Size2 extends Vec2 {
  get width() {
    return this.x;
  }
  get height() {
    return this.y;
  }
}

export class Vec3 extends Vec {
  constructor(data: Iterable<number>) {
    super(ensureDim(data, 3));
  }
  get dim() {
    return 3;
  }
  get x() {
    return this.at(0);
  }
  get y() {
    return this.at(1);
  }
  get z() {
    return this.at(2);
  }
  cross(other: Vec): Vec3 {
    const [a1, a2, a3] = this;
    const [b1, b2, b3] = other.like(this);
    return new Vec3([a2 * b3 - a3 * b2, a3 * b1 - a1 * b3, a1 * b2 - a2 * b1]);
  }
  angle(other: Vec, normal?: Vec3): number {
    if (!normal) return super.angle(other);
    const A = this.unit;
    const B = other.like(this).unit;
    const c = A.cross(B);
    const d = A.dot(B);
    const n = normal.unit;
    const signed = Math.atan2(n.dot(c), d);
    return signed >= 0 ? signed : signed + 2 * Math.PI;
  }
  // Unit axis norms
  static readonly origin = new Vec3([0, 0, 0]) as Normalized<Vec3, false>;
  static readonly X = new Vec3([1, 0, 0]).setUnitVec();
  static readonly Y = new Vec3([0, 1, 0]).setUnitVec();
  static readonly Z = new Vec3([0, 0, 1]).setUnitVec();
  /** Convert from string representation */
  static parse(src: string, delimiter = /[,\s]+/): Vec3 {
    const parts = src.trim().split(delimiter);
    return new this(parts.map(Number));
  }
}

export class Size3 extends Vec3 {
  get width() {
    return this.x;
  }
  get height() {
    return this.y;
  }
  get depth() {
    return this.z;
  }
}

type BBoxSize<V extends Vec> = V extends Vec2
  ? Size2
  : V extends Vec3
    ? Size3
    : V;

/**
 * ### Bounding box defined by two opposite corners A and B
 * + A is the minimum corner in all dimensions
 * + B is the maximum corner in all dimensions
 * + Both corners are inclusive.
 */
export class BBox<V extends Vec> {
  /** Lower bound */
  readonly A: V;
  /** Upper bound */
  readonly B: V;
  get dim() {
    return this.A.dim;
  }
  toString() {
    return `BBox(${this.A.toString()}, ${this.B.toString()})`;
  }
  /** #### Cached size of the bounding box */
  get size(): BBoxSize<V> {
    if (this.__size__ === undefined) {
      const s = this.B.sub(this.A);
      if (Object.is(this.Vec, Vec2))
        this.__size__ = new Size2(s) as BBoxSize<V>;
      else if (Object.is(this.Vec, Vec3))
        this.__size__ = new Size3(s) as BBoxSize<V>;
      else this.__size__ = s as BBoxSize<V>;
    }
    return this.__size__;
  }
  private __size__?: BBoxSize<V>;

  /** #### Cached center of the bounding box */
  get center(): V {
    if (this.__center__ === undefined)
      this.__center__ = this.A.add(this.size.mul(0.5));
    return this.__center__;
  }
  private __center__?: V;

  get Vec() {
    return this.A.ctor;
  }
  get corners(): [V, V] {
    return [this.A, this.B];
  }
  get viewBox(): string {
    return [
      ...this.A, // x y (z)
      ...this.size, // w h (d)
    ].join(' ');
  }
  constructor(corner: V, ...corners: Iterable<number>[]) {
    [this.A, this.B] = Vec.range(corner, ...corners);
  }
  /**
   * #### Expand the bounding box to the smallest square that contains it.
   * The center of the bounding box remains unchanged.
   * Cached for subsequent calls.
   */
  get square(): BBox<V> {
    if (this.__square__ === undefined) {
      const square = this.aspect();
      this.__square__ = square.__square__ = square;
    }
    return this.__square__;
  }
  private __square__?: BBox<V>;

  /**
   * #### Match the aspect ratio of the bounding box to the given sides.
   * The center of the bounding box remains unchanged.
   *
   * #### [Example] To make a 2D BBox 16:9, use either:
   * 1. `bbox.aspect(16, 9)`
   * 2. `bbox.aspect(16 / 9)`
   */
  aspect(...sides: number[]): BBox<V> {
    sides = ensureDim(sides, this.dim, 1.0);
    if (sides.some(s => s <= 0))
      throw new TypeError('Aspect ratio sides must all be positive');
    const { size, center } = this;
    const k = map(zip(size, sides), ([s, a]) => s / a);
    const max_k = Math.max(...k);
    const matched = Array.from(map(sides, a => (a * max_k) / 2));
    const box = new BBox(center.sub(matched), center.add(matched));
    box.__center__ = center;
    return box;
  }

  /**
   * #### Expand the bounding box by given delta in all directions.
   * Negative delta shrinks the box.
   */
  expand(delta: Broadcastable): BBox<V> {
    return new BBox(this.A.sub(delta), this.B.add(delta));
  }
  /**
   * #### Shrink the bounding box by given delta in all directions.
   * Negative delta expands the box.
   */
  shrink(delta: Broadcastable): BBox<V> {
    return new BBox(this.A.add(delta), this.B.sub(delta));
  }
  /**
   * #### Translate the bounding box by given offset vector or scalar.
   * Translation does not affect the size of the box.
   */
  translate(offset: Broadcastable): BBox<V> {
    return new BBox(this.A.add(offset), this.B.add(offset));
  }
  /**
   * #### Get the intersection of this bounding box with another bounding box.
   * Returns null if the boxes do not intersect.
   * If inclusive, overlap regions can have zero area (i.e. touching edges).
   */
  intersect(other: BBox<V>, inclusive = true): BBox<V> | null {
    const A = Vec.max(this.A, other instanceof BBox ? other.A : other);
    const B = Vec.min(this.B, other instanceof BBox ? other.B : other);
    const overlap = inclusive
      ? every(zip(A, B), ([a, b]) => a <= b) // Inclusive overlap check
      : every(zip(A, B), ([a, b]) => a < b); // Exclusive overlap check
    return overlap ? new BBox(A, B) : null;
  }
  /**
   * #### Check if this bounding box intersects with a point.
   */
  encloses(other: V): Enclosure {
    for (const [a, b, v] of zip(this.A, this.B, ensureDim(other, this.dim))) {
      if (a === v || b === v) return Enclosure.Boundary;
      if (v < a || v > b) return Enclosure.Outside;
    }
    return Enclosure.Inside;
  }
  /**
   * #### Merge multiple bounding boxes into the smallest bounding box that contains them all.
   */
  static merge<V extends Vec, R = never>(
    boxes: Iterable<BBox<V>>,
    fallback?: () => R,
  ): BBox<V> | R {
    const corners: V[] = [];
    for (const box of boxes) corners.push(box.A, box.B);
    const [v, ...rest] = corners;
    if (!v) {
      if (fallback) return fallback();
      else throw new TypeError('No boxes provided');
    }
    return new BBox(v, ...rest);
  }
}
