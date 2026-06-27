/* ---------------------------------------------------------
 * Copyright (c) 2025-present Yuxuan Zhang, zyx@z-yx.cc
 * This source code is licensed under the MIT license.
 * You may find the full license in project root directory.
 * ------------------------------------------------------ */

import { expect, test } from 'vitest';
import { clampPeriodic } from './math';

test('clampPeriodic: keeps values in range and wraps above/below bounds', () => {
  expect(clampPeriodic(5, 0, 10)).toBe(5);
  expect(clampPeriodic(10, 0, 10)).toBe(0);
  expect(clampPeriodic(21, 0, 10)).toBe(1);
  expect(clampPeriodic(-1, 0, 10)).toBe(9);
  expect(clampPeriodic(-25, -2, 3)).toBe(0);
});

test('clampPeriodic: validates range', () => {
  expect(() => clampPeriodic(0, 1, 1)).toThrow(/max must be greater than min/);
  expect(() => clampPeriodic(0, 2, 1)).toThrow(/max must be greater than min/);
});
