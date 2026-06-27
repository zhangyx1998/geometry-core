/* ---------------------------------------------------------
 * Copyright (c) 2025-present Yuxuan Zhang, zyx@z-yx.cc
 * This source code is licensed under the MIT license.
 * You may find the full license in project root directory.
 * ------------------------------------------------------ */

import { expect, test } from 'vitest';
import Segment from './segment';
import { Line2D } from './line';
import { Vec2 } from '../vec';
import Intersection from './intersection';
import Topology, { chain, Direction } from './topology';

function line(a: [number, number], b: [number, number]) {
  return new Line2D(new Vec2(a), new Vec2(b));
}

test('Segment.sort: supports ascending and descending', () => {
  const a = line([2, 0], [3, 0]);
  const b = line([0, 0], [1, 0]);
  const c = line([1, 0], [2, 0]);

  const asc = Segment.sort([a, b, c], 'ascending');
  const desc = Segment.sort([a, b, c], 'descending');

  expect([...asc]).toEqual([b, c, a]);
  expect([...desc]).toEqual([a, c, b]);
});

test('Intersection.Graph: returns per-segment sorted intersection params', () => {
  const h = line([0, 1], [4, 1]);
  const v1 = line([1, 0], [1, 2]);
  const v2 = line([3, 0], [3, 2]);

  const result = new Intersection.Graph(
    Intersection.candidates([h, v1, v2]),
  );
  const hs = result.edge2points.get(h);
  const v1s = result.edge2points.get(v1);
  const v2s = result.edge2points.get(v2);

  expect(hs).toHaveLength(2);
  expect(hs[0]!.t).toBeCloseTo(0.25);
  expect(hs[1]!.t).toBeCloseTo(0.75);
  expect(hs.every((x) => x.w)).toBe(true);

  expect(v1s).toHaveLength(1);
  expect(v1s[0]!.v.eq([1, 1])).toBe(true);
  expect(v2s).toHaveLength(1);
  expect(v2s[0]!.v.eq([3, 1])).toBe(true);
});

test('Intersection.Graph.split: splits by provided intersections and supports discard mode', () => {
  const edge = line([0, 0], [4, 0]);
  const intersections = new Intersection.Graph<Line2D>();
  intersections.edge2points.get(edge).push(
    { t: 0.25, v: new Vec2([1, 0]), w: false },
    { t: 0.75, v: new Vec2([3, 0]), w: false },
  );
  const edges = Topology.chain([edge]);

  const split = [...intersections.split(edges, false)];
  const kept = [...intersections.split(edges, 'discard')];

  expect(split).toHaveLength(3);
  expect(split[0]!.A.eq([0, 0])).toBe(true);
  expect(split[0]!.B.eq([1, 0])).toBe(true);
  expect(split[1]!.A.eq([1, 0])).toBe(true);
  expect(split[1]!.B.eq([3, 0])).toBe(true);
  expect(split[2]!.A.eq([3, 0])).toBe(true);
  expect(split[2]!.B.eq([4, 0])).toBe(true);

  expect(kept).toHaveLength(3);
});

test('Direction.CCW/preferRightTurn: pick expected branch from heading', () => {
  const direction = new Vec2([1, 0]);
  const up = line([0, 0], [0, 1]);
  const down = line([0, 0], [0, -1]);

  expect(Direction.CCW(direction, [up, down])).toBe(up);
  expect(Direction.CW(direction, [up, down])).toBe(down);
});

test('Segment.chain: chains connected edges and exhaust mode validates completeness', () => {
  const e1 = line([0, 0], [1, 0]);
  const e2 = line([1, 0], [1, 1]);
  const e3 = line([1, 1], [0, 1]);
  const e4 = line([0, 1], [0, 0]);

  const set = new Set([e1, e2, e3, e4]);
  const result = [...chain(set, Direction.CCW, true, 0)];

  expect(result).toHaveLength(4);
  expect(set.size).toBe(0);

  const disjoint = new Set([line([0, 0], [1, 0]), line([2, 0], [3, 0])]);
  expect(() => [...chain(disjoint, Direction.CCW, true, 0)]).toThrow(
    /Chain did not exhaust all segments/,
  );
});
