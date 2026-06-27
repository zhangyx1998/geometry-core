/* ---------------------------------------------------------
 * Copyright (c) 2025-present Yuxuan Zhang, zyx@z-yx.cc
 * This source code is licensed under the MIT license.
 * You may find the full license in project root directory.
 * ------------------------------------------------------ */

import { expect, test } from 'vitest';
import Polygon, { SimplePolygon } from './polygon';
import { Line2D } from '../segment/line';
import { Vec2 } from '../vec';

test('Polygon: area is winding-independent', () => {
  const rect = new Polygon([
    new Line2D(new Vec2([0, 0]), new Vec2([0, 1])),
    new Line2D(new Vec2([0, 1]), new Vec2([1, 1])),
    new Line2D(new Vec2([1, 1]), new Vec2([1, 0])),
    new Line2D(new Vec2([1, 0]), new Vec2([0, 0])),
  ]);
  expect(rect.area).toBeCloseTo(1);
  expect(rect.reversed.area).toBeCloseTo(1);
});

test('Polygon: area handles self-intersecting contours by odd-even fill', () => {
  const bow = new Polygon([
    new Vec2([0, 0]),
    new Vec2([2, 1]),
    new Vec2([2, 0]),
    new Vec2([0, 1]),
  ]);
  expect(bow.area).toBeCloseTo(1);
  expect(bow.reversed.area).toBeCloseTo(1);
});

test('Polygon: intersections are cached for self-intersecting contours', () => {
  const bow = new Polygon([
    new Vec2([0, 0]),
    new Vec2([2, 2]),
    new Vec2([2, 0]),
    new Vec2([0, 2]),
  ]);

  const i1 = bow.intersections;
  const i2 = bow.intersections;

  expect(i1).toBe(i2);
  expect(i1.count).toBeGreaterThan(0);
  expect(bow.outer).toBeInstanceOf(SimplePolygon);
  expect(bow.area).toBeCloseTo(
    [bow.outer, ...bow.inner].reduce((sum, p) => sum + p.area, 0),
  );
});

test('Polygon: outer/inner loops for simple polygon', () => {
  const square = new Polygon([
    new Vec2([0, 0]),
    new Vec2([2, 0]),
    new Vec2([2, 2]),
    new Vec2([0, 2]),
  ]);
  expect(square.outer).toBeInstanceOf(SimplePolygon);
  expect(square.outer.area).toBeCloseTo(square.area);
  expect(square.inner).toHaveLength(0);
});

test('Polygon: outer is cached for simple polygon', () => {
  const square = new Polygon([
    new Vec2([0, 0]),
    new Vec2([2, 0]),
    new Vec2([2, 2]),
    new Vec2([0, 2]),
  ]);

  const outer1 = square.outer;
  const outer2 = square.outer;
  expect(outer1).toBe(outer2);
  expect(outer1).toBeInstanceOf(SimplePolygon);
  expect(outer1.area).toBeCloseTo(square.area);
});

test('Polygon: outer/inner loops are derived from self-intersections', () => {
  const bow = new Polygon([
    new Vec2([0, 0]),
    new Vec2([2, 2]),
    new Vec2([0, 2]),
    new Vec2([2, 0]),
  ]);

  expect(bow.intersections.count).toBeGreaterThan(0);
  expect(bow.outer).toBeInstanceOf(SimplePolygon);
  expect(bow.outer.area).toBeGreaterThan(0);
  expect(bow.inner.every((p) => p instanceof SimplePolygon)).toBe(true);
});

test('Polygon: area for star sums decomposed simple loops', () => {
  const delta = (2 * (2 * Math.PI)) / 5;
  const [a, b, c, d, e] = Array.from({ length: 5 }, (_, i) => {
    const angle = i * delta;
    return new Vec2([Math.cos(angle), Math.sin(angle)]);
  });
  const star = new Polygon([a, b, c, d, e]);
  expect(star.outer).toBeInstanceOf(SimplePolygon);
  expect(star.inner.every((p) => p instanceof SimplePolygon)).toBe(true);
  expect(star.area).toBeCloseTo(
    [star.outer, ...star.inner].reduce((sum, p) => sum + p.area, 0),
  );
});

test('SimplePolygon: offset with miter joints on convex corners', () => {
  const square = new SimplePolygon([
    new Vec2([0, 0]),
    new Vec2([0, 2]),
    new Vec2([2, 2]),
    new Vec2([2, 0]),
    new Vec2([0, 0]),
  ]);
  const out = square.offset(1, 'miter');
  expect(out).toHaveLength(1);
  expect(out[0].area).toBeCloseTo(16);
  const corners = [...out[0].corners];
  expect(corners.some((v) => v.eq([-1, -1], 1e-6))).toBe(true);
  expect(corners.some((v) => v.eq([3, -1], 1e-6))).toBe(true);
  expect(corners.some((v) => v.eq([3, 3], 1e-6))).toBe(true);
  expect(corners.some((v) => v.eq([-1, 3], 1e-6))).toBe(true);
});

test('SimplePolygon: offset returns nothing when inward collapsed', () => {
  const square = new SimplePolygon([
    new Vec2([0, 0]),
    new Vec2([0, 2]),
    new Vec2([2, 2]),
    new Vec2([2, 0]),
    new Vec2([0, 0]),
  ]);
  expect(square.offset(-1)).toEqual([]);
});

test('SimplePolygon: offset supports square and bevel joint modes', () => {
  const square = new SimplePolygon([
    new Vec2([0, 0]),
    new Vec2([0, 2]),
    new Vec2([2, 2]),
    new Vec2([2, 0]),
    new Vec2([0, 0]),
  ]);
  const area0 = square.area;

  const squareJoint = square.offset(1, 'square');
  const bevelJoint = square.offset(1, 'bevel');

  expect(squareJoint.length).toBeGreaterThanOrEqual(1);
  expect(bevelJoint.length).toBeGreaterThanOrEqual(1);
  expect(squareJoint.every((p) => p.area > area0)).toBe(true);
  expect(bevelJoint.every((p) => p.area > area0)).toBe(true);
});

test('SimplePolygon: offset validates finite delta', () => {
  const square = new SimplePolygon([
    new Vec2([0, 0]),
    new Vec2([0, 2]),
    new Vec2([2, 2]),
    new Vec2([2, 0]),
    new Vec2([0, 0]),
  ]);
  expect(() => square.offset(Number.NaN)).toThrow(
    /delta must be a finite number/,
  );
});

test('Polygon.fromCells: builds one contour per disconnected region', () => {
  const single = Polygon.fromCells([[1]]);
  expect(single).toHaveLength(1);
  expect(single[0]!.area).toBeCloseTo(1);

  const disjoint = Polygon.fromCells([
    [1, 0, 1],
    [0, 0, 0],
    [0, 1, 0],
  ]);
  expect(disjoint).toHaveLength(3);
  const total = disjoint.reduce((sum, p) => sum + p.area, 0);
  expect(total).toBeCloseTo(3);
});
