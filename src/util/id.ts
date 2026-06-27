/* ---------------------------------------------------------
 * Copyright (c) 2025-present Yuxuan Zhang, zyx@z-yx.cc
 * This source code is licensed under the MIT license.
 * You may find the full license in project root directory.
 * ------------------------------------------------------ */

// Object ID comparison for consistent ordering
const ObjectIdPool = new WeakMap<object, number>();
let nextObjectId = 0;

export function id(obj: object): number {
  if (typeof obj !== 'object' || obj === null)
    throw new TypeError('Only non-null objects can be identified');
  if (!ObjectIdPool.has(obj)) ObjectIdPool.set(obj, nextObjectId++);
  return ObjectIdPool.get(obj)!;
}
