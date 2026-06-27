<script setup lang="ts">
import { computed, useTemplateRef, watch } from 'vue';
import Source from './svg-io.svg';
import { fromSVG } from 'geometry-core/util/io';
import {
  BBox,
  Polygon,
  Shape,
  SimplePolygon,
  SimpleShape,
  Vec2,
} from 'geometry-core';
import local from 'util/local';
const source = useTemplateRef<SVGSVGElement>('source');
const elements = computed(() => {
  const svg = source.value;
  if (!svg) return [];
  return Array.from(fromSVG(((svg as any).$el as SVGSVGElement) ?? svg));
});
const baseBox = new BBox(Vec2.origin);
const bbox = computed(() => {
  const src = elements.value;
  if (src.length === 0) return baseBox;
  const bbox = BBox.merge(elements.value.map((g) => g.bbox));
  const { width, height } = bbox.size;
  return bbox.expand(Math.min(width, height) * 0.4);
});

const distance = local.page<number>('distance', 20);
const distanceSlider = computed({
  get: () => distance.value,
  set: (val) => {
    distance.value = typeof val === 'string' ? parseFloat(val) : val;
  },
});

const offseted = computed(() => {
  const intputs = elements.value.flatMap((g) => {
    if (g instanceof SimplePolygon) return [g.positive];
    if (g instanceof Polygon) return [g.outer];
    if (g instanceof Shape) return g.shapes.map((s) => s.outer);
    if (g instanceof SimpleShape) return [g.outer];
    return [];
  });
  const offset = distance.value;
  if (offset === 0) return intputs;
  return intputs.flatMap((ply) => ply.offset(offset, 'square'));
});

const union = computed(() => {
  const arr = offseted.value;
  if (arr.length === 0) return null;
  const [first, ...rest] = arr;
  return Shape.union(first, ...rest).shapes.map((s) => s.outer);
});

const targets = [new Vec2([7, 5])];
</script>

<template>
  <h4>Raw SVG Input</h4>
  <Source ref="source" :viewBox="bbox.viewBox" />
  <hr />
  <h4>Transform Parameters</h4>
  <label>
    Distance:
    <input type="range" min="0" max="20" step="0.1" v-model="distanceSlider" />
    {{ distance }}
  </label>
  <hr />
  <h4>Processed Elements</h4>
  <svg :viewBox="bbox.viewBox">
    <path class="offseted" v-for="(g, i) in offseted" :key="i" :d="g.d(4)" />
    <path
      class="union"
      v-if="union"
      v-for="(p, i) in union"
      :key="i"
      :d="p.d(4)"
    />
    <path v-for="(g, i) in elements" :key="i" :d="g.d(4)" />
    <circle
      class="target"
      v-for="(t, i) in targets"
      :key="i"
      :cx="t.x"
      :cy="t.y"
    />
  </svg>
</template>

<style scoped>
svg {
  background: #0aa1;
  width: calc(100% - 4ch);
  margin: 2ch;
  height: auto;
  border-radius: 2ch;
  outline: 1px solid var(--vp-c-text-3);
}

svg * {
  stroke: gray;
  stroke-width: 0.1;
  stroke-linejoin: round;
  fill-rule: evenodd;
  fill: #fa04;
}

svg .offseted {
  fill: none;
  stroke: #8884;
}

svg .union {
  fill: none;
  stroke: red;
}

svg .target {
  fill: red;
  stroke: white;
  r: 0.4;
}

label {
  margin: 12px 0;
  display: flex;
  align-items: center;
  gap: 8px;
}

select {
  -webkit-appearance: menulist-button;
  appearance: multilist-button;
}

.cards {
  display: flex;
  width: 100%;
  justify-content: flex-start;
  align-items: flex-start;
  flex-wrap: wrap;
  gap: 10px;
}

.card {
  display: flex;
  width: 100%;
  max-width: 50ch;
  flex-direction: column;
  align-items: center;
}

path.outline {
  stroke-width: 1px;
  fill: none;
}

path.infill {
  stroke-width: 0;
  fill: #fff1;
  /* opacity: 0; */
}

.shape-a {
  stroke: #08a;
}

.shape-b {
  stroke: #f00;
}

.outline.shape-r {
  stroke: #adff2f;
}

path.infill.shape-r {
  fill: #084;
}
</style>
