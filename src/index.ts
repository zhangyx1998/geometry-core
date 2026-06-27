/* ---------------------------------------------------------
 * Copyright (c) 2025-present Yuxuan Zhang, zyx@z-yx.cc
 * This source code is licensed under the MIT license.
 * You may find the full license in project root directory.
 * ------------------------------------------------------ */

export { default as Vec } from './vec';
export * from './vec';

export { default as Segment } from './segment/segment';
export * from './segment/segment';

export { default as Line } from './segment/line';
export * from './segment/line';

export { default as Intersection } from './segment/intersection';
export * from './segment/intersection';

export { default as Ray } from './segment/ray';
export * from './segment/ray';

export { default as Contour } from './contour/contour';
export * from './contour/contour';

export { default as Polygon } from './contour/polygon';
export * from './contour/polygon';

export { default as Triangle } from './contour/triangle';
export * from './contour/triangle';

export { default as Shape } from './shape/shape';
export * from './shape/shape';

export * as itertools from './util/iter';
export { default as Loop } from './util/loop';
export { default as PerformanceTracker } from './util/perf';
export { default as GeometryDefaults } from './util/config';
export * as IO from './util/io';

export * from './types';
