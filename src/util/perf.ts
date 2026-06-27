/* ---------------------------------------------------------
 * Copyright (c) 2025-present Yuxuan Zhang, zyx@z-yx.cc
 * This source code is licensed under the MIT license.
 * You may find the full license in project root directory.
 * ------------------------------------------------------ */

import { DEV } from './debug';

type Tick = { label: string; duration: number; ticks: Tick[] | null };
type TickPartial = {
  label?: string;
  duration?: number;
  ticks?: TickPartial[];
};

export default class PerformanceTracker {
  public readonly t0 = performance.now();
  constructor(
    public readonly label: string,
    public readonly ticks: TickPartial[] = [],
    public readonly parent?: PerformanceTracker,
  ) {
    if (!parent) this.#lastTick = this.t0;
  }
  #lastTick!: number;
  get lastTick(): number {
    return this.parent?.lastTick ?? this.#lastTick;
  }
  set lastTick(value: number) {
    if (this.parent) this.parent.lastTick = value;
    else this.#lastTick = value;
  }
  tick(label?: string) {
    const now = performance.now();
    const duration = now - this.lastTick;
    this.ticks.push({ label, duration });
    this.lastTick = now;
  }
  subtask(label: string): PerformanceTracker {
    const ticks: typeof this.ticks = [];
    this.ticks.push({ label, ticks });
    return new PerformanceTracker(label, ticks, this);
  }
  private finalize(): Tick {
    function normalize(ticks: TickPartial[]): [Tick[], number] {
      const ret = ticks.map((tick) => {
        const { label, duration: d0, ticks: subticks } = tick;
        const [ticks, duration] =
          subticks === undefined ? [null, d0 ?? 0] : normalize(subticks);
        return {
          label: label ?? '(gap)',
          duration,
          ticks,
        };
      });
      return [ret, ret.reduce((sum, { duration }) => sum + duration, 0)];
    }
    const { label } = this;
    const [ticks, duration] = normalize(this.ticks);
    return { label, duration, ticks };
  }
  report({ label, duration, ticks } = this.finalize(), pct?: number) {
    if (!DEV) return;
    let title = `${duration.toFixed(3).padStart(6)}ms`;
    if (pct !== undefined) title += ` | ${percentage(pct)} | ${label}`;
    else title = `Performance Report: ${label} ${title}`;
    if (ticks !== null) {
      console.groupCollapsed(title);
      for (const t of ticks) this.report(t, t.duration / duration);
      console.groupEnd();
    } else {
      console.log(title);
    }
  }
}

function percentage(p: number) {
  return (p * 100).toFixed(2).padStart(6) + '%';
}
