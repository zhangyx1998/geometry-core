/* ---------------------------------------------------------
 * Copyright (c) 2025-present Yuxuan Zhang, zyx@z-yx.cc
 * This source code is licensed under the MIT license.
 * You may find the full license in project root directory.
 * ------------------------------------------------------ */
import { PointOnSegment, SegmentLike, SplitPoint, VecOf } from '../types';
import { LogicError } from '../util/error';
import Registry from '../util/registry';
import Sorted from '../util/sorted';
import Vec from '../vec';
import { DEV } from '../util/debug';
import Order from './order';
import Topology, { Chain } from './topology';

export class Graph<S extends SegmentLike<V>, V extends Vec = VecOf<S>> {
  public readonly edge2points = new Registry<S, SplitPoint<V>[]>(() => []);
  public readonly point2edges = new Registry<V, Set<S>>(() => new Set());
  private record(edge: S, points: SplitPoint<V>[]) {
    this.edge2points.get(edge).push(...points);
    for (const v of new Set(points.map(({ v }) => v)))
      this.point2edges.get(v).add(edge);
  }
  constructor(candidates?: Iterable<[S, Iterable<S>]>, symmetric = true) {
    if (candidates) for (const [s, c] of candidates) this.add(s, c, symmetric);
  }
  /** All unique intersection points recorded in the graph */
  get points() {
    return this.point2edges.keys();
  }
  /** Number of unique intersection points recorded in the graph */
  get count() {
    return this.point2edges.size;
  }
  /**
   * Scan intersection between `segment` and each candidate in `candidates`,
   * add the split points to this graph.
   *
   * If `symmetric` is true, also add the split points to the candidate segments.
   * This is required for correct splitting of segments, but can be disabled for
   * read-only queries like point enclosure test.
   */
  add(segment: S, candidates: Iterable<S>, symmetric = true): this {
    const s0 = segment;
    for (const s1 of candidates) {
      for (const intersection of s0.intersection(s1)) {
        const { type, segment, points } = intersection;
        if (points.length === 0) continue;
        if (segment !== s0 && !symmetric) continue;
        const w = type === 'cross';
        this.record(
          segment as S,
          points.map((p) => ({ ...p, w })),
        );
      }
    }
    return this;
  }
  /**
   * Split larger segments into smaller ones at their intersection points
   * so that the resulting segments only intersect at their endpoints.
   *
   * When `wind` is true, input segments must be arranged in topologically
   * consistent order
   */
  split(segements: Iterable<S>, wind: false): Iterable<S>;
  split(segements: Chain<S>, wind: boolean | 'discard'): Iterable<S>;
  *split(chain: Chain<S>, wind: boolean | 'discard' = true): Iterable<S> {
    if (DEV && wind !== false && !Topology.isChain(chain))
      console.warn(
        'Warning: input segments are not marked as chain. Result may be incorrect.',
      );
    let winding = 0;
    for (const edge of chain) {
      const xs = this.edge2points.get(edge);
      if (xs === undefined || xs.length === 0) {
        const flip = winding % 2 === 1;
        if (wind === 'discard' && flip) continue;
        yield wind === true && flip ? edge.reversed : edge;
        continue;
      }
      let v0: V = edge.A;
      const splits: V[] = [];
      const flips: boolean[] = [];
      for (const { t, v, w } of xs.toSorted((a, b) => a.t - b.t)) {
        if (t < 0 || t > 1) continue;
        if (!v.eq(v0)) {
          flips.push(winding % 2 === 1);
          v0 = v;
          if (t < 1 && !v.eq(edge.B)) splits.push(v);
        }
        if (w) winding++;
      }
      if (flips.length === splits.length) flips.push(winding % 2 === 1);
      const edges = edge.splitAt(...splits);
      if (flips.length !== edges.length) {
        const record = { flips, splits, edges, intersections: xs, edge };
        throw new LogicError('Bad intersection data.').data(record);
      }
      const flip = (e: S, i: number) => (flips[i] ? e.reversed : e);
      if (wind === 'discard') yield* edges.filter((_, i) => !flips[i]);
      else if (wind) yield* edges.map(flip);
      else yield* edges;
    }
  }
}

export type IntersectionType = 'cross' | 'tangent' | 'overlap' | 'none';

type PointOnSegmentWithOptionalHint<V extends Vec> = PointOnSegment<V> & {
  /**
   * #### Optional hint for parameter `t` on the other segment.
   */
  readonly t_other?: any;
};

type Other<
  S1 extends SegmentLike<V>,
  S2 extends SegmentLike<V> | null,
  V extends Vec = VecOf<S1>,
  O = never,
> = S2 extends SegmentLike<V> ? Intersection<Exclude<S2, null>, S1, V> : O;

export default class Intersection<
  S1 extends SegmentLike<V>,
  S2 extends SegmentLike<V> | null, // null for xIntersections
  V extends Vec = VecOf<S1>,
