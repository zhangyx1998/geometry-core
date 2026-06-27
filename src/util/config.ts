/* ---------------------------------------------------------
 * Copyright (c) 2025-present Yuxuan Zhang, zyx@z-yx.cc
 * This source code is licensed under the MIT license.
 * You may find the full license in project root directory.
 * ------------------------------------------------------ */

type ErrorHandling =
  | 'throw' // Throw exceptions on errors (default)
  | 'preserve' // Disgard invalid inputs but preserve valid ones
  | 'empty'; // Disgard all inputs if any invalid input is found

const Config = {
  /** Default epsilon for floating-point comparisons */
  eps: 1e-6,
  /** Internal error handling, default throw */
  errors: 'throw' as ErrorHandling,
};

export default Config;
