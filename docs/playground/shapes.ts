import { Polygon, Vec2 } from 'geometry-core';

class PolyShape extends Polygon {
  static get [Symbol.species]() {
    return Polygon;
  }
}

export class Rectangle extends PolyShape {
  constructor(A = new Vec2([0, 0]), B = new Vec2([100, 100])) {
    const [x0, x1] = [A.x, B.x].sort((a, b) => a - b);
    const [y0, y1] = [A.y, B.y].sort((a, b) => a - b);
    super([
      new Vec2([x0, y0]), // bottom-left
      new Vec2([x0, y1]), // top-left
      new Vec2([x1, y1]), // top-right
      new Vec2([x1, y0]), // bottom-right
    ]);
  }
}

type StarOptions = {
  center: Vec2;
  rotation: number;
  // Outer radius
  radius: number;
};

export class Star extends PolyShape {
  static *create(options: Partial<StarOptions>) {
    const center = options.center ?? new Vec2([0, 0]);
    const rotation = options.rotation ?? -Math.PI / 2;
    const radius = options.radius ?? 100;
    for (let i = 0; i <= 5; i++) {
      const angle = rotation + (i * 4 * Math.PI) / 5;
      yield center.add([Math.cos(angle) * radius, Math.sin(angle) * radius]);
    }
  }
  constructor(options: Partial<StarOptions> = {}) {
    super(Star.create(options));
  }
}

export class PolyCircle extends PolyShape {
  static *create(center: Vec2, radius: number, segments: number) {
    segments = Math.max(3, segments);
    for (let i = 0; i <= segments; i++) {
      const angle = (i * 2 * Math.PI) / segments;
      yield center.add([Math.cos(angle) * radius, Math.sin(angle) * radius]);
    }
  }
  constructor(center = new Vec2([0, 0]), radius = 100, segments = 40) {
    super(PolyCircle.create(center, radius, segments));
  }
}

export class Complex extends PolyShape {
  static *create(center: Vec2, unit: number) {
    const k = unit / 4;
    yield center.add(new Vec2([0, 0]).mul(k));
    yield center.add(new Vec2([0, 4]).mul(k));
    yield center.add(new Vec2([3, 4]).mul(k));
    yield center.add(new Vec2([1, 1]).mul(k));
    yield center.add(new Vec2([3, 0]).mul(k));
  }
  constructor(center: Vec2 = new Vec2([0, 0]), unit = 100) {
    super(Complex.create(center, unit));
  }
}
