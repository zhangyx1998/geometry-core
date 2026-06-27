/* ---------------------------------------------------------
 * Copyright (c) 2025-present Yuxuan Zhang, zyx@z-yx.cc
 * This source code is licensed under the MIT license.
 * You may find the full license in project root directory.
 * ------------------------------------------------------ */

import { filter, next } from './iter';
import Sorted from './sorted';

type PoolStrategy<T> =
  // Scan-compare insertion strategy
  | { eq: (a: T, b: T) => boolean }
  // Binary search insertion strategy (requires total order)
  | { sort: (a: T, b: T) => number }
  // Hash-based insertion strategy (requires stable hash)
  | { hash: (a: T) => string };

/**
 * #### Ensure strict object equality using given strategy.
 */
export function Pool<T>(strategy: PoolStrategy<T>): (item: T) => T {
  if ('hash' in strategy) {
    const map = new Map<string, T>();
    return function pool(item: T): T {
      const key = strategy.hash(item);
      if (map.has(key)) return map.get(key)!;
      map.set(key, item);
      return item;
    };
  }
  if ('sort' in strategy) {
    const sorted = new Sorted.Unique(strategy.sort);
    return function pool(item: T): T {
      return sorted.add(item);
    };
  }
  if ('eq' in strategy) {
    const set = new Set<T>();
    return function pool(item: T): T {
      return next(
        filter(set, (i) => strategy.eq(i, item)),
        () => (set.add(item), item),
      );
    };
  }
  throw new TypeError(`Invalid pooling strategy: ${strategy}`);
}
