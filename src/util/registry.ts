/* ---------------------------------------------------------
 * Copyright (c) 2025-present Yuxuan Zhang, zyx@z-yx.cc
 * This source code is licensed under the MIT license.
 * You may find the full license in project root directory.
 * ------------------------------------------------------ */

export default class Registry<K, V> extends Map<K, V> {
  constructor(
    private readonly initializeValue: (k: K) => V,
    keys?: Iterable<K>,
  ) {
    super();
    if (keys) for (const key of keys) this.set(key, initializeValue(key));
  }
  /**
   * #### Get an item by key.
   * If the key does not exist, it will be initialized using the provided
   * initializer function and stored in the registry before returning.
   * @returns {V} The value associated with the key.
   */
  override get(key: K): V {
    if (!this.has(key)) this.set(key, this.initializeValue(key));
    return super.get(key)!;
  }
}
