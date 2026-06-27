<script setup lang="ts">
import type { Geometry } from 'geometry-core';
import { computed } from 'vue';
type PartialGeometry = Partial<Geometry> & Pick<Geometry, 'bbox'>;
const props = defineProps({
  geometry: { type: Object as () => PartialGeometry, required: true },
  padding: { type: Number, default: 20 },
  square: { type: Boolean, default: true },
  showCorners: { type: Boolean, default: true },
  fill: { type: String, default: '#8888' },
  stroke: { type: String, default: 'currentColor' },
  splitEdges: { type: Boolean, default: false },
  precision: { type: Number, default: 2 },
});
const viewBox = computed(() => {
  const { geometry, square, padding } = props;
  const bbox = square ? geometry.bbox.square : geometry.bbox;
  return bbox.expand(padding).viewBox;
});
const segments = computed(() => Array.from(props.geometry.edges ?? []));
const corners = computed(() => Array.from(props.geometry.corners ?? []));
const showCorners = computed(() => props.showCorners ?? true);
</script>

<template>
  <svg :viewBox="viewBox">
    <g class="geometry bg">
      <path
        v-if="geometry.d"
        :d="geometry.d(precision)"
        class="infill"
        :fill="fill"
      />
    </g>
    <g class="extra"><slot></slot></g>
    <g class="geometry fg">
      <line
        v-if="splitEdges"
        v-for="({ A, B }, i) in segments"
        :key="i"
        :x1="A.x"
        :y1="A.y"
        :x2="B.x"
        :y2="B.y"
        :stroke="stroke"
      />
      <path
        v-else-if="geometry.d"
        :d="geometry.d(precision)"
        fill="none"
        :stroke="stroke"
      />
      <circle
        v-if="showCorners"
        v-for="(corner, i) in corners"
        :key="i"
        :cx="corner.x"
        :cy="corner.y"
        r="1.5"
        :stroke="stroke"
        fill="var(--vp-c-bg)"
      />
    </g>
  </svg>
</template>

<style scoped>
svg {
  width: 100%;
  height: auto;
  border-radius: 4px;
  outline: 1px solid transparent;
  fill-rule: evenodd;
}
* {
  stroke-width: 1px;
  stroke-linejoin: round;
  stroke-linecap: round;
}

*:not(g):not([fill]) {
  fill: transparent;
}

svg:not(:hover) > g.geometry.bg > path {
  opacity: 0.4;
}

svg:hover {
  outline-color: var(--vp-c-text-3);
}
</style>
