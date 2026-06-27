/* ---------------------------------------------------------
 * Copyright (c) 2025-present Yuxuan Zhang, zyx@z-yx.cc
 * This source code is licensed under the MIT license.
 * You may find the full license in project root directory.
 * ------------------------------------------------------ */

/**
 * #### Sorted array with binary search and insertion.
 * Duplicate items are allowed and treated as distinct items.
 * Insertion order is NOT preserved.
 */
export default class Sorted<T> extends Array<T> {
  // Array methods (e.g. map) can break data order.
  // And the constructor is not compatible with Array constructor.
  static get [Symbol.species]() {
    return Array;
  }
  /** Finds the index where left item <= given item <= index item. */
  protected indexLE(item: T): {
    index: number;
    equal?: T; // Use 'equal' in result to check if an equal item was found
  } {
    let l = 0;
    let r = this.length;
    while (l < r) {
      const m = (l + r) >>> 1;
      const compareItem = this[m];
      const compare = this.compare(item, compareItem);
      if (compare === 0) return { index: m, equal: compareItem };
      if (compare < 0) r = m;
      else l = m + 1;
    }
    // No equal item found, return insertion point
    return { index: l };
  }
  /** Insert item at given index, shifting items to the right. */
  protected insertAt(index: number, item: T): void {
    if (index <= 0) this.unshift(item);
    else if (index >= this.length) this.push(item);
    else this.splice(index, 0, item);
  }
  /* Default comparison function using JavaScript's built-in ordering. */
  private static defaultCompare = <T>(a: T, b: T) => {
    if (a < b) return -1;
    if (a > b) return 1;
    return 0 as number;
  };
  constructor(
    /** Asserts if a should be inserted before b */
    public readonly compare = Sorted.defaultCompare<T>,
  ) {
    super();
  }
  /** Insert items into the sorted array */
  insert(...items: T[]): void {
    for (const item of items) {
      const result = this.indexLE(item);
      this.insertAt(result.index, item);
    }
  }
  /** Binary search */
  search<R>(item: T, fallback: () => R): T | R {
    const result = this.indexLE(item);
    return 'equal' in result ? result.equal! : fallback();
  }
  /**
   * #### Sorted array with uniqueness guarantee.
   * Duplicate items are skipped during insertion.
   */
  static Unique: typeof UniqueSorted;
}

class UniqueSorted<T> extends Sorted<T> {
  /** Insert items into the sorted array, skip  */
  insert(...items: T[]): void {
    for (const item of items) {
      const result = this.indexLE(item);
      if ('equal' in result) continue;
      this.insertAt(result.index, item);
    }
  }
  /** Search or insert, only available for unique sorted arrays */
  add(item: T): T {
    const result = this.indexLE(item);
    if ('equal' in result) return result.equal as T;
    this.insertAt(result.index, item);
    return item as T;
  }
}

Sorted.Unique = UniqueSorted;
