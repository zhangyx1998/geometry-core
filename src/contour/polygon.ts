/* ---------------------------------------------------------
 * Copyright (c) 2025-present Yuxuan Zhang, zyx@z-yx.cc
 * This source code is licensed under the MIT license.
 * You may find the full license in project root directory.
 * ------------------------------------------------------ */

import Contour from './contour';
import { Line2D } from '../segment/line';
import Vec, { Vec2 } from '../vec';
import { filter, map, pairwise } from '../util/iter';
import { Pool } from '../util/pool';
import Topology, { chain, Direction } from '../segment/topology';
import Intersection from '../segment/intersection';
import Config from '../util/config';
import { DEV } from '../util/debug';

/**
 * ### A `Polygon` is a closed contour comprised of line segments.
 * + It may have self-intersections and holes
 * + Its area is defined by the odd-even fill rule.
 */
export default class Polygon extends Contour<Line2D> {
  static signedArea(edges: Iterable<Line2D>): number {
    let area = 0;
    for (const { A, B } of edges) {
      const dx = B.x - A.x;
      area += dx * (B.y + A.y);
    }
    return area / 2;
  }
  /**
   * #### Area enclosed by odd-even fill rule.
   * This definition matches `encloses` and is stable for self-intersections.
   */
  get area(): number {
    if (this.__area__ === undefined) {
      if (this.__outer_inner_loops__ === undefined)
        this.__outer_inner_loops__ = Object.freeze(this.getOuterInnerLoops());
      this.__area__ = this.__outer_inner_loops__.reduce(
        (sum, loop) => sum + loop.area,
        0,
      );
    }
    return this.__area__;
  }
  /**
   * #### Outer loop of a complex polygon.
   * i.e. the simple polygon with the largest area.
   */
  get outer(): SimplePolygon {
    if (this.__outer_inner_loops__ === undefined)
      this.__outer_inner_loops__ = Object.freeze(this.getOuterInnerLoops());
    return this.__outer_inner_loops__[0]!;
  }
  /**
   * #### Inner holes of a complex polygon, may be empty.
   * i.e. simple polygons that are enclosed by the outer loop, representing holes.
   */
  get inner(): SimplePolygon[] {
    if (this.__outer_inner_loops__ === undefined)
      this.__outer_inner_loops__ = Object.freeze(this.getOuterInnerLoops());
    return this.__outer_inner_loops__.slice(1);
  }
  protected __outer_inner_loops__?: readonly SimplePolygon[];

  private getOuterInnerLoops() {
    const { intersections } = this;
    if (intersections.count === 0) {
      const area = Polygon.signedArea(this);
      const loop = area >= 0 ? this : this.reversed;
      const outer = new SimplePolygon(loop);
      (outer as any).__area__ = Math.abs(area);
      return [outer];
    } else {
      const segments = intersections.split(this, true);
      const set = ensurePositiveArea(segments);
      const loops: SimplePolygon[] = [];
      while (set.size > 0)
        loops.push(
          new SimplePolygon(chain(set, Direction.CCW, false, this.eps)),
        );
      return loops.sort((a, b) => b.area - a.area);
    }
  }
  /**
   * Get the closed contour path for a given marker
   */
  static fromCells(cells: Cells): SimplePolygon[] {
    const set = cellEdges(cells);
    // Connect remaining edges to form a single path
    const contours: SimplePolygon[] = [];
    while (set.size)
      contours.push(new SimplePolygon(chain(set, Direction.CW, false, 0)));
    return contours;
  }
}

// Unit cell conversion utility
type Cells = (true | false | 0 | 1)[][];
function hasCell(cells: Cells, x: number, y: number) {
  return Boolean(cells?.[y]?.[x]);
}
function cellEdges(cells: Cells) {
  const ids = cells
    .map((row, y) =>
      row
        .map((v, x) => (v ? [x, y] : null))
        .filter((v): v is [number, number] => v !== null),
    )
    .flat();
  const edges = new Set<Line2D>();
  for (const [x, y] of ids) {
    const A = new Vec2([x, y]);
    const B = new Vec2([x, y + 1]);
    const C = new Vec2([x + 1, y + 1]);
    const D = new Vec2([x + 1, y]);
    // Clockwise square edges
    if (!hasCell(cells, x - 1, y)) edges.add(new Line2D(A, B));
    if (!hasCell(cells, x, y + 1)) edges.add(new Line2D(B, C));
    if (!hasCell(cells, x + 1, y)) edges.add(new Line2D(C, D));
    if (!hasCell(cells, x, y - 1)) edges.add(new Line2D(D, A));
  }
  return edges;
}

