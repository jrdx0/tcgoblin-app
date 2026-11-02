<script setup lang="ts">
import { watch } from 'vue'
import { storeToRefs } from 'pinia'
import { useInterfaceStore } from '@/stores/interface.store'

const props = defineProps<{ title: string }>()

const interfaceStore = useInterfaceStore()
const { isMobile } = storeToRefs(interfaceStore)
watch(
  () => props.title,
  (title) => (interfaceStore.title = title),
  { immediate: true },
)
</script>

<template>
  <header class="flex flex-wrap items-center justify-between gap-4">
    <div class="flex flex-col gap-1">
      <h1 class="m-0 hidden text-[28px] leading-tight font-bold tracking-tight lg:block">{{ title }}</h1>
    </div>
    <Teleport v-if="$slots.actions" defer to="#mobile-header-actions" :disabled="!isMobile">
      <div class="flex flex-wrap gap-2">
        <slot name="actions" />
      </div>
    </Teleport>
  </header>
</template>
