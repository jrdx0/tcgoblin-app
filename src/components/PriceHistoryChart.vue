<script setup lang="ts">
import { computed } from 'vue'

export interface PriceSeries {
  label: string
  color: string
  dash: number[]
  values: (number | null)[]
}

const props = defineProps<{
  days: string[]
  series: PriceSeries[]
  average: number
  min: number
  max: number
  step: number
  description: string
  compact?: boolean
}>()

const width = computed(() => (props.compact ? 360 : 1000))
const height = computed(() => (props.compact ? 220 : 300))
const pad = computed(() =>
  props.compact ? { top: 14, right: 16, bottom: 30, left: 44 } : { top: 16, right: 16, bottom: 32, left: 64 },
)

const x = (i: number) =>
  pad.value.left +
  (props.days.length > 1 ? (i / (props.days.length - 1)) * (width.value - pad.value.left - pad.value.right) : 0)
const y = (v: number) =>
  pad.value.top + ((props.max - v) / (props.max - props.min)) * (height.value - pad.value.top - pad.value.bottom)

const ticks = computed(() => {
  const out: number[] = []
  for (let v = props.max; v >= props.min; v -= props.step) out.push(v)
  return props.compact ? out.filter((_, i) => i % 2 === 0) : out
})

function steppedPath(values: (number | null)[]) {
  let d = ''
  let prev: number | null = null
  values.forEach((v, i) => {
    if (v == null) {
      prev = null
      return
    }
    d += prev == null ? `M${x(i)},${y(v)}` : `H${x(i)}V${y(v)}`
    prev = v
  })
  return d
}

const lines = computed(() => props.series.map((s) => ({ ...s, d: steppedPath(s.values) })))
const labelEvery = computed(() =>
  Math.max(1, props.compact ? Math.ceil((props.days.length - 1) / 2) : Math.ceil(props.days.length / 6)),
)
const money = (v: number) => `$${v.toLocaleString('es-MX')}`
</script>

<template>
  <div class="flex flex-col gap-3">
    <svg
      :viewBox="`0 0 ${width} ${height}`"
      width="100%"
      role="img"
      :aria-label="description"
      class="block"
      :class="compact ? 'text-[11px]' : 'text-[13px]'"
    >
      <g v-for="t in ticks" :key="t">
        <line :x1="pad.left" :x2="width - pad.right" :y1="y(t)" :y2="y(t)" class="stroke-surface-200 dark:stroke-surface-700" />
        <text :x="pad.left - 8" :y="y(t) + 4" text-anchor="end" class="fill-current text-muted-color">{{ money(t) }}</text>
      </g>
      <template v-for="(day, i) in days" :key="day">
        <text
          v-if="i % labelEvery === 0 || i === days.length - 1"
          :x="x(i)"
          :y="height - 8"
          text-anchor="middle"
          class="fill-current text-muted-color"
        >
          {{ day }}
        </text>
      </template>
      <line
        :x1="pad.left" :x2="width - pad.right" :y1="y(average)" :y2="y(average)"
        stroke-width="1.5" stroke-dasharray="3 6" stroke-linecap="round"
        class="stroke-surface-400"
      />
      <path
        v-for="line in lines"
        :key="line.label"
        :d="line.d"
        fill="none"
        :style="{ stroke: line.color }"
        :stroke-width="compact ? 2.5 : 3"
        stroke-linejoin="round"
        :stroke-dasharray="line.dash.join(' ') || undefined"
      />
    </svg>

    <ul class="m-0 flex list-none flex-wrap gap-x-6 gap-y-2 p-0 text-[13px]">
      <li v-for="s in series" :key="s.label" class="flex items-center gap-2 dark:text-surface-200">
        <svg width="28" height="10" aria-hidden="true">
          <line x1="2" y1="5" x2="26" y2="5" :style="{ stroke: s.color }" stroke-width="3" stroke-linecap="round" :stroke-dasharray="s.dash.join(' ') || undefined" />
        </svg>
        {{ s.label }}
      </li>
      <li class="flex items-center gap-2 text-muted-color">
        <svg width="28" height="10" aria-hidden="true">
          <line x1="2" y1="5" x2="26" y2="5" stroke-width="1.5" stroke-dasharray="3 6" stroke-linecap="round" class="stroke-surface-400" />
        </svg>
        Promedio · {{ money(average) }}
      </li>
    </ul>
  </div>
</template>