> implements Iterable<Intersection<S1, S2, V> | Other<S1, S2, V>> {
  readonly points: ReadonlyArray<PointOnSegmentWithOptionalHint<V>>;
  *[Symbol.iterator]() {
    yield this;
    if (this.counterpart !== null)
      yield this.other as unknown as Other<S1, S2, V>;
  }
  get length() {
    return this.counterpart === null ? 1 : 2;
  }
  constructor(
    public readonly type: IntersectionType,
    public readonly segment: S1,
    public readonly counterpart: S2,
    ...points: PointOnSegmentWithOptionalHint<V>[]
  ) {
    this.points = Object.freeze(points);
  }
  private __other__?: Intersection<Exclude<S2, null>, S1, V>;
  get other(): Other<S1, S2, V, null> {
    if (this.counterpart === null) return null as Other<S1, S2, V, null>;
    type Self = Intersection<Exclude<S1, null>, Exclude<S2, null>, V>;
    if (!this.__other__) {
      const segment = this.segment;
      const counterpart = this.counterpart as Exclude<S2, null>;
      const points = this.points.map(
        ({ v, t_other: t = counterpart.tAt(v) }) => ({ t, v }),
      );
      const other = new Intersection<Exclude<S2, null>, S1, V>(
        this.type,
        counterpart,
        segment,
        ...points,
      );
      other.__other__ = this as unknown as Self;
      this.__other__ = other;
    }
    return this.__other__! as Other<S1, S2, V, null>;
  }

  static None<
    S1 extends SegmentLike<V>,
    S2 extends SegmentLike<V> | null,
    V extends Vec = VecOf<S1>,
  >(s1: S1, s2: S2): Intersection<S1, S2, V> {
    return new Intersection<S1, S2, V>('none', s1, s2);
  }

  static Cross<
    S1 extends SegmentLike<V>,
    S2 extends SegmentLike<V> | null,
    V extends Vec = VecOf<S1>,
  >(s1: S1, s2: S2, t: number, v: V): Intersection<S1, S2, V> {
    return new Intersection<S1, S2, V>('cross', s1, s2, { t, v });
  }

  static Tangent<
    S1 extends SegmentLike<V>,
    S2 extends SegmentLike<V> | null,
    V extends Vec = VecOf<S1>,
  >(s1: S1, s2: S2, t: number, v: V): Intersection<S1, S2, V> {
    return new Intersection<S1, S2, V>('tangent', s1, s2, { t, v });
  }

  static Overlap<
    S1 extends SegmentLike<V>,
    S2 extends SegmentLike<V> | null, // null for xIntersections
    V extends Vec = VecOf<S1>,
  >(s1: S1, s2: S2, ...overlap: PointOnSegmentWithOptionalHint<V>[]) {
    return new Intersection<S1, S2, V>('overlap', s1, s2, ...overlap);
  }

  /*
   * #### Generate candidate pairs of segments for intersection testing.
   * Segments need to be sorted in **ascending** order for optimal performance.
   * Already sorted data is preferred to avoid unnecessary sorting.
   *
   * When `other` is provided, only generate cross comparison pairs.
   */
  static *candidates<S extends SegmentLike<V>, V extends Vec = VecOf<S>>(
    segments: Iterable<S>,
    other: Iterable<S> | null = null,
  ): Generator<[S, Generator<S>]> {
    // Ensure segments are sorted in ascending order
    const sorted = Order.sort(segments, 'ascending', (a, b) => a.compare(b));
    // Active segments are sorted by ending edge.
    const active = new Sorted<S>((a, b) => a.bbox.B.compare(b.bbox.B));
    // Used if comparing with another set of segements
    const candidates = other
      ? Order.sort(other, 'ascending', (a, b) => a.compare(b))
      : null;
    function* search(s0: S) {
      for (const s1 of active)
        if (s0.bbox.intersect(s1.bbox, true) !== null) yield s1;
    }
    if (candidates === null) {
      // Self-comparison: search within the same set of segments.
      for (const s of sorted) {
        const x = s.bbox.A.at(0);
        while (active.length > 1 && active[0].bbox.B.at(0) < x) {
          const s0 = active.shift()!;
          yield [s0, search(s0)];
        }
        active.insert(s);
      }
      // Flush remaining active segments for self-comparison
      while (active.length > 1) {
        const s0 = active.shift()!;
        yield [s0, search(s0)];
      }
    } else {
      // Cross-comparison: search between two sets of segments.
      for (const s of sorted) {
        const x0 = s.bbox.A.at(0);
        const x1 = s.bbox.B.at(0);
        while (candidates.length > 0 && candidates[0].bbox.B.at(0) < x0)
          candidates.shift()!;
        while (candidates.length > 0 && candidates[0].bbox.A.at(0) <= x1)
          active.insert(candidates.shift()!);
        yield [s, search(s)];
      }
    }
  }

  static readonly Graph = Graph;
}

export type IntersectionGraph<
  S extends SegmentLike<V>,
  V extends Vec = VecOf<S>,
> = Graph<S, V>;
