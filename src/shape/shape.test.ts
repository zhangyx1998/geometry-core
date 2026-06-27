/* ---------------------------------------------------------
 * Copyright (c) 2025-present Yuxuan Zhang, zyx@z-yx.cc
 * This source code is licensed under the MIT license.
 * You may find the full license in project root directory.
 * ------------------------------------------------------ */

import { expect, test } from 'vitest';
import { Vec2 } from '../vec';
import Shape, { SimpleShape } from './shape';
import { SimplePolygon } from '../contour/polygon';
import { Enclosure } from '../types';

function box(x0: number, y0: number, x1: number, y1: number) {
  return new SimplePolygon([
    new Vec2([x0, y0]),
    new Vec2([x0, y1]),
    new Vec2([x1, y1]),
    new Vec2([x1, y0]),
  ]);
}

test('SimpleShape: computes area with holes and enclosure', () => {
  const outer = box(0, 0, 10, 10);
  const hole = box(2, 2, 8, 8);
  const shape = new SimpleShape(outer, [hole]);

  expect(shape.area).toBeCloseTo(64);
  expect(shape.encloses(new Vec2([1, 1]))).toBe(Enclosure.Inside);
  expect(shape.encloses(new Vec2([5, 5]))).toBe(Enclosure.Outside);
});

test('Shape: classifies simple polygons into outer + holes by nesting depth', () => {
  const outer = box(0, 0, 10, 10);
  const hole = box(2, 2, 8, 8);
  const island = box(3, 3, 4, 4);
  const disjoint = box(20, 20, 22, 22);

  const shape = Shape.fromSimplePolygons([outer, hole, island, disjoint]);

  expect(shape).toHaveLength(3);
  const byArea = [...shape].sort((a, b) => b.outer.area - a.outer.area);
  expect(byArea[0]!.holes).toHaveLength(1);
  expect(byArea[0]!.area).toBeCloseTo(64);
  expect(byArea[1]!.holes).toHaveLength(0);
  expect(byArea[1]!.area).toBeCloseTo(4);
  expect(byArea[2]!.holes).toHaveLength(0);
  expect(byArea[2]!.area).toBeCloseTo(1);
  expect(shape.area).toBeCloseTo(69);
});

test('Shape boolean ops: union/intersection/subtraction/xor on overlapping boxes', () => {
  const a = new Shape([new SimpleShape(box(0, 0, 4, 4))]);
  const b = new Shape([new SimpleShape(box(2, 0, 6, 4))]);

  const union = a.union(b);
  const intersection = a.intersection(b);
  const subtraction = a.subtraction(b);
  const xor = a.xor(b);

  expect(union.area).toBeCloseTo(24);
  expect(intersection.area).toBeCloseTo(8);
  expect(subtraction.area).toBeCloseTo(8);
  expect(xor.area).toBeCloseTo(16);
});

test('Circle union (self-intersection)', () => {
  const angles = new Array(60).fill(0).map((_, i) => (i / 60) * 2 * Math.PI);
  const circle = new SimplePolygon(
    angles.map((a) => new Vec2([Math.cos(a), Math.sin(a)])),
  );
  const shape = new Shape([circle]);
  const union = shape.union(shape);
  expect(union.area).toBeCloseTo(shape.area);
});
