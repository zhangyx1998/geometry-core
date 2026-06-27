/* ---------------------------------------------------------
 * Copyright (c) 2025-present Yuxuan Zhang, zyx@z-yx.cc
 * This source code is licensed under the MIT license.
 * You may find the full license in project root directory.
 * ------------------------------------------------------ */

export default function transform(src: string, pkg: any) {
  const BLOB = new URL('./blob/master/', pkg.repository.url);
  return src
    .replace(
      '<!-- LINK TO DOCUMENTATION -->',
      '**[🔗 Documentation Website Coming Soon]()**',
    )
    .replace(/(?<=\()(\.\/.*)(?=\))/g, (path) => new URL(path, BLOB).href);
}
