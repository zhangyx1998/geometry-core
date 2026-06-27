/* ---------------------------------------------------------
 * Copyright (c) 2025-present Yuxuan Zhang, zyx@z-yx.cc
 * This source code is licensed under the MIT license.
 * You may find the full license in project root directory.
 * ------------------------------------------------------ */

export type IterableItem<I> = I extends Iterable<infer T> ? T : never;

export function next<T, P>(iterable: Iterable<T>, fallback: () => P): T | P;
export function next<T>(iterable: Iterable<T>): T;
export function next<T, P = never>(
  iterable: Iterable<T>,
  fallback: () => P = () => {
    throw new Error("not found");
  },
): T | P | undefined {
  for (const item of iterable) return item;
  return fallback();
}

export function* enumerate<T>(
  iterable: Iterable<T>,
  start = 0,
): Generator<[number, T]> {
  let i = start;
  for (const item of iterable) {
    yield [i++, item];
  }
}

export function* map<T, R>(
  iterable: Iterable<T>,
  fn: (item: T) => R,
): Generator<R> {
  for (const item of iterable) yield fn(item);
}

export function* flatMap<T, R>(
  iterable: Iterable<T>,
  fn: (item: T) => Iterable<R>,
): Generator<R> {
  for (const item of iterable) yield* fn(item);
}

export function isEmpty<T>(iterable: Iterable<T>): boolean {
  for (const _ of iterable) return false;
  return true;
}

export function some<T>(items: Iterable<T>, cond: (v: T) => boolean): boolean {
  for (const v of items) if (cond(v)) return true;
  return false;
}

export function every<T>(items: Iterable<T>, cond: (v: T) => boolean): boolean {
  for (const v of items) if (!cond(v)) return false;
  return true;
}

export function* cat<T>(iterables: Iterable<Iterable<T>>): Generator<T> {
  for (const iterable of iterables) yield* iterable;
}

export function* zip<T extends unknown[]>(
  ...iterables: { [K in keyof T]: Iterable<T[K]> }
): Generator<T> {
  const iterators = iterables.map((it) => it[Symbol.iterator]()) as {
    [K in keyof T]: Iterator<T[K]>;
  };
  while (true) {
    const results = iterators.map((it) => it.next()) as {
      [K in keyof T]: IteratorResult<T[K]>;
    };
    if (results.some((res) => res.done)) break;
    // TS cannot infer that all results are non-done here.
    yield results.map((res) => res.value) as T;
  }
}

export function* filter<T>(items: Iterable<T>, fn: (item: T) => boolean) {
  for (const item of items) if (fn(item)) yield item;
}

export function* pairwise<T>(
  iterable: Iterable<T>,
  wind = false,
  size = 2,
): Generator<T[]> {
  let head: T[] = [];
  let current: T[] = [];
  let count = 0;
  for (const item of iterable) {
    count++;
    current.push(item);
    if (wind && head.length < size - 1) head.push(item);
    if (current.length < size) continue;
    yield current;
    current = current.slice(1);
  }
  if (!wind || count <= size) return;
  const dup = Math.max(0, (size - 1) * 2 - count);
  const window = [...current.slice(dup), ...head];
  for (let i = 0; i < window.length - size + 1; i++)
    yield window.slice(i, i + size);
}

export function* combinations<T>(
  items: ArrayLike<T>,
  k: number = 2,
  i = 0,
): Generator<T[]> {
  if (k < 1) throw new TypeError("k must be at least 1");
  if (i >= items.length) return;
  if (k === 1) {
    for (let j = i; j < items.length; j++) yield [items[j]] as const;
  } else {
    for (let j = i; j <= items.length - k; j++) {
      for (const tail of combinations(items, k - 1, j + 1))
        yield [items[j], ...tail] as const;
    }
  }
}

export function* captureIteratorReturn<T, R>(
  iterable: Iterable<T>,
  onReturn: (value: R) => any,
): Generator<T, R> {
  const iterator = iterable[Symbol.iterator]();
  try {
    while (true) {
      const { value, done } = iterator.next();
      if (done) {
        onReturn(value);
        return value;
      }
      yield value;
    }
  } finally {
    iterator.return?.();
  }
}
