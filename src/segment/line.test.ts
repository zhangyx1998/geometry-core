/* ---------------------------------------------------------
 * Copyright (c) 2025-present Yuxuan Zhang, zyx@z-yx.cc
 * This source code is licensed under the MIT license.
 * You may find the full license in project root directory.
 * ------------------------------------------------------ */

import { expect, test } from 'vitest';
import Line, { Line2D } from './line';
import { Vec2, Vec3 } from '../vec';

test('Line: core properties and geometry methods', () => {
  const a = new Vec2([1, 2]);
  const b = new Vec3([4, 6, 9]);
  const line = new Line(a, b, undefined);

  expect(line.A.eq([1, 2])).toBe(true);
  expect(line.B.eq([4, 6])).toBe(true);
  expect(line.delta.eq([3, 4])).toBe(true);
  expect(line.dim).toBe(2);
  expect(line.len).toBeCloseTo(5);
  expect(line.d()).toBe('L 4,6');
  expect(line.d(0, true)).toBe('M 1,2 L 4,6');

  expect(line.pointAt(0).eq(line.A)).toBe(true);
  expect(line.pointAt(1).eq(line.B)).toBe(true);
  expect(line.pointAt(0.5).eq([2.5, 4])).toBe(true);
  expect(line.tangentAt(0.3).eq([0.6, 0.8])).toBe(true);

  const { A, B } = line.bbox;
  expect(A.eq([1, 2])).toBe(true);
  expect(B.eq([4, 6])).toBe(true);
});

test('Line: recreate, reversed dual caching and flatten', () => {
  const base = new Line(new Vec2([0, 0]), new Vec2([2, 0]), undefined);

  const recreated = base.recreate(
    new Vec2([2, 0]),
    new Vec2([2, 2]),
    undefined,
  );
  expect(recreated.A.eq([2, 0])).toBe(true);
  expect(recreated.B.eq([2, 2])).toBe(true);

  const reversed = base.reversed;
  expect(reversed.A.eq(base.B)).toBe(true);
  expect(reversed.B.eq(base.A)).toBe(true);
  expect(reversed.reversed).toBe(base);

  const flat = base.flatten(1e-3);
  expect(flat).toHaveLength(1);
  expect(flat[0]).toBe(base);
  expect(base.eq(new Line(new Vec2([0, 0]), new Vec2([2, 0]), undefined))).toBe(
    true,
  );
});

test('Line: generic segment intersection is not implemented', () => {
  const line = new Line(
    new Vec3([0, 0, 0]),
    new Vec3([1, 0, 0]),
    undefined,
  );
  expect(() => line.intersection(line)).toThrow(/TODO/);
});

test('Line2D: determinant, relation and vertical-line intersections', () => {
  const horizontal = new Line2D(new Vec2([0, 0]), new Vec2([2, 0]));

  expect(horizontal.det(new Vec2([1, 1]))).toBeGreaterThan(0);
  expect(horizontal.det(new Vec2([1, -1]))).toBeLessThan(0);
  expect(horizontal.relation(new Vec2([1, 1]))).toBe(1);
  expect(horizontal.relation(new Vec2([1, -1]))).toBe(-1);
  expect(horizontal.relation(new Vec2([1, 0]))).toBe(0);

  const cross = horizontal.xIntersection(1);
  expect(cross.type).toBe('cross');
  expect(cross.points[0]!.t).toBeCloseTo(0.5);
  expect(cross.points[0]!.v.eq([1, 0])).toBe(true);
  expect(horizontal.xIntersection(3).type).toBe('none');

  const vertical = new Line2D(new Vec2([1, -1]), new Vec2([1, 1]));
  expect(vertical.xIntersection(0).type).toBe('none');
  const overlap = vertical.xIntersection(1);
  expect(overlap.type).toBe('overlap');
  expect(overlap.points).toHaveLength(2);
  expect(overlap.points[0]!.t).toBe(0);
  expect(overlap.points[0]!.v.eq([1, -1])).toBe(true);
  expect(overlap.points[1]!.t).toBe(1);
  expect(overlap.points[1]!.v.eq([1, 1])).toBe(true);
});

