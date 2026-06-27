/* ---------------------------------------------------------
 * Copyright (c) 2025-present Yuxuan Zhang, zyx@z-yx.cc
 * This source code is licensed under the MIT license.
 * You may find the full license in project root directory.
 * ------------------------------------------------------ */
import Contour from '../contour/contour';
import Polygon, { SimplePolygon } from '../contour/polygon';
import { Line2D } from '../segment/line';
import { Segment2D } from '../segment/segment';
import Shape from '../shape/shape';
import { Geometry } from '../types';
import { Vec2 } from '../vec';
import Config from './config';
import { DEV } from './debug';
import { DataParseError, LogicError, NotImplementedError } from './error';
import { cat, map } from './iter';
import { Pool } from './pool';

export const SourceElement = new WeakMap<Geometry<Vec2>, SVGElement>();

function register<T extends Geometry<Vec2>>(geo: T, el: SVGElement) {
  SourceElement.set(geo, el);
  return geo;
}

/** Regex to match path data commands */
const rDataCmd = /([a-zA-Z])([^a-zA-Z]*)/g;

function* fromPathData(d: string, eps = Config.eps) {
  let index = 0;
  let M: Vec2 = Vec2.origin;
  let segments: Segment2D[] = [];
  let loopIsPolygon = true;
  function commit() {
    const { length } = segments;
    if (!length)
      LogicError.throw('Segment count must be checked before committing');
    if (length === 1) {
      const s = segments[0]!;
      segments = [];
      return s;
    }
    const loop = loopIsPolygon
      ? new Polygon(segments as Line2D[], eps)
      : new Contour(segments, eps);
    segments = [];
    return loop;
  }
  for (const [full, cmd, params] of d.matchAll(rDataCmd)) {
    const p = params
      .trim()
      .split(/[\s,]+/)
      .map(Number);
    switch (cmd) {
      // Close commands
      case 'Z':
      case 'z': {
        if (!segments.length)
          throw new DataParseError('Cannot close empty path').data({
            raw: d,
            position: index,
            length: full.length,
          });
        const start = segments[0]!.A;
        if (!start.eq(M, eps))
          segments.push(new Line2D(M, start, undefined, 'Z'));
        M = start;
        yield commit();
        break;
      }
      // Move commands
      case 'M':
        if (segments.length) yield commit();
        M = new Vec2(p);
        break;
      case 'm':
        if (segments.length) yield commit();
        M = M.add(p);
        break;
      // Line commands
      case 'L': {
        const L = new Vec2(p);
        segments.push(new Line2D(M, L));
        M = L;
        break;
      }
      case 'l': {
        const L = M.add(p);
        segments.push(new Line2D(M, L));
        M = L;
        break;
      }
      case 'H': {
        const L = new Vec2([p[0] ?? 0, M.y]);
        segments.push(new Line2D(M, L));
        M = L;
        break;
      }
      case 'h': {
        const L = M.add(new Vec2([p[0], 0]));
        segments.push(new Line2D(M, L));
        M = L;
        break;
      }
      case 'V': {
        const L = new Vec2([M.x, p[0] ?? 0]);
        segments.push(new Line2D(M, L));
        M = L;
        break;
      }
      case 'v': {
        const L = M.add(new Vec2([0, p[0] ?? 0]));
        segments.push(new Line2D(M, L));
        M = L;
        break;
      }
      // Cubic Bezier commands
      case 'C':
      case 'c':
      case 'S':
      case 's':
        loopIsPolygon = false;
        NotImplementedError.throw('Cubic Bezier is not supported yet');
      // Quadratic Bezier commands
      case 'Q':
      case 'q':
      case 'T':
      case 't':
        loopIsPolygon = false;
        NotImplementedError.throw('Quadratic Bezier is not supported yet');
      // Arc commands
      case 'A':
      case 'a':
        loopIsPolygon = false;
        NotImplementedError.throw('Arc is not supported yet');
      // No such command
      default:
        throw new Error(`Unknown path command: ${cmd} ${params.trim()}`);
    }
    index += full.length;
  }
  if (segments.length) yield commit();
}

export function* fromPathElement(el: SVGPathElement, eps = Config.eps) {
  const items: (Contour | Polygon)[] = [];
  for (const loop of fromPathData(el.getAttribute('d') ?? '', eps)) {
    register(loop, el);
    if (loop instanceof Contour) items.push(loop);
    else yield loop;
  }
  if (items.length === 1) yield items[0]!;
  else
    // Multiple loops, return a compound shape
    yield register(
      Shape.fromSimplePolygons(
        cat(
          map(items, (i) => {
            if (i instanceof Polygon) {
              const { outer, inner } = i;
              return [outer, ...inner];
            }
            // Flatten contour with curves into a polygon with straight edges
            // since we currently do not support curves in shapes
            const { outer, inner } = new Polygon(i.flatten(eps), eps);
            return [outer, ...inner];
          }),
        ),
      ),
      el,
    );
}

