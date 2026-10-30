<script setup lang="ts">
import { RouterLink } from 'vue-router'
import { Breadcrumb } from 'primevue'

defineProps<{ items: { label: string; route?: string }[] }>()
</script>

<template>
  <Breadcrumb :model="items" aria-label="Ruta">
    <template #item="{ item, label }">
      <RouterLink v-if="item.route" :to="item.route" class="p-breadcrumb-item-link text-sm">{{ label }}</RouterLink>
      <span v-else class="p-breadcrumb-item-link text-sm font-semibold" aria-current="page">{{ label }}</span>
    </template>
  </Breadcrumb>
</template>
