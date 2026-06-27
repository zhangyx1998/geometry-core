<script setup lang="ts">
import { computed } from 'vue';
import { BBox, Geometry, Shape, SimpleShape, Vec2 } from 'geometry-core';
import stackView from 'geometry-core/util/stack-view';
import GeometryView from './geometry.vue';
import * as shapes from './shapes';
import perf from './pref';
import local from 'util/local';

function makeShape(type: ShapeType) {
  const center = new Vec2([0, 0]);
  const radius = 32;
  switch (type) {
    case 'rect':
      return new shapes.Rectangle(center.sub(radius), center.add(radius)).outer;
    case 'star':
      return new shapes.Star({ center, radius: radius * 1.4 }).outer;
    case 'circ':
      return new shapes.PolyCircle(center, radius * 1.2).outer;
    case 'comp':
      return new shapes.Complex(center, radius * 2).outer;
  }
}

type BooleanOp = 'union' | 'intersection' | 'subtraction' | 'xor';
type ShapeType = 'rect' | 'star' | 'circ' | 'comp';
const op = local.page<BooleanOp>('operation', 'intersection');
const shiftX = local.page<number>('shiftX', 20);
const shiftXSlider = computed({
  get: () => shiftX.value,
  set: (val) => {
    shiftX.value = typeof val === 'string' ? parseFloat(val) : val;
  },
});
const shiftY = local.page<number>('shiftY', 20);
const shiftYSlider = computed({
  get: () => shiftY.value,
  set: (val) => {
    shiftY.value = typeof val === 'string' ? parseFloat(val) : val;
  },
});
const offset = local.page<number>('offset', 0);
const offsetSlider = computed({
  get: () => offset.value,
  set: (val) => {
    offset.value = typeof val === 'string' ? parseFloat(val) : val;
  },
});

const typeA = local.page<ShapeType>('typeA', 'circ');
const typeB = local.page<ShapeType>('typeB', 'circ');
const shapeA = computed(() => makeShape(typeA.value));
const shapeB = computed(() => makeShape(typeB.value));

function applyOffset(ply: ReturnType<typeof makeShape>, o: number) {
  if (o > 0) {
    return new SimpleShape(ply.offset(o, 'miter', 2)[0], [ply.reversed]);
  }
  if (o < 0) {
    return new SimpleShape(ply, ply.reversed.offset(-o));
  }
  return new SimpleShape(ply);
}

const offseted = computed(() => {
  const o = offset.value;
  const [A, B] = [shapeA.value, shapeB.value];
  return {
    A: perf(applyOffset, 'offset(A)')(A, o),
    B: perf(applyOffset, 'offset(B)')(B, o),
  };
});

const translated = computed(() => {
  const { A, B } = offseted.value;
  const v = new Vec2([shiftX.value, shiftY.value]);
  return {
    A: perf(() => A.translate(v.mul(-1)), 'translate(A)')(),
    B: perf(() => B.translate(v), 'translate(B)')(),
  };
});

const translatedPathData = computed(() => {
  const { A, B } = translated.value;
  return {
    A: A.d(),
    B: B.d(),
  };
});

const minBox = new BBox(new Vec2([-100, -100]), new Vec2([100, 100]));

function tryInvoke<T>(fn: () => T): T | {} {
  try {
    return fn();
  } catch (e) {
    if (import.meta.env.DEV) console.error('Error during boolean operation:', e);
    return {};
  }
}

const result = computed(() => {
  const { A, B } = translated.value;
  const bbox = BBox.merge([minBox, A.bbox, B.bbox]);
  const BooleanOperation = {
    union() {
      return A.union(B);
    },
    intersection() {
      return A.intersection(B);
    },
    subtraction() {
      return A.subtraction(B);
    },
    xor() {
      return A.xor(B);
    },
  }[op.value];
  const intersections = A.intersections(B);
  const ret = stackView<Geometry>(
    {
      bbox,
      corners: intersections.points,
    },
    tryInvoke(perf(BooleanOperation, `boolean(${op.value})`)),
  );
  return ret;
});

const areaOut = computed(() => (result.value as Shape).area || 0);
</script>

<template>
  <div style="display: flex; align-items: center; gap: 2ch">
    <label>
      Operation
      <select v-model="op">
        <option value="union">union</option>
        <option value="intersection">intersection</option>
        <option value="subtraction">subtraction (A - B)</option>
        <option value="xor">xor</option>
      </select>
    </label>
    <label>
      Shape A
      <select v-model="typeA">
        <option value="rect">rectangle</option>
        <option value="star">star</option>
        <option value="circ">circle</option>
        <option value="comp">complex</option>
      </select>
    </label>
    <label>
      Shape B
      <select v-model="typeB">
        <option value="rect">rectangle</option>
        <option value="star">star</option>
        <option value="circ">circle</option>
        <option value="comp">complex</option>
      </select>
    </label>
  </div>

  <label>
    Shift (x)
    <input type="range" v-model="shiftXSlider" min="-60" max="60" step="0.1" />
    {{ shiftX }} px
  </label>

  <label>
    Shift (y)
    <input type="range" v-model="shiftYSlider" min="-100" max="100" step="0.1" />
    {{ shiftY }} px
  </label>

  <label @keydown.backspace.prevent="offset = 0">
    Offset
    <input type="range" v-model="offsetSlider" min="-50" max="50" step="0.1" />
    {{ offset }} px
  </label>

  <div class="card">
    <GeometryView
      :geometry="result"
      :padding="10"
      stroke="var(--vp-c-green-1)"
      fill="green"
    >
      <path :d="translatedPathData.A" class="shape-a infill" />
      <path :d="translatedPathData.B" class="shape-b infill" />
      <path :d="translatedPathData.A" class="shape-a outline" />
      <path :d="translatedPathData.B" class="shape-b outline" />
    </GeometryView>
    <div>{{ op }} area: {{ areaOut.toFixed(2) }}</div>
  </div>
</template>

<style scoped>
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
