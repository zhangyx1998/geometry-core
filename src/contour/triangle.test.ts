/* ---------------------------------------------------------
 * Copyright (c) 2025-present Yuxuan Zhang, zyx@z-yx.cc
 * This source code is licensed under the MIT license.
 * You may find the full license in project root directory.
 * ------------------------------------------------------ */

import { expect, test } from 'vitest';
import Triangle from './triangle';
import { Line2D } from '../segment/line';
import { Vec2 } from '../vec';
import { Enclosure } from '../types';

test('Triangle: centroid, norm, enclosure and arity guard', () => {
  const tri = new Triangle([
    new Line2D(new Vec2([0, 0]), new Vec2([0, 2])),
    new Line2D(new Vec2([0, 2]), new Vec2([2, 0])),
    new Line2D(new Vec2([2, 0]), new Vec2([0, 0])),
  ]);

  expect(tri.centroid.eq([2 / 3, 2 / 3])).toBe(true);
  expect(tri.norm.z).toBeCloseTo(2);
  expect(tri.encloses(new Vec2([0.5, 0.5]))).toBe(Enclosure.Inside);
  expect(tri.encloses(new Vec2([1, 1]))).toBe(Enclosure.Boundary);
  expect(tri.encloses(new Vec2([1.5, 1.6]))).toBe(Enclosure.Outside);

  expect(
    () =>
      new Triangle([
        new Line2D(new Vec2([0, 0]), new Vec2([1, 0])),
        new Line2D(new Vec2([1, 0]), new Vec2([1, 1])),
        new Line2D(new Vec2([1, 1]), new Vec2([0, 1])),
        new Line2D(new Vec2([0, 1]), new Vec2([0, 0])),
      ]),
  ).toThrow(/Triangle must have exactly 3 points/);
});
