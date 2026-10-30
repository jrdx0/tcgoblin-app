<script setup lang="ts">
import { Card } from 'primevue'

defineProps<{
  label: string
  value: string | number
  note: string
  tone?: 'default' | 'success' | 'danger'
}>()
</script>

<template>
  <Card class="flex-[1_1_200px] max-lg:flex-[0_0_240px] max-lg:snap-start">
    <template #content>
      <div class="flex flex-col gap-1">
        <span class="text-xs font-medium text-muted-color dark:text-surface-300">{{ label }}</span>
        <span
          class="text-[26px] leading-tight font-bold tabular-nums lg:text-3xl"
          :class="{ 'text-green-700 dark:text-green-500': tone === 'success', 'text-red-700 dark:text-red-400': tone === 'danger' }"
        >
          {{ value }}
        </span>
        <span class="text-[13px] text-muted-color">{{ note }}</span>
      </div>
    </template>
  </Card>
</template>
