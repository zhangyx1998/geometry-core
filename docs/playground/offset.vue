<script setup lang="ts">
import { computed, Ref, ref } from 'vue';
import * as shapes from './shapes';
import Geometry from './geometry.vue';
import { itertools, OffsetType, SimplePolygon } from 'geometry-core';
const offset = ref(0);
const offsetSlider = computed({
  get: () => offset.value,
  set: (val) => {
    offset.value = typeof val === 'string' ? parseFloat(val) : val;
  },
});
const offsetStyle = ref<OffsetType>('miter');
const rect = new shapes.Rectangle().outer;
const star = new shapes.Star().outer;
const circ = new shapes.PolyCircle().outer;
const comp = new shapes.Complex().outer;

const rectPref = ref(0);
const starPref = ref(0);
const circPref = ref(0);
const compPref = ref(0);

function prefOffset(geometry: SimplePolygon, pref: Ref<number>) {
  return computed(() => {
    const t0 = performance.now();
    const ret = geometry.offset(offset.value, offsetStyle.value, undefined);
    pref.value = performance.now() - t0;
    return ret;
  });
}

const offseted = {
  rect: prefOffset(rect, rectPref),
  star: prefOffset(star, starPref),
  circ: prefOffset(circ, circPref),
  comp: prefOffset(comp, compPref),
};

function points(ply: SimplePolygon) {
  return Array.from(itertools.map(ply.corners, (v) => v.d())).join(' ');
}

function colorOf(idx: number) {
  // HSL color with fixed saturation and lightness, and hue based on the index
  return `hsl(${(idx * 137.508) % 360}, 70%, 50%)`;
}
</script>
<template>
  <label style="margin: 12px 0; display: flex; align-items: center; gap: 8px">
    Offset Style
    <select
      v-model="offsetStyle"
      style="-webkit-appearance: menulist-button; appearance: multilist-button"
    >
      <option value="miter">miter</option>
      <option value="bevel">bevel</option>
      <option value="square">square</option>
    </select>
  </label>
  <label style="margin: 12px 0; display: flex; align-items: center; gap: 8px">
    Offset Distance
    <input
      type="range"
      v-model="offsetSlider"
      min="-100"
      max="100"
      step="0.1"
    />
    {{ offset }} px
  </label>
  <div class="cards">
    <div class="card">
      <Geometry :geometry="rect" :padding="50">
        <template v-if="offset !== 0">
          <polygon
            v-for="(ply, i) in offseted.rect.value"
            :key="i"
            :points="points(ply)"
            :stroke="colorOf(i)"
            fill="#FF02"
          />
        </template>
      </Geometry>
      <div>Rectangle: {{ rectPref.toFixed(2) }} ms</div>
    </div>
    <div class="card">
      <Geometry :geometry="star" :padding="50">
        <template v-if="offset !== 0">
          <polygon
            v-for="(ply, i) in offseted.star.value"
            :key="i"
            :points="points(ply)"
            :stroke="colorOf(i)"
            fill="#FF02"
          />
        </template>
      </Geometry>
      <div>Star: {{ starPref.toFixed(2) }} ms</div>
    </div>
    <div class="card">
      <Geometry :geometry="circ" :padding="50" :show-corners="false">
        <template v-if="offset !== 0">
          <polygon
            v-for="(ply, i) in offseted.circ.value"
            :key="i"
            :points="points(ply)"
            :stroke="colorOf(i)"
            fill="#FF02"
          />
        </template>
      </Geometry>
      <div>Circle: {{ circPref.toFixed(2) }} ms</div>
    </div>
    <div class="card">
      <Geometry :geometry="comp" :padding="50">
        <template v-if="offset !== 0">
          <polygon
            v-for="(ply, i) in offseted.comp.value"
            :key="i"
            :points="points(ply)"
            :stroke="colorOf(i)"
            fill="#FF02"
          />
        </template>
      </Geometry>
      <div>Arbitrary: {{ compPref.toFixed(2) }} ms</div>
    </div>
  </div>
</template>

<style scoped>
.cards {
  display: flex;
  justify-content: flex-start;
  align-items: flex-start;
  flex-wrap: wrap;
  gap: 10px;
}
.card {
  display: flex;
  flex-direction: column;
  align-items: center;
  max-width: 30ch;
}
</style>
