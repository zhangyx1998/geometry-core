/* ---------------------------------------------------------
 * Copyright (c) 2025-present Yuxuan Zhang, zyx@z-yx.cc
 * This source code is licensed under the MIT license.
 * You may find the full license in project root directory.
 * ------------------------------------------------------ */

import { expect, test } from 'vitest';
import Vec, { Vec2, Vec3 } from './vec';

test('Vec: construction, accessors and iteration', () => {
  const v = new Vec([1, 2, 3]);
  expect(v.dim).toBe(3);
  expect(v.at(0)).toBe(1);
  expect(v.at(10, 99)).toBe(99);
  expect([...v]).toEqual([1, 2, 3]);
  expect(v.len).toBeCloseTo(Math.sqrt(14));
});

test('Vec: normalization and zero-length guard', () => {
  const v = new Vec([3, 4]).unit;
  expect(v.len).toBeCloseTo(1);
  expect(v.at(0)).toBeCloseTo(0.6);
  expect(v.at(1)).toBeCloseTo(0.8);

  expect(() => new Vec([0, 0]).unit).toThrow(
    /Cannot normalize zero-dim vector/,
  );
});

test('Vec: as, like, origin and type behavior', () => {
  const v = new Vec([1, 2, 3]);

  const likeVec3FromCtor = v.like(Vec3);
  expect(likeVec3FromCtor).toBeInstanceOf(Vec3);
  expect([...likeVec3FromCtor]).toEqual([1, 2, 3]);

  const template = new Vec3([9, 8, 7]);
  const likeTemplate = v.like(template);
  expect(likeTemplate).toBeInstanceOf(Vec3);
  expect([...likeTemplate]).toEqual([1, 2, 3]);

  const origin = v.origin;
  expect(origin).toBeInstanceOf(Vec);
  expect(origin.dim).toBe(0);
  expect([...origin]).toEqual([]);

  expect([...new Vec2([9, 8]).origin]).toEqual([0, 0]);
  expect([...new Vec3([9, 8, 7]).origin]).toEqual([0, 0, 0]);
});

test('Vec: arithmetic, dot, eq and scalar NaN validation', () => {
  const a = new Vec([1, 2, 3]);
  const b = new Vec([4, 5, 6]);

  expect([...a.add(b)]).toEqual([5, 7, 9]);
  expect([...a.sub(b)]).toEqual([-3, -3, -3]);
  expect([...a.mul(b)]).toEqual([4, 10, 18]);
  expect([...a.div(2)]).toEqual([0.5, 1, 1.5]);
  expect([...a.add(10)]).toEqual([11, 12, 13]);

  expect(a.dot(b)).toBe(32);
  expect(a.eq(new Vec([1 + 1e-7, 2 - 1e-7, 3]), 1e-6)).toBe(true);
  expect(a.eq(new Vec([1.01, 2, 3]), 1e-6)).toBe(false);

  expect(() => a.add(Number.NaN)).toThrow(/Invalid number provided/);
});

test('Vec: angle computes unsigned angle and rejects zero vectors', () => {
  const x = new Vec([1, 0]);
  const y = new Vec([0, 1]);
  expect(x.angle(y)).toBeCloseTo(Math.PI / 2);
  expect(x.angle(new Vec([-1, 0]))).toBeCloseTo(Math.PI);

  expect(() => x.angle(new Vec([0, 0]))).toThrow(
    /Cannot compute angle with zero-length vector/,
  );
});

test('Vec2: fixed dimension, accessors and vec3 conversion', () => {
  const v = new Vec2([7]);
  expect(v).toBeInstanceOf(Vec2);
  expect(v.dim).toBe(2);
  expect(v.x).toBe(7);
  expect(v.y).toBe(0);

  const v3 = v.vec3;
  expect(v3).toBeInstanceOf(Vec3);
  expect([...v3]).toEqual([7, 0, 0]);
});

test('Vec2: cross product and signed angle', () => {
  const x = new Vec2([1, 0]);
  const y = new Vec2([0, 1]);
  const negY = new Vec2([0, -1]);

  expect(x.cross(y)).toBe(1);
  expect(y.cross(x)).toBe(-1);

  expect(x.angle(y)).toBeCloseTo(Math.PI * 0.5);
  expect(x.angle(y.add(x))).toBeCloseTo(Math.PI * 0.25);
  expect(x.angle(y.sub(x))).toBeCloseTo(Math.PI * 0.75);
  expect(x.angle(negY)).toBeCloseTo(-Math.PI * 0.5);
  expect(x.angle(negY.add(x))).toBeCloseTo(-Math.PI * 0.25);
  expect(x.angle(negY.sub(x))).toBeCloseTo(-Math.PI * 0.75);
});

test('Vec3: fixed dimension, accessors and cross product', () => {
  const v = new Vec3([1, 2]);
  expect(v).toBeInstanceOf(Vec3);
  expect(v.dim).toBe(3);
  expect(v.x).toBe(1);
  expect(v.y).toBe(2);
  expect(v.z).toBe(0);

  const x = new Vec3([1, 0, 0]);
  const y = new Vec3([0, 1, 0]);
  expect([...x.cross(y)]).toEqual([0, 0, 1]);
});

test('Vec3: angle with and without normal', () => {
  const x = new Vec3([1, 0, 0]);
  const y = new Vec3([0, 1, 0]);

  expect(x.angle(y)).toBeCloseTo(Math.PI / 2);
  expect(x.angle(y, new Vec3([0, 0, 1]))).toBeCloseTo(Math.PI / 2);
  expect(x.angle(y, new Vec3([0, 0, -1]))).toBeCloseTo((3 * Math.PI) / 2);
});
