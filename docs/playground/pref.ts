/* ---------------------------------------------------------
 * Copyright (c) 2025-present Yuxuan Zhang, zyx@z-yx.cc
 * This source code is licensed under the MIT license.
 * You may find the full license in project root directory.
 * ------------------------------------------------------ */

export default function perf<
  F extends (...args: A) => R,
  A extends any[] = Parameters<F>,
  R = ReturnType<F>,
>(fn: F, name = fn.name || 'anonymous'): F {
  const wrapped = (...args: A): R => {
    const start = performance.now();
    try {
      return fn(...args);
    } finally {
      if (import.meta.env.DEV) {
        const end = performance.now();
        console.debug(name, `took ${(end - start).toFixed(2)} ms`);
      }
    }
  };
  Object.defineProperty(wrapped, 'name', { value: name });
  return wrapped as F;
}
