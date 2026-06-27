/* ---------------------------------------------------------
 * Copyright (c) 2025-present Yuxuan Zhang, zyx@z-yx.cc
 * This source code is licensed under the MIT license.
 * You may find the full license in project root directory.
 * ------------------------------------------------------ */

import { expect, test } from 'vitest';
import Contour from './contour';
import { Line2D } from '../segment/line';
import { Vec2 } from '../vec';
import { Enclosure } from '../types';

test('Contour: constructs from points and emits joined path string', () => {
  const contour = new Contour([
    new Vec2([0, 0]),
    new Vec2([1, 0]),
    new Vec2([1, 0]),
    new Vec2([1, 1]),
    new Vec2([0, 1]),
  ]);
  expect(contour.length).toBe(4);
  expect(contour.at(0).A.eq([0, 0])).toBe(true);
  expect(contour.at(0).B.eq([1, 0])).toBe(true);
  expect(contour.d()).toBe('M 0,0 L 1,0 L 1,1 L 0,1 Z');
});

test('Contour: recreates incoming segment start to preserve continuity', () => {
  const source = new Line2D(new Vec2([1, 0]), new Vec2([2, 1]));
  const contour = new Contour([new Vec2([0, 0]), new Vec2([1, 0]), source]);

  expect(contour.length).toBe(3);
  expect(contour.at(1).A.eq([1, 0])).toBe(true);
  expect(contour.at(1).B.eq([2, 1])).toBe(true);
  expect(contour.at(1)).not.toBe(source);
});

test('Contour: encloses works for a closed contour from explicit segments', () => {
  const square = new Contour([
    new Line2D(new Vec2([0, 0]), new Vec2([2, 0])),
    new Line2D(new Vec2([2, 0]), new Vec2([2, 2])),
    new Line2D(new Vec2([2, 2]), new Vec2([0, 2])),
    new Line2D(new Vec2([0, 2]), new Vec2([0, 0])),
  ]);

  for (const pt of square.corners) {
    expect(square.encloses(pt)).toBe(Enclosure.Boundary);
  }

  expect(square.encloses(new Vec2([1, 1]))).toBe(Enclosure.Inside);
  expect(square.encloses(new Vec2([0, 1]))).toBe(Enclosure.Boundary);
  expect(square.encloses(new Vec2([3, 1]))).toBe(Enclosure.Outside);
});

test('Contour: reversed contour also reverses segments and preserves enclosure', () => {
  const pts = [
    new Vec2([0, 0]),
    new Vec2([2, 0]),
    new Vec2([2, 2]),
    new Vec2([0, 2]),
    new Vec2([0, 0]),
  ];
  const square = new Contour(pts);

  const r1 = square.reversed;
  const r2 = new Contour(pts.toReversed());
  expect(r1.d()).toEqual(r2.d());
});

test('Contour: strict mode rejects disconnected segments and open loops', () => {
  const s1 = new Line2D(new Vec2([0, 0]), new Vec2([1, 0]));
  const s2 = new Line2D(new Vec2([2, 0]), new Vec2([2, 1]));
  expect(() => new Contour([s1, s2], 0, true)).toThrow(
    /Segments must be connected in strict mode/,
  );

  expect(
    () =>
      new Contour(
        [
          new Line2D(new Vec2([0, 0]), new Vec2([1, 0])),
          new Line2D(new Vec2([1, 0]), new Vec2([1, 1])),
        ],
        0,
        true,
      ),
  ).toThrow(/Loop must be closed in strict mode/);
});

test('Contour: non-strict mode auto-bridges disconnected input and closes loop', () => {
  const s1 = new Line2D(new Vec2([0, 0]), new Vec2([1, 0]));
  const s2 = new Line2D(new Vec2([2, 0]), new Vec2([2, 1]));
  const contour = new Contour([s1, s2], 0, false);

  expect(contour.length).toBe(4);
  expect(contour.at(1)).toBeInstanceOf(Line2D);
  expect(contour.at(1).A.eq([1, 0])).toBe(true);
  expect(contour.at(1).B.eq([2, 0])).toBe(true);
  expect(contour.at(3).A.eq([2, 1])).toBe(true);
  expect(contour.at(3).B.eq([0, 0])).toBe(true);
});

test('Contour: sort and intersections are cached', () => {
  const contour = new Contour([
    new Vec2([0, 0]),
    new Vec2([2, 0]),
    new Vec2([2, 2]),
    new Vec2([0, 2]),
  ]);

  const asc1 = contour.sort('ascending');
  const asc2 = contour.sort('ascending');
  const desc1 = contour.sort('descending');
  const desc2 = contour.sort('descending');
  expect(asc1).toBe(asc2);
  expect(desc1).toBe(desc2);
  expect(Object.isFrozen(asc1)).toBe(true);
  expect(Object.isFrozen(desc1)).toBe(true);

  const i1 = contour.intersections;
  const i2 = contour.intersections;
  expect(i1).toBe(i2);
});