export type OffsetType = 'miter' | 'square' | 'bevel';
type CornerOffsetContext = {
  readonly l1: Line2D;
  readonly l2: Line2D;
  /** #### Normalized direction of the first edge. */
  readonly d1: Vec2;
  /** #### Normalized direction of the second edge. */
  readonly d2: Vec2;
  /** #### Offset vector for the first edge  with length `d`*/
  readonly o1: Vec2;
  /** #### Offset vector for the second edge with length `d` */
  readonly o2: Vec2;
  /** #### Middle offset of o1 and o2 with length `d` */
  readonly om: Vec2;
  /** #### Miter ratio */
  readonly mr: number;
  /** #### The corner point */
  readonly p: Vec2;
  /** #### Absolute offset distance (positive) */
  readonly d: number;
  /**
   * #### Angle of o1 -> om == om -> o2 within [-pi/2, pi/2]
   */
  readonly r: number;
  /**
   * Corner type indicator:
   * - `0`: Parallel edges
   * - `-1`: External corner
   * - `+1`: Internal corner
   */
  readonly s: -1 | 0 | 1;
};

type CornerOffsetContextMaybeVanishing = CornerOffsetContext & {
  /** If true, at least one side of connected edges is vanishing */
  vanishing: boolean;
};

/**
 * ### A `SimplePolygon` is a non-self-intersecting closed contour.
 * + It has no holes.
 * + It may have positive or negative area, depending on the vertex order.
 */
