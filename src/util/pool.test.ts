/* ---------------------------------------------------------
 * Copyright (c) 2025-present Yuxuan Zhang, zyx@z-yx.cc
 * This source code is licensed under the MIT license.
 * You may find the full license in project root directory.
 * ------------------------------------------------------ */

import { expect, test } from 'vitest';
import { Pool } from './pool';
import { Vec2 } from '../vec';

test('Pool(eq): reuses canonical object for equivalent values', () => {
  const pool = Pool<{ x: number; y: number }>({
    eq: (a, b) => a.x === b.x && a.y === b.y,
  });

  const a = { x: 1, y: 2 };
  const b = { x: 1, y: 2 };
  const c = { x: 2, y: 3 };

  const pa = pool(a);
  const pb = pool(b);
  const pc = pool(c);

  expect(pa).toBe(a);
  expect(pb).toBe(pa);
  expect(pc).toBe(c);
  expect(pc).not.toBe(pa);
});

test('Pool(sort): reuses canonical object for equivalent values', () => {
  const pool = Pool<{ x: number; y: number }>({
    sort: (a, b) => a.x - b.x || a.y - b.y,
  });

  const a = { x: 1, y: 2 };
  const b = { x: 1, y: 2 };
  const c = { x: 1, y: 3 };

  const pa = pool(a);
  const pb = pool(b);
  const pc = pool(c);

  expect(pa).toBe(a);
  expect(pb).toBe(pa);
  expect(pc).toBe(c);
  expect(pc).not.toBe(pa);
});

test('Pool(hash): reuses canonical object for equivalent values', () => {
  const pool = Pool<{ x: number; y: number }>({
    hash: ({ x, y }) => `${x}:${y}`,
  });

  const a = { x: 1, y: 2 };
  const b = { x: 1, y: 2 };
  const c = { x: 3, y: 4 };

  const pa = pool(a);
  const pb = pool(b);
  const pc = pool(c);

  expect(pa).toBe(a);
  expect(pb).toBe(pa);
  expect(pc).toBe(c);
  expect(pc).not.toBe(pa);
});

test('Pool(eq): returns already pooled vec when eq uses positive eps', () => {
  const eps = 1e-3;
  const pool = Pool<Vec2>({
    eq: (a, b) => a.eq(b, eps),
  });

  const pooled = new Vec2([1, 2]);
  const close = new Vec2([1.0005, 1.9996]);

  expect(pooled).not.toBe(close);
  expect(pooled.eq(close, 0)).toBe(false);
  expect(pooled.eq(close, eps)).toBe(true);

  const first = pool(pooled);
  const second = pool(close);

  expect(first).toBe(pooled);
  expect(second).toBe(first);
  expect(second).not.toBe(close);
});

test('Pool(sort): returns already pooled vec when compare uses positive eps', () => {
  const eps = 1e-3;
  const pool = Pool<Vec2>({
    sort: (a, b) => a.compare(b, eps),
  });

  const pooled = new Vec2([3, 4]);
  const close = new Vec2([2.9997, 4.0002]);

  expect(pooled).not.toBe(close);
  expect(pooled.compare(close, 0)).not.toBe(0);
  expect(pooled.compare(close, eps)).toBe(0);

  const first = pool(pooled);
  const second = pool(close);

  expect(first).toBe(pooled);
  expect(second).toBe(first);
  expect(second).not.toBe(close);
});

test('Pool(digits): hashes vec by d(digits) and returns pooled vec', () => {
  const digits = 3;
  const pool = Pool<Vec2>({ hash: (v) => v.d(digits) });

  const pooled = new Vec2([1, 2]);
  const close = new Vec2([1.0004, 1.9996]);

  expect(pooled).not.toBe(close);
  expect(pooled.d(6)).not.toBe(close.d(6));
  expect(pooled.d(digits)).toBe(close.d(digits));

  const first = pool(pooled);
  const second = pool(close);

  expect(first).toBe(pooled);
  expect(second).toBe(first);
  expect(second).not.toBe(close);
});
