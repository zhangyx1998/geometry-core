/* ---------------------------------------------------------
 * Copyright (c) 2025-present Yuxuan Zhang, zyx@z-yx.cc
 * This source code is licensed under the MIT license.
 * You may find the full license in project root directory.
 * ------------------------------------------------------ */

export default class Order {
  // Segments organized according to lexicographical order of bounding boxes
  static readonly MARK: unique symbol = Symbol('ORDER');
  static mark<O extends DataOrder, I extends Iterable<T>, T>(
    iterable: I,
    order: O,
  ): I & Ordered<O, T> {
    return Object.assign(iterable, { [Order.MARK]: order });
  }
  static unmark<I extends Iterable<T>, T>(iterable: I): I {
    try {
      delete (iterable as any)[Order.MARK];
    } catch {}
    return iterable;
  }
  static get<I extends Iterable<T>, T>(
    iterable: I,
  ): I extends Ordered<infer O, T> ? O : DataOrder {
    try {
      return (iterable as any)[Order.MARK] || 'unknown';
    } catch {
      return 'unknown' as any;
    }
  }
  static is<I extends Iterable<T>, T, O extends DataOrder>(
    iterable: I,
    expected: O,
  ): iterable is I & Ordered<O, T> {
    return Order.get(iterable) === (expected as DataOrder);
  }
  // Order manipulation
  static retain<
    S extends Ordered<O, T>,
    D extends Iterable<T>,
    T,
    O extends DataOrder,
  >(src: S, dst: D): D & Ordered<O, T> {
    return Object.assign(dst, { [Order.MARK]: Order.get(src) });
  }
  static reverse<T>(iterable: Ascending<T>): T[] & Descending<T>;
  static reverse<T>(iterable: Descending<T>): T[] & Ascending<T>;
  static reverse<T>(iterable: Iterable<T>): T[];
  static reverse<T>(iterable: Iterable<T>): T[] {
    const order = {
      ascending: 'descending' as const,
      descending: 'ascending' as const,
      unknown: 'unknown' as const,
    }[Order.get(iterable)];
    const arr = Array.isArray(iterable) ? iterable : Array.from(iterable);
    const reversed = arr.toReversed();
    return order ? Order.mark(reversed, order) : reversed;
  }
  static sort<T, O extends Exclude<DataOrder, 'unknown'>>(
    iterable: Iterable<T>,
    order: O,
    compare: (a: T, b: T) => number,
  ): T[] & Ordered<O, T> {
    const src = Array.from(iterable);
    switch (Order.get(iterable)) {
      case 'unknown': {
        const arr = src.toSorted(compare);
        return Order.mark(arr, order);
      }
      case order:
        return src as T[] & Ordered<O, T>;
      default: {
        const arr = src.toReversed();
        return Order.mark(arr, order);
      }
    }
  }
}

export type DataOrder = 'ascending' | 'descending' | 'unknown';

export interface Ordered<O extends DataOrder, T> extends Iterable<T> {
  readonly [Order.MARK]: O;
}
export type Ascending<T> = Ordered<'ascending', T>;
export type Descending<T> = Ordered<'descending', T>;
