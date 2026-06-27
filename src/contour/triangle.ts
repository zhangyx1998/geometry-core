/* ---------------------------------------------------------
 * Copyright (c) 2025-present Yuxuan Zhang, zyx@z-yx.cc
 * This source code is licensed under the MIT license.
 * You may find the full license in project root directory.
 * ------------------------------------------------------ */

import { Enclosure } from '../types';
import { map } from '../util/iter';
import { Vec2, Vec3 } from '../vec';
import Polygon from './polygon';

/**
 * Specialized triangle class with additional geometric properties and methods.
 */
export default class Triangle extends Polygon {
  private __norm__?: Vec3;
  get norm(): Vec3 {
    if (!this.__norm__) {
      const AB = this.at(0).delta.like(Vec3);
      const BC = this.at(1).delta.like(Vec3);
      this.__norm__ = AB.cross(BC).mul(-0.5);
    }
    return this.__norm__!;
  }
  __centroid__?: Vec2;
  get centroid() {
    if (this.__centroid__ === undefined) {
      const [A, B, C] = this.corners;
      this.__centroid__ = A.add(B).add(C).div(3);
    }
    return this.__centroid__;
  }
  /**
   * Given to the nature of triangle geometry,
   * we can simply check if P is on the same side of AB, BC, CA
   */
  encloses(P: Vec2): Enclosure {
    for (const d of map(this, (s) => s.det(P))) {
      if (d === 0) return Enclosure.Boundary;
      if (d > 0) return Enclosure.Outside;
    }
    return Enclosure.Inside;
  }
  constructor(...args: ConstructorParameters<typeof Polygon>) {
    super(...args);
    if (this.length !== 3)
      throw new Error('Triangle must have exactly 3 points');
  }
}
