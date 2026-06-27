/* ---------------------------------------------------------
 * Copyright (c) 2025-present Yuxuan Zhang, zyx@z-yx.cc
 * This source code is licensed under the MIT license.
 * You may find the full license in project root directory.
 * ------------------------------------------------------ */

import { SegmentLike, VecOf } from '../types';
import Config from '../util/config';
import BaseError from '../util/error';
import { filter, IterableItem } from '../util/iter';
import { pop } from '../util/set';
import Vec, { Vec2 } from '../vec';

export default class Topology {
  // Segments are organized conforming geometric continuity
  static readonly CHAIN: unique symbol = Symbol('CHAIN');
  /**
   * #### Mark an iterable to conform to chain topology.
   */
  static chain<I extends Iterable<T>, T = IterableItem<I>>(
    iterable: I,
  ): I & Chain<T> {
    return Object.assign(iterable, { [Topology.CHAIN]: true as const });
  }
  static isChain<T>(item: T): item is T & Chain<any> {
    try {
      return (item as any)[Topology.CHAIN] === true;
    } catch {
      return false;
    }
  }
}

export type Chain<T> = Iterable<T> & {
  readonly [Topology.CHAIN]: true;
};

class LoopClosureError extends BaseError {}
/**
 * #### Chain segments together according to their topological order.
 *
 * The `pick` function is used to select the next segment at multi-branch
 * junctions where multiple candidates are available. It receives the current
 * heading direction and the candidate segments, and should return the chosen
 * segment or null to stop chaining.
 *
 * When `exhaust` is true, this function will throw an error if there are
 * remaining segments that cannot be chained together, which indicates an
 * issue with the `pick` function or the input segments.
 * When `exhaust` is false, this function will simply stop chaining when it
 * closes the shortest loop (i.e. returns to the starting point).
 */
export function* chain<S extends SegmentLike<V>, V extends Vec = VecOf<S>>(
  segments: Set<S>,
  pick: DirectionPicker<S, V>,
  exhaust = false,
  eps = Config.eps,
): Generator<S> {
  let s = pop(segments);
  const start = s.A;
  yield s;
  const yielded = [s];
  while (segments.size > 0) {
    const heading = s.tangentAt(1);
    const candidates = filter(segments, (e) => s.B.eq(e.A, eps));
    const next = pick(heading, candidates);
    if (!next) break;
    segments.delete(next);
    yield (s = next);
    yielded.push(s);
    if (!exhaust && start.eq(s.B, eps)) break;
  }
  // Exhaust check
  if (exhaust && segments.size > 0)
    throw new LoopClosureError('Chain did not exhaust all segments.').data({
      method: pick.name || 'unknown',
      exhaust,
      eps,
      start,
      yielded,
      remainder: [...segments],
    });
  // Loop closure check
  if (!start.eq(s.B, eps))
    throw new LoopClosureError('Chain did not close properly.').data({
      method: pick.name || 'unknown',
      exhaust,
      eps,
      start,
      end: s.B,
      yielded,
      remainder: [...segments],
    });
}

export type DirectionPicker<
  S extends SegmentLike<V>,
  V extends Vec = VecOf<S>,
> = (direction: V, segments: Iterable<S>) => S | null;

/** Direction picker (2D only) */
export const Direction = {
  /** #### Prefer right turn */
  CW<S extends SegmentLike<Vec2>>(direction: Vec2, segments: Iterable<S>) {
    let best: S | null = null;
    let best_ang!: number;
    for (const segment of segments) {
      const ang = direction.angle(segment.tangentAt(0));
      if (best === null || ang < best_ang) {
        best_ang = ang;
        best = segment;
      }
    }
    return best;
  },
  /** #### Prefer left turn */
  CCW<S extends SegmentLike<Vec2>>(direction: Vec2, segments: Iterable<S>) {
    let best: S | null = null;
    let best_ang!: number;
    for (const segment of segments) {
      const ang = direction.angle(segment.tangentAt(0));
      if (best === null || ang > best_ang) {
        best_ang = ang;
        best = segment;
      }
    }
    return best;
  },
};
