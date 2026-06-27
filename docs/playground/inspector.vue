<script setup lang="ts">
import {
  ref,
  computed,
  useTemplateRef,
  watch,
  onMounted,
  onUnmounted,
} from 'vue';
import { BBox, Line2D, Ray2D, Vec2 } from 'geometry-core';
import GeometryView from './geometry.vue';
import local from 'util/local';
const editor = useTemplateRef('editor');
const width = local.page('line-width', 1.0);
const text = local.page('content', '');
const focus = ref(0);
const selection = ref<{ i: number; n: number } | null>(null);

function updateSelection() {
  const sel = document.getSelection();
  if (!sel || sel.rangeCount === 0) {
    selection.value = null;
    return;
  }
  const range = sel.getRangeAt(0);
  if (!editor.value || !editor.value.contains(range.commonAncestorContainer)) {
    selection.value = null;
    return;
  }
  // Calculate the index and length of the selection within the editor
  const preSelectionRange = range.cloneRange();
  preSelectionRange.selectNodeContents(editor.value);
  preSelectionRange.setEnd(range.startContainer, range.startOffset);
  const start = preSelectionRange.toString().length;
  const length = range.toString().length;
  selection.value = { i: start, n: length };
}

watch(selection, (sel) => {
  if (!sel) return;
  const { i, n } = sel;
  for (const { i: li, n: ln } of lines.value) {
    if (i >= li && i < li + ln) {
      focus.value = lines.value.findIndex((l) => l.i === li) + 1;
      return;
    }
  }
  focus.value = 0;
});

onMounted(() => {
  document.addEventListener('selectionchange', updateSelection);
});
onUnmounted(() => {
  document.removeEventListener('selectionchange', updateSelection);
});
watch(
  editor,
  (e) => {
    if (e) e.innerText = text.value;
  },
  { immediate: true },
);
function updateContent(e: InputEvent) {
  text.value = (e.target as HTMLElement).innerText;
}
const lines = computed(() => {
  const t = text.value;
  const result: { s: Line2D; i: number; n: number }[] = [];
  const rSegment = /M\s*([+-]?[\d\.\,\s]+\s*)L\s*([+-]?[\d\.\,\s]+)/g;
  let match;
  while ((match = rSegment.exec(t)) !== null) {
    const [_, a, b] = match;
    result.push({
      s: new Line2D(Vec2.parse(a), Vec2.parse(b), undefined),
      i: match.index,
      n: _.length,
    });
  }
  if (import.meta.env.DEV) console.debug('Parsed lines:', result);
  return result;
});
const bbox = computed(() =>
  BBox.merge(
    lines.value.map((l) => l.s.bbox),
    () => new BBox(Vec2.origin, Vec2.origin.add(10)),
  ),
);
function arrow(line: Line2D) {
  const ray = new Ray2D(line.A, line.delta.unit);
  const headSize = Math.min(line.len * 0.4, 1);
  return ray.d(undefined, line.len, headSize, 30);
}
</script>

<template>
  <div class="card">
    <GeometryView
      :geometry="{ bbox }"
      :padding="Math.min(...bbox.size) * 0.2"
      stroke="var(--vp-c-green-1)"
      fill="green"
      :style="{ '--w': width }"
    >
      <template v-for="({ s }, i) in lines" :key="i"
        ><line
          v-if="i + 1 !== focus"
          :x1="s.A.x"
          :y1="s.A.y"
          :x2="s.B.x"
          :y2="s.B.y"
        />
        <path v-else :d="arrow(s)" />
      </template>
    </GeometryView>
  </div>
  <label>
    Highlight Entity:
    <input type="range" v-model.number="focus" min="0" :max="lines.length" />
    {{ focus ? focus : 'None' }}
  </label>
  <label>
    Line Width:
    <input type="range" v-model.number="width" min="0" max="2" step="0.02" />
    {{ width ? width : 'None' }}
  </label>
  <pre
    ref="editor"
    style="
      width: 100%;
      overflow: auto;
      min-height: 10em;
      max-height: 20em;
      background-color: #8881;
      border-radius: 8px;
      padding: 16px;
      font-family: monospace;
      white-space: pre-wrap;
    "
    contenteditable
    placeholder="Enter path data-like code to inspect"
    @input="updateContent"
  ></pre>
</template>

<style scoped>
* {
  stroke-width: var(--w);
}
line {
  stroke: var(--vp-c-green-1);
  opacity: 0.6;
}
path {
  stroke-width: calc(var(--w) * 1.6);
  stroke: var(--vp-c-red-1);
  fill: none;
  opacity: 0.6;
}
label {
  display: flex;
  gap: 1ch;
  align-items: center;
}
</style>
