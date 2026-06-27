/* ---------------------------------------------------------
 * Copyright (c) 2025-present Yuxuan Zhang, zyx@z-yx.cc
 * This source code is licensed under the MIT license.
 * You may find the full license in project root directory.
 * ------------------------------------------------------ */
import { Line2D } from '../segment/line';
import { SegmentLike } from '../types';
import Config from '../util/config';
import { Pool } from '../util/pool';
import { Vec2 } from '../vec';

/**
 * Ensure start of next segment strict equals end of current segment.
 * Insert Line2D segments when necessary, remove duplicate points.
 */
export default function* normalizeContourArgs<S extends SegmentLike<Vec2>>(
  args: Iterable<Vec2 | S>,
  eps = Config.eps,
  strict = false,
  pool: (v: Vec2) => Vec2 = Pool<Vec2>({ sort: (a, b) => a.compare(b, eps) }),
): Generator<S | Line2D> {
  let init: Vec2 | null = null;
  let prev: Vec2 | null = null;
  let prevIsPoint = false;
  for (const arg of args) {
    if (arg instanceof Vec2) {
      const v = pool(arg);
      init ??= v;
      if (prev) {
        if (v === prev) continue;
        else yield new Line2D(prev, v);
      }
      prev = v;
      prevIsPoint = true;
    } else {
      const seg = arg.pool(pool);
      init ??= seg.A;
      if (prev) {
        if (prev !== seg.A) {
          if (!strict) yield new Line2D(prev, seg.A);
          else
            throw new Error(
              [
                'Segments must be connected in strict mode',
                ` - prev: ${prev}`,
                ` - next: ${seg.A}`,
              ].join('\n'),
            );
        }
      }
      yield seg;
      prev = seg.B;
      prevIsPoint = false;
    }
  }
  // Close the loop if necessary
  if (prev && init && prev !== init) {
    if (prevIsPoint) {
      // Auto close when generating coutours from points
      yield new Line2D(prev, init, undefined, 'Z');
    } else if (!strict) {
      yield new Line2D(prev, init, undefined, true);
    } else
      throw new Error(
        [
          'Loop must be closed in strict mode',
          ` - last : ${prev}`,
          ` - first: ${init}`,
        ].join('\n'),
      );
  }
}