export class SimplePolygon extends Polygon {
  // Loop Contract
  protected override recreate(
    data: Iterable<Line2D>,
    eps = 0,
    strict = true,
    pooler?: (v: Vec2) => Vec2,
  ) {
    return super.recreate(data, eps, strict, pooler);
  }
  protected postReverse(reversed: this): void {
    super.postReverse(reversed);
    if (this.__area__ !== undefined) reversed.__area__ = -this.__area__;
  }
  // Transformable Fix - preserve area sign under negative scaling
  override scale(factor: number, center?: Vec2) {
    return factor >= 0
      ? super.scale(factor, center)
      : super.scale(-factor, center).reversed;
  }
  // SimplePolygon Implementation
  constructor(items: Iterable<Vec2 | Line2D>, eps = Config.eps, strict = true) {
    super(items, eps, strict);
    this.__outer_inner_loops__ = Object.freeze([this]);
  }
  get area() {
    if (this.__area__ === undefined) this.__area__ = Polygon.signedArea(this);
    return this.__area__;
  }
  get sign() {
    const { area } = this;
    if (area > this.eps) return 1;
    if (area < -this.eps) return -1;
    return 0;
  }
  /** Get the positive version of the polygon */
  get positive() {
    return this.sign >= 0 ? this : this.reversed;
  }
  /** Get the negative version of the polygon */
  get negative() {
    return this.sign <= 0 ? this : this.reversed;
  }
  /** Offset a SimplePolygon by given amount and type */
  offset(delta: number, type: OffsetType, param?: number): SimplePolygon[];
  /** Preserves number of corners, produces sharp corners. */
  offset(delta: number, type?: 'miter', miterLimit?: number): SimplePolygon[];
  /** Produces equal offset corners, may add extra corners. */
  offset(delta: number, type: 'square'): SimplePolygon[];
  /** Produces beveled corners closer to originals, may add extra corners. */
  offset(delta: number, type: 'bevel'): SimplePolygon[];
  offset(
    delta: number,
    type: OffsetType = 'miter',
    param?: number,
  ): SimplePolygon[] {
    if (!Number.isFinite(delta))
      throw new TypeError(
        `delta must be a finite number, got ${delta} (${typeof delta})`,
      );
    try {
      if (delta === 0) return [this];
      if (this.length < 3) return [];
      const { sign } = this;
      // Advance corners by delta along the angle bisector
      const ctxs = this.checkForVanishingLine(
        this.iterateCornersForOffset(delta),
      );
      const excludes = new Set<Vec2>();
      const corners = Array.from(
        this.selectOffsetMethod(ctxs, type, param, excludes),
      );
      // Assemble into simplified polygons
      const edges = Topology.chain(
        Array.from(
          map(
            filter(pairwise(corners, true), ([a, b]) => a !== b),
            ([a, b]) => new Line2D(a, b),
          ),
        ),
      );
      if (edges.length === 0) return [];
      const candidates = Intersection.candidates(edges);
      const intersections = new Intersection.Graph(candidates);
      const segments = new Set(intersections.split(edges, 'discard'));
      // Remove vanishing segments
      for (const seg of segments)
        if (excludes.has(seg.A) || excludes.has(seg.B)) segments.delete(seg);
      const out: SimplePolygon[] = [];
      while (segments.size > 0) {
        const region = new SimplePolygon(
          chain(segments, sign < 0 ? Direction.CCW : Direction.CW, false, 0),
        );
        if (region.sign === sign) out.push(region);
      }
      return out;
    } catch (e) {
      if (DEV) console.warn(e);
      return [];
    }
  }
  protected *selectOffsetMethod(
    ctxs: Iterable<CornerOffsetContextMaybeVanishing>,
    type: OffsetType,
    param: number | undefined,
    excludes: Set<Vec2>,
  ): Generator<Vec2> {
    const pool = Pool<Vec2>({ sort: (a, b) => a.compare(b, this.eps) });
    switch (type) {
      case 'miter':
        for (const ctx of ctxs) {
          for (const v of map(this.offsetCornersMiter(ctx, param), pool)) {
            yield v;
            if (ctx.vanishing) excludes.add(v);
          }
        }
        break;
      case 'square':
        for (const ctx of ctxs) {
          for (const v of map(this.offsetCornersSquare(ctx), pool)) {
            yield v;
            if (ctx.vanishing) excludes.add(v);
          }
        }
        break;
      case 'bevel':
        for (const ctx of ctxs) {
          for (const v of map(this.offsetCornersBevel(ctx), pool)) {
            yield v;
            if (ctx.vanishing) excludes.add(v);
          }
        }
        break;
      default:
        throw new Error(`Unknown offset type: ${type}`);
    }
  }
  protected *iterateCornersForOffset(
    delta: number,
  ): Generator<CornerOffsetContext> {
    const R = Math.PI / 2;
    const d = delta;
    for (const [l1, l2] of pairwise(this, true)) {
      const p = l1.B;
      const d1 = l1.delta.unit;
      const d2 = l2.delta.unit;
      const o1 = d1.rotate(R).mul(d);
      const o2 = d2.rotate(R).mul(d);
      const r = o1.angle(o2) / 2;
      const s = Math.sign(r * delta) as -1 | 0 | 1;
      const om = o1.rotate(r);
      const mr = 1 / Math.cos(r);
      const ctx = { l1, l2, d1, d2, o1, o2, om, mr, p, d, r, s };
      yield ctx;
    }
  }
  protected *checkForVanishingLine(
    corners: Iterable<CornerOffsetContext>,
  ): Generator<CornerOffsetContextMaybeVanishing> {
    let firstIsVanishing: boolean | null = null;
    let lastIsVanishing: boolean | null = null;
    let c0: CornerOffsetContext | null = null;
    let c1: CornerOffsetContext | null = null;
    for ([c0, c1] of pairwise(corners, true)) {
      const l = c0.l2;
      const u = l.delta.unit;
      const d = c0.om.dot(u) * c0.mr - c1.om.dot(u) * c1.mr;
      const isVanishing = d >= l.len;
      firstIsVanishing ??= isVanishing;
      if (lastIsVanishing !== null)
        yield { ...c0, vanishing: isVanishing || lastIsVanishing };
      lastIsVanishing = isVanishing;
    }
    if (firstIsVanishing === null || lastIsVanishing === null || c1 === null)
      throw new Error('No enough corners to check for vanishing lines');
    yield { ...c1, vanishing: firstIsVanishing || lastIsVanishing };
  }
  protected *offsetCornersMiter(
    ctx: CornerOffsetContextMaybeVanishing,
    miterLimit?: number,
  ): Generator<Vec2> {
    const { p, om, mr, r, vanishing } = ctx;
    // Straight or parallel edges, or zero offset, just return the middle offset
    if (r === 0) return yield p.add(om);
    if (
      !vanishing &&
      (Math.cos(r) <= this.eps || (miterLimit && r < 0 && mr > miterLimit))
    )
      return yield* this.offsetCornersSquare(ctx);
    // Miter joint
    yield p.add(om.mul(mr));
  }
  protected *offsetCornersSquare(
    ctx: CornerOffsetContextMaybeVanishing,
  ): Generator<Vec2> {
    const { om, o1, d1, o2, d2, p, r, s, vanishing } = ctx;
    if (s === 0) return yield p.add(om);
    // Delegate internal corner to miter
    if ((s > 0 && Math.cos(r) > this.eps) || vanishing)
      return yield* this.offsetCornersMiter(ctx);
    // Solve k_i so (d_i * k_i + o_i) * om == om * om
    // i.e. k_i = (om * om - o_i * om) / (d_i * om)
    const k1 = (om.dot(om) - o1.dot(om)) / d1.dot(om);
    yield Vec.sum(p, o1, d1.mul(k1));
    const k2 = (om.dot(om) - o2.dot(om)) / d2.dot(om);
    yield Vec.sum(p, o2, d2.mul(k2));
  }
  protected *offsetCornersBevel(
    ctx: CornerOffsetContextMaybeVanishing,
  ): Generator<Vec2> {
    const { o1, o2, om, p, s, vanishing } = ctx;
    if (s === 0) return yield p.add(om);
    // Delegate internal corner to miter
    if (s > 0 || vanishing) return yield* this.offsetCornersMiter(ctx);
    yield p.add(o1);
    yield p.add(o2);
  }
}

function ensurePositiveArea(segments: Iterable<Line2D>): Set<Line2D> {
  const arr = Array.from(segments);
  return new Set(
    Polygon.signedArea(arr) >= 0 ? arr : arr.map((s) => s.reversed),
  );
}
