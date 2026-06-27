/* ---------------------------------------------------------
 * Copyright (c) 2025-present Yuxuan Zhang, zyx@z-yx.cc
 * This source code is licensed under the MIT license.
 * You may find the full license in project root directory.
 * ------------------------------------------------------ */

import { expect, test } from 'vitest';
import Registry from './registry';

test('Registry: initializes provided keys and lazily creates missing entries', () => {
  const calls: string[] = [];
  const registry = new Registry<string, number>(
    (key) => {
      calls.push(key);
      return key.length;
    },
    ['a', 'bb'],
  );

  expect(registry.get('a')).toBe(1);
  expect(registry.get('bb')).toBe(2);
  expect(registry.get('ccc')).toBe(3);
  expect(registry.get('ccc')).toBe(3);

  expect(calls).toEqual(['a', 'bb', 'ccc']);
  expect(registry.size).toBe(3);
});
