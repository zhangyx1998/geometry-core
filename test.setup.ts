import { expect } from 'vitest';

type Equalable = {
  eq: (other: unknown) => boolean;
};

function hasEquals(value: unknown): value is Equalable {
  return (
    typeof value === 'object' &&
    value !== null &&
    'eq' in value &&
    typeof (value as { eq?: unknown }).eq === 'function'
  );
}

expect.addEqualityTesters([
  (a: unknown, b: unknown) => {
    if (hasEquals(a)) return a.eq(b);
    if (hasEquals(b)) return b.eq(a);
    return undefined;
  },
]);
