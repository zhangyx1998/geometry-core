/* ---------------------------------------------------------
 * Copyright (c) 2025-present Yuxuan Zhang, zyx@z-yx.cc
 * This source code is licensed under the MIT license.
 * You may find the full license in project root directory.
 * ------------------------------------------------------ */
import Intersection from './intersection';
import { SegmentLike } from '../types';
import { map, pairwise, zip } from '../util/iter';
import { clamp } from '../util/math';
import Vec, { BBox, Vec2 } from '../vec';
import Segment, { Segment2D } from './segment';
import applyMixins from '../util/mixin';
import Config from '../util/config';

// Immutable Line
export default class Line<V extends Vec = Vec> extends Segment<
  V,
  void,
  Line<V>
> {
  constructor(a: V, b: Vec, params: void, pseudo: 'Z' | boolean = false) {
    super(a, b, params);
    (this as any).pseudo = pseudo;
    if (this.A.eq(this.B, 0))
      throw new Error('Endpoints of line segment cannot overlap');
  }
  recreate(a: V, b: Vec, params: void): this {
    return new (this.constructor as any)(a, b, params, this.pseudo) as this;
  }
  d(digits = 0, M = false) {
    let d = [];
    if (M) d.push('M', this.A.d(digits));
    d.push('L', this.B.d(digits));
    return d.join(' ');
  }
  get len() {
    return this.delta.len;
  }
  pointAt(t: number): V {
    if (t === 0) return this.A;
    if (t === 1) return this.B;
    return this.A.add(this.delta.mul(t));
  }
  tAt(t: V): number {
    const { A, delta, len } = this;
    if (len === 0) return 0;
    const d = t.sub(A);
    return delta.unit.dot(d) / len;
  }
  tangentAt(_: number) {
    return this.delta.unit;
  }
  splitAt(...s: (number | V)[]): this[] {
    if (s.length === 0) return [this];
    const verts = [
      this.A,
      ...s.map((v) => (v instanceof Vec ? v : this.pointAt(v))),
      this.B,
    ];
    return Array.from(
      map(pairwise(verts), ([a, b]) => this.recreate(a, b, undefined)),
    );
  }
  get bbox(): BBox<V> {
    return new BBox(this.A, this.B);
  }
  protected getReversed() {
    return this.recreate(this.B, this.A, this.params);
  }
  // Line specific methods
  eq(other: Line<V>, eps = 0): boolean {
    return this.A.eq(other.A, eps) && this.B.eq(other.B, eps);
  }
  flatten(_: number): this[] {
    return [this];
  }
  intersection<S extends SegmentLike<V>>(other: S): Intersection<this, S, V> {
    throw new Error('TODO');
  }
  xIntersection(x: number): Intersection<this, null, V> {
    const { A, B, delta } = this;
    const dx0 = delta.at(0);
    const dx1 = x - A.at(0);
    if (dx0 === 0) {
      if (dx1 === 0) {
        // Vertical overlap
        const overlap = [
          { v: A, t: 0 },
          { v: B, t: 1 },
        ];
        return Intersection.Overlap(this, null, ...overlap);
      } else {
        return Intersection.None(this, null);
      }
    } else {
      const t = dx1 / dx0;
      if (t < 0 || t > 1) return Intersection.None(this, null);
      const v = this.pointAt(t);
      return Intersection.Cross(this, null, t, v);
    }
  }
}

