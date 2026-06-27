/* ---------------------------------------------------------
 * Copyright (c) 2025-present Yuxuan Zhang, zyx@z-yx.cc
 * This source code is licensed under the MIT license.
 * You may find the full license in project root directory.
 * ------------------------------------------------------ */

import { expect, test } from 'vitest';
import { id } from './id';

test('id: returns stable id for same object and unique ids for different objects', () => {
  const a = { x: 1 };
  const b = { x: 1 };

  const idA1 = id(a);
  const idA2 = id(a);
  const idB = id(b);

  expect(idA1).toBe(idA2);
  expect(idA1).not.toBe(idB);
  expect(Number.isInteger(idA1)).toBe(true);
  expect(Number.isInteger(idB)).toBe(true);
});

test('id: rejects non-object values', () => {
  expect(() => id(null as unknown as object)).toThrow(
    /Only non-null objects can be identified/,
  );
  expect(() => id(1 as unknown as object)).toThrow(
    /Only non-null objects can be identified/,
  );
});