test('Line2D: segment intersection - flip invariant', () => {
  const a = new Line2D(new Vec2([0, 0]), new Vec2([2, 2]));
  const b = new Line2D(new Vec2([1, 0]), new Vec2([1, 2]));
  const v = new Vec2([1, 1]);
  for (const A of [a, a.reversed]) {
    for (const B of [b, b.reversed]) {
      const ab = A.intersection(B);
      expect(ab.type).toBe('cross');
      expect(ab.points[0]!.t).toBeCloseTo(0.5);
      expect(ab.points[0]!.t_other).toBeCloseTo(0.5);
      expect(ab.points[0]!.v.eq(v)).toBe(true);
      const ba = B.intersection(A);
      expect(ba.type).toBe('cross');
      expect(ba.points[0]!.t).toBeCloseTo(0.5);
      expect(ba.points[0]!.t_other).toBeCloseTo(0.5);
      expect(ba.points[0]!.v.eq(v)).toBe(true);
    }
  }
});

test('Line2D: segment intersection', () => {
  const a = new Line2D(new Vec2([0, 0]), new Vec2([2, 2]));
  const b = new Line2D(new Vec2([0, 2]), new Vec2([2, 0]));
  const c = new Line2D(new Vec2([0, 1]), new Vec2([2, 1]));
  const d = new Line2D(new Vec2([0, 0]), new Vec2([2, 0]));
  const e = new Line2D(new Vec2([0, 0]), new Vec2([0, 2]));
  const f = new Line2D(new Vec2([0, 1]), new Vec2([0, 4]));

  const ab = a.intersection(b);
  expect(ab.type).toBe('cross');
  expect(ab.segment).toBe(a);
  expect(ab.counterpart).toBe(b);
  expect(ab.points[0]!.t).toBeCloseTo(0.5);
  expect(ab.points[0]!.v.eq([1, 1])).toBe(true);
  expect(ab.other.segment).toBe(b);
  expect(ab.other.points[0]!.t).toBeCloseTo(0.5);

  const ac = a.intersection(c);
  expect(ac.type).toBe('cross');
  expect(ac.points[0]!.t).toBeCloseTo(0.5);
  expect(ac.points[0]!.v.eq([1, 1])).toBe(true);
  expect(ac.other.segment).toBe(c);
  expect(ac.other.points[0]!.t).toBeCloseTo(0.5);
  expect(d.intersection(c).type).toBe('none');

  const ef = e.intersection(f);
  expect(ef.type).toEqual('overlap');
  expect(ef.points[0]!.t).toBeCloseTo(0.5);
  expect(ef.points[0]!.v.eq([0, 1])).toBe(true);
  expect(ef.points[1]!.t).toBeCloseTo(1);
  expect(ef.points[1]!.v.eq([0, 2])).toBe(true);
  expect(ef.other.points[0]!.t).toBeCloseTo(0);
  expect(ef.other.points[0]!.v.eq([0, 1])).toBe(true);
  expect(ef.other.points[1]!.t).toBeCloseTo(1 / 3);
  expect(ef.other.points[1]!.v.eq([0, 2])).toBe(true);
  const g = new Line2D(new Vec2([0, 0]), new Vec2([0, 2]));
  const h = new Line2D(new Vec2([0, 2]), new Vec2([0, 4]));
  const gh = g.intersection(h);
  expect(gh.type).toEqual('tangent');
  expect(gh.points[0]!.t).toBeCloseTo(1);
  expect(gh.points[0]!.v.eq([0, 2])).toBe(true);
  expect(gh.other.points[0]!.t).toBeCloseTo(0);
  expect(gh.other.points[0]!.v.eq([0, 2])).toBe(true);
});
