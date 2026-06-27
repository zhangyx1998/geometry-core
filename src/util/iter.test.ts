/* ---------------------------------------------------------
 * Copyright (c) 2025-present Yuxuan Zhang, zyx@z-yx.cc
 * This source code is licensed under the MIT license.
 * You may find the full license in project root directory.
 * ------------------------------------------------------ */

import { expect, test } from 'vitest';
import { combinations, pairwise, zip } from './iter';

test('zip: yields tuples until shortest iterable ends', () => {
  expect([...zip([1, 2, 3], [10, 20], [100, 200, 300])]).toEqual([
    [1, 10, 100],
    [2, 20, 200],
  ]);
});

test('pairwise: supports optional winding', () => {
  expect([...pairwise([1, 2, 3])]).toEqual([
    [1, 2],
    [2, 3],
  ]);
  expect([...pairwise([1, 2, 3], true)]).toEqual([
    [1, 2],
    [2, 3],
    [3, 1],
  ]);
  expect([...pairwise([])]).toEqual([]);
  expect([...pairwise([], true)]).toEqual([]);
  expect([...pairwise([42])]).toEqual([]);
  expect([...pairwise([42], true)]).toEqual([]);
});

test('pairwise: supports custom window size', () => {
  expect([...pairwise([1, 2, 3, 4], false, 3)]).toEqual([
    [1, 2, 3],
    [2, 3, 4],
  ]);
  expect([...pairwise([1, 2, 3, 4], true, 3)]).toEqual([
    [1, 2, 3],
    [2, 3, 4],
    [3, 4, 1],
    [4, 1, 2],
  ]);
});

test('combinations: returns k-combinations and validates k', () => {
  expect([...combinations([1, 2, 3], 2)]).toEqual([
    [1, 2],
    [1, 3],
    [2, 3],
  ]);
  expect([...combinations([1, 2, 3], 1)]).toEqual([[1], [2], [3]]);
  expect(() => [...combinations([1, 2, 3], 0)]).toThrow(/k must be at least 1/);
});
