/* ---------------------------------------------------------
 * Copyright (c) 2025-present Yuxuan Zhang, zyx@z-yx.cc
 * This source code is licensed under the MIT license.
 * You may find the full license in project root directory.
 * ------------------------------------------------------ */

import { Geometry, Transformable, Transformable2D } from '../types';
import { every } from '../util/iter';
import Vec, { BBox, Normalized, Vec2 } from '../vec';
import { Line2D } from './line';
import { DEV } from '../util/debug';

export default class Ray<V extends Vec>
  implements Geometry<V>, Transformable<V>
{
  // Geometry Contract
  get bbox() {
    return new BBox(this.A, this.B);
  }
  get corners() {
    return [this.A]; // B is infinite, skip.
  }
  get edges() {
    return []; // Ray has no edges.
  }
  d(digits?: number, length = 1) {
    const dir = length === 1 ? this.delta : this.delta.mul(length);
    return ['M', this.A.d(digits), 'l', dir.d(digits)].join(' ');
  }
  // Transformable Contract
  translate(offset: V) {
    return this.recreate(this.origin.add(offset), this.delta);
  }
  scale(factor: number, center?: V) {
    return this.recreate(this.origin.scale(factor, center), this.delta);
  }
  // Ray Implementation
  recreate(origin: V, delta: Normalized<V>): this {
    return new (this.constructor as any)(origin, delta);
  }
  get A() {
    return this.origin;
  }
  get B() {
    const v = Array.from(this.delta).map((x) => {
      if (x === 0) return 0;
      return x > 0 ? Number.POSITIVE_INFINITY : Number.NEGATIVE_INFINITY;
    });
    return this.origin.add(new Vec(v));
  }
  pointAt(t: number): V {
    if (t === 0) return this.A;
    return this.origin.add(this.delta.mul(t));
  }
  constructor(
    public readonly origin: V,
    public readonly delta: Normalized<V>,
  ) {}
}

export class Ray2D extends Ray<Vec2> implements Transformable2D {
  // Geometry Contract
  d(digits?: number, length = 1, arrowSize = 0, arrowAngleDegrees = 30) {
    if (DEV) console.debug({ length, arrowSize, arrowAngleDegrees });
    const dir = length === 1 ? this.delta : this.delta.mul(length);
    const d = ['M', this.A.d(digits), 'l', dir.d(digits)];
    if (arrowSize > 0) {
      const a = this.delta.mul(-arrowSize);
      const radians = arrowAngleDegrees * (Math.PI / 180);
      const a1 = a.rotate(+radians);
      const a2 = a.rotate(-radians);
      const B = this.pointAt(length);
      d.push('M', B.d(digits), 'l', a1.d(digits));
      d.push('M', B.d(digits), 'l', a2.d(digits));
    }
    return d.join(' ');
  }
  // Transformable2D Contract
  rotate(radians: number, center?: Vec2) {
    return this.recreate(
      this.origin.rotate(radians, center),
      this.delta.rotate(radians, center),
    );
  }
  reflect(axis?: Vec2, center?: Vec2) {
    return this.recreate(
      this.origin.reflect(axis, center),
      this.delta.reflect(axis, center),
    );
  }
  // Intersection test
  intersection<S extends Ray2D | Line2D>(other: S): RayIntersection2D | null {
    // Chcek if other.A is on the ray
    const t = other.A.sub(this.A).div(this.delta);
    // All equal => return A directly
    if (every(t, (x) => x === t.at(0)))
      return { ray: this, point: this.A, t: t.at(0) };
    // Check for parallelism
    const a = this.delta;
    const b = other.delta;
    const cross = a.cross(b);
    if (cross === 0) return null; // Parallel
    // Calculate intersection point
    const aa = other.A.sub(this.A);
    const t1 = aa.cross(b) / cross;
    const t2 = aa.cross(a) / cross;
    if (
      t1 < 0 ||
      t2 < 0 ||
      // Segment endpoint does not count
      (other instanceof Line2D && t2 >= 1)
    )
      return null; // Not intersecting
    return { ray: this, point: this.pointAt(t1), t: t1 };
  }
}

export interface RayIntersection2D {
  readonly ray: Ray2D;
  readonly point: Vec2;
  readonly t: number;
}
