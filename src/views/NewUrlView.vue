<script setup lang="ts">
import { watch } from 'vue'
import { useRoute } from 'vue-router'
import { storeToRefs } from 'pinia'
import { Step, StepList, StepPanel, StepPanels, Stepper } from 'primevue'
import AppBreadcrumb from '@/components/AppBreadcrumb.vue'
import PageHeader from '@/components/PageHeader.vue'
import PageStep from '@/components/new-url/PageStep.vue'
import PriceStep from '@/components/new-url/PriceStep.vue'
import ConfirmStep from '@/components/new-url/ConfirmStep.vue'
import { useNewUrlStore } from '@/stores/newUrl.store'
import { useProductsStore } from '@/stores/products.store'

const route = useRoute()
const store = useNewUrlStore()
const productsStore = useProductsStore()
const { step } = storeToRefs(store)

function start() {
  const product = typeof route.query.product === 'string' ? route.query.product : undefined
  store.reset(product === 'new' ? { productMode: 'new' } : { productId: product })
  productsStore.saveError = null
}
start()
watch(() => route.query.product, start)

const breadcrumb = [{ label: 'Productos', route: '/' }, { label: 'Nuevo' }]
</script>

<template>
  <div class="flex flex-col gap-3">
    <AppBreadcrumb :items="breadcrumb" />
    <PageHeader title="Nuevo" />
  </div>

  <Stepper v-model:value="step" linear aria-label="Pasos para agregar una tienda">
    <StepList class="max-w-xl">
      <Step :value="1">Página y producto</Step>
      <Step :value="2">Elegir el precio</Step>
      <Step :value="3">Confirmar</Step>
    </StepList>
    <StepPanels>
      <StepPanel v-slot="{ activateCallback }" :value="1">
        <PageStep @next="activateCallback(2)" />
      </StepPanel>
      <StepPanel v-slot="{ activateCallback }" :value="2">
        <PriceStep @back="activateCallback(1)" @next="activateCallback(3)" />
      </StepPanel>
      <StepPanel v-slot="{ activateCallback }" :value="3">
        <ConfirmStep @go="activateCallback" @restart="start" />
      </StepPanel>
    </StepPanels>
  </Stepper>
</template>
