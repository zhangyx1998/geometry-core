/* ---------------------------------------------------------
 * Copyright (c) 2025-present Yuxuan Zhang, zyx@z-yx.cc
 * This source code is licensed under the MIT license.
 * You may find the full license in project root directory.
 * ------------------------------------------------------ */

import { expect, test } from 'vitest';
import { pop } from './set';

test('pop: removes and returns one item, throws on empty set', () => {
  const s = new Set([5, 7]);
  const first = pop(s);
  expect(first === 5 || first === 7).toBe(true);
  expect(s.size).toBe(1);
  pop(s);
  expect(() => pop(s)).toThrow(/Set is empty/);
});