class Line2D extends Line<Vec2> {
  recreate(a: Vec2, b: Vec, params: void): this {
    return new Line2D(a, b, params, this.pseudo) as this;
  }
  /**
   * Returns the determinant from AB to AC
   * Only works for 2D Vertices
   * @param {Vec2|Line} C
   * @returns {Number} Negative if C is on right side of AB, positive if left
   * (B.x − A.x) × (C.y − A.y) − (B.y − A.y) × (C.x − A.x)
   */
  det(V: Vec2 | Line<Vec2>) {
    const { A, B } = this;
    const C = V instanceof Line ? V.delta.like(A) : V.like(A);
    const AB = B.sub(A);
    const AC = C.sub(A);
    return AB.cross(AC);
  }
  /**
   * `+1`: Point is above line
   *  `0`: Point is on line
   * `-1`: Point is below line
   */
  relation(pt: Vec): 1 | 0 | -1 {
    const C = pt instanceof Vec2 ? pt : pt.like(Vec2);
    // Special case: vectical line - left is above, right is below
    if (this.A.x === this.B.x) {
      if (C.x === this.A.x) return 0;
      return C.x < this.A.x ? 1 : -1;
    }
    // General case: use determinant sign
    const det = this.det(C);
    return det > 0 ? 1 : det < 0 ? -1 : 0;
  }
  // 2D specific methods
  splitX(x: number): { l?: Line2D; r?: Line2D } {
    const line = this.forward;
    if (this.A.x >= x) return { r: line };
    if (this.B.x <= x) return { l: line };
    const t = (x - line.A.x) / line.delta.x;
    const mid = line.pointAt(t);
    return {
      l: line.recreate(line.A, mid),
      r: line.recreate(mid, line.B),
    };
  }
  splitY(y: number): { t?: Line2D; b?: Line2D } {
    const line = this.forward;
    if (this.A.y >= y) return { t: line };
    if (this.B.y <= y) return { b: line };
    const t = (y - line.A.y) / line.delta.y;
    const mid = line.pointAt(t);
    return {
      t: line.recreate(line.A, mid),
      b: line.recreate(mid, line.B),
    };
  }
  intersection<S extends SegmentLike<Vec2>>(
    that: S,
  ): Intersection<this, S, Vec2> {
    if (!(that instanceof Line2D)) return super.intersection(that);
    const eps = Config.eps;
    const p = this.A;
    const r = this.delta;
    const q = that.A;
    const s = that.delta;
    const qmp = q.sub(p);
    const rxs = r.cross(s);
    const qmpxr = qmp.cross(r);
    if (Math.abs(rxs) > eps) {
      const t = qmp.cross(s) / rxs;
      const t_other = qmp.cross(r) / rxs;
      if (t < 0 || t >= 1 || t_other < 0 || t_other >= 1)
        return Intersection.None(this, that);
      const v = this.pointAt(t);
      return new Intersection('cross', this, that, { t, v, t_other });
    }
    if (Math.abs(qmpxr) > eps) return Intersection.None(this, that);
    const rr = r.dot(r);
    if (rr <= eps) return Intersection.None(this, that); // Degenerate line
    const t = [qmp.dot(r) / rr, qmp.add(s).dot(r) / rr]
      .sort()
      .map((t) => clamp(t, 0, 1));
    const [t0, t1] = t;
    if (Math.abs(t0 - t1) <= eps) {
      const t = t0;
      const v = this.pointAt(t0);
      return new Intersection('tangent', this, that, { t, v });
    }
    const v = t.map((t) => this.pointAt(t));
    const P = map(zip(t, v), ([t, v]) => ({ t, v }));
    return new Intersection('overlap', this, that, ...P);
  }
  // Area computation
  static integrateEvenOdd(x0: number, x1: number, active: Set<Line2D>) {
    const dx = x1 - x0;
    if (dx === 0) return 0;
    const pool: Line2D[] = [];
    const prev = [...active];
    active.clear();
    for (const line of prev) {
      active.delete(line);
      const { l, r } = line.splitX(x1);
      if (l) pool.push(l);
      if (r) active.add(r);
    }
    let k = 1;
    let area = 0;
    for (const line of Segment.sort(pool, 'ascending')) {
      area += k * (line.A.y + line.B.y) * dx * 0.5;
      k = -k;
    }
    return area;
  }
}

applyMixins(Line2D, [Segment2D]);

interface Line2D extends Segment2D<void> {
  getReversed(): this;
  flatten(_: number): this[];
}

export { Line2D };
