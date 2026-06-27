/* ---------------------------------------------------------
 * Copyright (c) 2025-present Yuxuan Zhang, zyx@z-yx.cc
 * This source code is licensed under the MIT license.
 * You may find the full license in project root directory.
 * ------------------------------------------------------ */

export type LoopContext<T> = {
  readonly loop: Loop<T>;
  readonly index: number;
  readonly value: T;
  readonly prev: LoopContext<T>;
  readonly next: LoopContext<T>;
};

// Endless indexable array-like mapping (immutable)
export default class Loop<T> {
  #data: ReadonlyArray<T>;
  /**
   * #### Recreate the same type of object as this one.
   * Must match current class constructor signature.
   */
  protected recreate(data: Iterable<T>, ...args: unknown[]): this {
    const ctor = this.constructor as typeof Loop;
    const factory = ctor[Symbol.species] || ctor;
    return new factory(data, ...args) as this;
  }
  static readonly [Symbol.species]?: new (...args: any[]) => any;
  constructor(data: Iterable<T>) {
    this.#data = Object.freeze(Array.from(data));
  }
  /** Number of elements in the loop. */
  get length() {
    return this.#data.length;
  }
  [Symbol.iterator]() {
    return this.#data[Symbol.iterator]();
  }
  indexOf(value: T) {
    return this.#data.indexOf(value);
  }
  lastIndexOf(value: T) {
    return this.#data.lastIndexOf(value);
  }
  private normalizeIndex(i: number): number {
    if (!Number.isInteger(i)) throw new TypeError('Index must be an integer');
    const len = this.#data.length;
    if (len === 0) throw new TypeError('Loop cannot be empty');
    if (i < 0) i += len * Math.ceil(-i / len);
    if (i >= len) i -= len * Math.floor(i / len);
    return i;
  }
  at(i: number): T {
    return this.#data[this.normalizeIndex(i)];
  }
  *slice(index: number, count: number) {
    if (!Number.isInteger(index) || !Number.isInteger(count))
      throw new TypeError('Indices must be integers');
    if (count === 0) throw new TypeError('Count must not be 0');
    const step = count > 0 ? 1 : -1;
    const end = index + count;
    for (let i = index; i != end; i += step) yield this.at(i);
  }
  loopRotate(start: number = 0, reverse = false): this {
    const items = (
      reverse
        ? function* (this: Loop<T>) {
            for (let i = 0; i < this.length; i++) yield this.at(start - i);
          }
        : function* (this: Loop<T>) {
            for (let i = 0; i < this.length; i++) yield this.at(start + i);
          }
    ).call(this);
    return this.recreate(items);
  }
  private context(index: number): LoopContext<T> {
    const self = this;
    return {
      get loop() {
        return self;
      },
      get index() {
        return index;
      },
      get value() {
        return self.at(index);
      },
      get prev() {
        return self.context(index - 1);
      },
      get next() {
        return self.context(index + 1);
      },
    };
  }
  *walk(start: number = 0, reverse = false) {
    if (!reverse)
      for (let i = 0; i < this.length; i++) yield this.context(start + i);
    else for (let i = 0; i < this.length; i++) yield this.context(start - i);
  }
  *broadcast<R = unknown>(fn: (value: T, ctx: LoopContext<T>) => R) {
    for (const ctx of this.walk()) yield fn(ctx.value, ctx);
  }
  map(fn: (value: T, ctx: LoopContext<T>) => T): this {
    return this.recreate(this.broadcast(fn));
  }
  filter(fn: (value: T, ctx: LoopContext<T>) => boolean): this {
    const self = this;
    const items = (function* () {
      for (const ctx of self.walk()) if (fn(ctx.value, ctx)) yield ctx.value;
    })();
    return this.recreate(items);
  }
  // Reversed duality
  protected __reversed__?: this;
  // Implement this hook to customize reversed data structure (e.g. for linked list).
  protected reverseData(reversed: T[]): T[] | void {}
  /**
   * Implement this hook to perform additional operations after reversal
   * (e.g. reuse cached properties).
   */
  protected postReverse(reversed: this): void {}
  /**
   * #### Returns a new Loop with reversed order.
   * Reversal is cached, reversing again returns the original Loop.
   */
  get reversed(): this {
    if (this.__reversed__ === undefined) {
      const data = this.#data.toReversed();
      const reversed = this.recreate(this.reverseData(data) ?? data);
      reversed.__reversed__ = this;
      this.postReverse(reversed);
      this.__reversed__ = reversed;
    }
    return this.__reversed__;
  }
  // Reductions
  reduce<R = unknown>(fn: (acc: R, ctx: LoopContext<T>) => R, init: R): R {
    let acc = init;
    for (const ctx of this.walk()) acc = fn(acc, ctx);
    return acc;
  }
  every(fn: (value: T, ctx: LoopContext<T>) => any): boolean {
    for (const ctx of this.walk()) if (!fn(ctx.value, ctx)) return false;
    return true;
  }
  some(fn: (value: T, ctx: LoopContext<T>) => any): boolean {
    for (const ctx of this.walk()) if (fn(ctx.value, ctx)) return true;
    return false;
  }
  // Segmentation
  segment(criterion: (ctx: LoopContext<T>) => boolean) {
    const segments: [number, number][] = [];
    let left: number | null = null;
    for (const ctx of this.walk()) {
      if (criterion(ctx)) {
        left ??= ctx.index;
      } else if (left !== null) {
        segments.push([left, ctx.index]);
        left = null;
      }
    }
    // Close last segment
    if (left !== null) {
      if (segments.length > 0 && segments[0][0] === 0) {
        // Wraparound
        const right = segments.shift()![1] + this.length;
        segments.push([left, right]);
      } else {
        segments.push([left, this.length]);
      }
    }
    // Generate segments
    return segments.map(([start, end]) =>
      Array.from(this.slice(start, end - start)),
    );
  }
  // Stateful searches (e.g. find min/max properties)
  search<K = number>(
    key: (ctx: LoopContext<T>) => K,
    replacer: (a: K, b: K) => boolean,
  ): LoopContext<T> {
    let current_val!: K;
    let current_ctx: LoopContext<T> | null = null;
    for (const ctx of this.walk()) {
      const val = key(ctx);
      if (current_ctx === null || replacer(val, current_val)) {
        current_val = val;
        current_ctx = ctx;
      }
    }
    if (current_ctx === null) throw new Error('No match found');
    return current_ctx;
  }
}
