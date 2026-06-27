/* ---------------------------------------------------------
 * Copyright (c) 2025-present Yuxuan Zhang, zyx@z-yx.cc
 * This source code is licensed under the MIT license.
 * You may find the full license in project root directory.
 * ------------------------------------------------------ */

export function pop<T>(set: Set<T>): T {
  for (const item of set) {
    set.delete(item);
    return item;
  }
  throw new Error('Set is empty');
}