export function* fromPolygonElement(
  el: SVGPolygonElement | SVGPolylineElement,
  eps = Config.eps,
): Generator<Polygon | Line2D> {
  const points = el.getAttribute('points') ?? '';
  const params = points
    .trim()
    .split(/[\s,]+/)
    .map(Number);
  const count = Math.floor(params.length / 2);
  if (count <= 1) return;
  const pool = Pool<Vec2>({
    sort: (a, b) => a.compare(b, eps),
  });
  const pts: (Line2D | Vec2)[] = new Array(count)
    .fill(undefined)
    .map((_, i) => pool(new Vec2([params[2 * i], params[2 * i + 1]])));
  if (count === 2) {
    const [A, B] = pts as Vec2[];
    return yield register(new Line2D(A, B), el);
  }
  const B = pts[0] as Vec2;
  const A = pts[count - 1] as Vec2;
  if (!A.eq(B, eps)) pts.push(new Line2D(A, B, undefined, 'Z'));
  const polygon = new Polygon(pts, eps);
  return yield register(polygon, el);
}

export function fromRectElement(
  el: SVGRectElement,
  eps = Config.eps,
): SimplePolygon {
  const x = Number(el.getAttribute('x') ?? 0);
  const y = Number(el.getAttribute('y') ?? 0);
  const width = Number(el.getAttribute('width') ?? 0);
  const height = Number(el.getAttribute('height') ?? 0);
  const points = [
    new Vec2([x, y]),
    new Vec2([x + width, y]),
    new Vec2([x + width, y + height]),
    new Vec2([x, y + height]),
  ];
  return register(new SimplePolygon(points, eps), el);
}

export function fromEllipseElement(
  el: SVGEllipseElement,
  eps = Config.eps,
): Contour {
  NotImplementedError.throw('Ellipse is not supported yet');
}

/** For now, approximate circle into a polygon */
export function fromCircleElement(
  el: SVGCircleElement,
  eps = Config.eps,
  /** temporary parameter, will be removed before public alpha */
  divisions = 36,
): SimplePolygon {
  const theta = new Array(divisions)
    .fill(undefined)
    .map((_, i) => (i / divisions) * 2 * Math.PI);
  const cx = Number(el.getAttribute('cx') ?? 0);
  const cy = Number(el.getAttribute('cy') ?? 0);
  const r = Number(el.getAttribute('r') ?? 0);
  const points = theta.map(
    (t) => new Vec2([cx + r * Math.cos(t), cy + r * Math.sin(t)]),
  );
  return register(new SimplePolygon(points, eps), el);
}

export function fromLineElement(el: SVGLineElement, _ = Config.eps): Segment2D {
  const x1 = Number(el.getAttribute('x1') ?? 0);
  const y1 = Number(el.getAttribute('y1') ?? 0);
  const x2 = Number(el.getAttribute('x2') ?? 0);
  const y2 = Number(el.getAttribute('y2') ?? 0);
  return register(new Line2D(new Vec2([x1, y1]), new Vec2([x2, y2])), el);
}

export function* inflate(
  el: SVGElement,
  eps = Config.eps,
): Generator<Geometry<Vec2>> {
  const { tagName } = el;
  switch (tagName) {
    case 'svg':
      for (const child of el.children)
        yield* inflate(child as SVGSVGElement, eps);
      break;
    case 'g':
      for (const child of el.children)
        yield* inflate(child as SVGGElement, eps);
      break;
    case 'path':
      yield* fromPathElement(el as SVGPathElement, eps);
      break;
    case 'polygon':
    case 'polyline':
      yield* fromPolygonElement(
        el as SVGPolygonElement | SVGPolylineElement,
        eps,
      );
      break;
    case 'rect':
      yield fromRectElement(el as SVGRectElement, eps);
      break;
    case 'ellipse':
      yield fromEllipseElement(el as SVGEllipseElement, eps);
      break;
    case 'circle':
      yield fromCircleElement(el as SVGCircleElement, eps);
      break;
    case 'line':
      yield fromLineElement(el as SVGLineElement, eps);
      break;
    case 'style':
      break;
    default:
      if (DEV) console.warn(`Unsupported SVG element: <${tagName}>`);
  }
}

export function* fromSVG(el: SVGSVGElement | SVGGElement, eps = Config.eps) {
  // TODO: handle transoforms in attributes and styles
  // For now ignore them
  yield* inflate(el, eps);
}
