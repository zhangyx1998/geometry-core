/* ---------------------------------------------------------
 * Copyright (c) 2025-present Yuxuan Zhang, zyx@z-yx.cc
 * This source code is licensed under the MIT license.
 * You may find the full license in project root directory.
 * ------------------------------------------------------ */
type ObjectType = Record<PropertyKey, any>;
type NotArrayLike<T> = T extends ArrayLike<any> ? never : T;
const UnpackStackView = Symbol('stack-view:unpack');
/**
 * Creates a deep, merged view of multiple objects without mutating originals.
 * Returns a readonly proxy behaving like a merged object of the input objects.
 * Layers are merged in descending precedence, i.e. earlier layer is on top.
 */
export default function stackView<T extends ObjectType>(
  ..._layers: Partial<T>[]
): NotArrayLike<T> {
  const layers = _layers.filter((layer) => isObject(layer));
  if (layers.length <= 1) return _layers[0] as NotArrayLike<T>;

  const allKeys = new Set(layers.flatMap((layer) => Reflect.ownKeys(layer)));
  const allKeysArray = [...allKeys];

  return new Proxy<NotArrayLike<T>>({} as any, {
    get(_, prop) {
      if (prop === UnpackStackView) return { layers, keys: allKeysArray };
      return stackView(
        ...layers
          .map((layer) => layer[prop])
          .filter((v): v is NonNullable<T[string | symbol]> => v !== undefined),
      );
    },
    set() {
      throw new Error('StackView is read-only and cannot be mutated.');
    },
    has(_, prop) {
      return allKeys.has(prop);
    },
    ownKeys() {
      return allKeysArray;
    },
    getOwnPropertyDescriptor(_, prop) {
      for (const layer of layers) {
        const descriptor = Object.getOwnPropertyDescriptor(layer, prop);
        if (descriptor) return descriptor;
      }
    },
  });
}

stackView.unpack = function <T>(
  obj: T,
): { layers: T[]; keys: (keyof T)[] } | undefined {
  return (obj as any)?.[UnpackStackView];
};

export function isObject(value: unknown): value is ObjectType {
  return Object.prototype.toString.call(value) === '[object Object]';
}
