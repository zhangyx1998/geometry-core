/* ---------------------------------------------------------
 * Copyright (c) 2025-present Yuxuan Zhang, zyx@z-yx.cc
 * This source code is licensed under the MIT license.
 * You may find the full license in project root directory.
 * ------------------------------------------------------ */

import { expect, test } from 'vitest';
import Loop from './loop';

test('Loop: wraps indices, validates input, and supports slicing', () => {
  const loop = new Loop([10, 20, 30]);

  expect(loop.length).toBe(3);
  expect(loop.at(0)).toBe(10);
  expect(loop.at(4)).toBe(20);
  expect(loop.at(-1)).toBe(30);

  expect([...loop.slice(1, 3)]).toEqual([20, 30, 10]);
  expect([...loop.slice(1, -3)]).toEqual([20, 10, 30]);

  expect(() => loop.at(1.2)).toThrow(/Index must be an integer/);
  expect(() => [...loop.slice(0, 0)]).toThrow(/Count must not be 0/);
  expect(() => new Loop<number>([]).at(0)).toThrow(/Loop cannot be empty/);
});

test('Loop: rotate, reversed caching, map/filter, and search', () => {
  const loop = new Loop([1, 2, 3, 4]);

  expect([...loop.loopRotate(1)]).toEqual([2, 3, 4, 1]);
  expect([...loop.loopRotate(1, true)]).toEqual([2, 1, 4, 3]);

  const reversed = loop.reversed;
  expect([...reversed]).toEqual([4, 3, 2, 1]);
  expect(reversed.reversed).toBe(loop);

  expect([...loop.map((value) => value * 2)]).toEqual([2, 4, 6, 8]);
  expect([...loop.filter((value) => value % 2 === 0)]).toEqual([2, 4]);

  const maxCtx = loop.search(
    (ctx) => ctx.value,
    (a, b) => a > b,
  );
  expect(maxCtx.value).toBe(4);
  expect(maxCtx.prev.value).toBe(3);
  expect(maxCtx.next.value).toBe(1);
});
