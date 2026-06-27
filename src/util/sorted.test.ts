/* ---------------------------------------------------------
 * Copyright (c) 2025-present Yuxuan Zhang, zyx@z-yx.cc
 * This source code is licensed under the MIT license.
 * You may find the full license in project root directory.
 * ------------------------------------------------------ */

import { expect, test } from 'vitest';
import Sorted from './sorted';

test('Sorted: inserts items in ascending order with default predicate', () => {
  const sorted = new Sorted<number>();
  [5, 1, 3, 3, 2].forEach((x) => sorted.insert(x));

  expect([...sorted]).toEqual([1, 2, 3, 3, 5]);
});

test('Sorted: supports custom predicate', () => {
  const sorted = new Sorted<number>((a, b) => b - a);
  [5, 1, 3, 2].forEach((x) => sorted.insert(x));

  expect([...sorted]).toEqual([5, 3, 2, 1]);
});

test('Sorted: array methods return plain Array via species', () => {
  const sorted = new Sorted<number>();
  [3, 1, 2].forEach((x) => sorted.insert(x));

  const mapped = sorted.map((x) => x * 2);

  expect(mapped).toEqual([2, 4, 6]);
  expect(mapped).toBeInstanceOf(Array);
  expect(mapped).not.toBeInstanceOf(Sorted);
});

test('Sorted: search returns existing item and does not call fallback', () => {
  const sorted = new Sorted<number>();
  [4, 1, 3, 2].forEach((x) => sorted.insert(x));

  let called = 0;
  const found = sorted.search(3, () => {
    called += 1;
    return -1;
  });

  expect(found).toBe(3);
  expect(called).toBe(0);
});

test('Sorted: search calls fallback when item is missing', () => {
  const sorted = new Sorted<number>();
  [1, 2, 4].forEach((x) => sorted.insert(x));

  let called = 0;
  const missed = sorted.search(3, () => {
    called += 1;
    return 'fallback';
  });

  expect(missed).toBe('fallback');
  expect(called).toBe(1);
});

test('Sorted.Unique: insert skips duplicates', () => {
  const unique = new Sorted.Unique<number>();
  [5, 1, 3, 3, 2, 2, 1].forEach((x) => unique.insert(x));

  expect([...unique]).toEqual([1, 2, 3, 5]);
});

test('Sorted.Unique: add returns canonical existing item', () => {
  const unique = new Sorted.Unique<{ id: number; name: string }>(
    (a, b) => a.id - b.id,
  );

  const a = { id: 1, name: 'alpha' };
  const b = { id: 1, name: 'beta' };
  const c = { id: 2, name: 'gamma' };

  const first = unique.add(a);
  const duplicate = unique.add(b);
  const second = unique.add(c);

  expect(first).toBe(a);
  expect(duplicate).toBe(a);
  expect(second).toBe(c);
  expect(unique.length).toBe(2);
  expect(unique.map((x) => x.id)).toEqual([1, 2]);
});
