/* ---------------------------------------------------------
 * Copyright (c) 2025-present Yuxuan Zhang, zyx@z-yx.cc
 * This source code is licensed under the MIT license.
 * You may find the full license in project root directory.
 * ------------------------------------------------------ */

/**
 * Clamp a number between a minimum and maximum value.
 */
export function clamp(x: number, min: number, max: number): number {
  return Math.min(Math.max(x, min), max);
}

/**
 * @returns x in range [min, max)
 */
export function clampPeriodic(x: number, min: number, max: number): number {
  if (min >= max) throw new TypeError('max must be greater than min');
  const period = max - min;
  if (x < min) x += period * Math.ceil((min - x) / period);
  if (x >= max) x -= period * Math.ceil((x - max + 1) / period);
  return x;
}
