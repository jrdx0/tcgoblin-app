<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { RouterLink } from 'vue-router'
import { storeToRefs } from 'pinia'
import { Button, Card, IconField, InputIcon, InputText, Message, RadioButton, SelectButton, Textarea } from 'primevue'
import SearchIcon from '@iconify-vue/material-symbols/search'
import CheckCircleIcon from '@iconify-vue/material-symbols/check-circle-outline'
import CancelIcon from '@iconify-vue/material-symbols/cancel-outline'
import ProgressIcon from '@iconify-vue/material-symbols/progress-activity'
import { useNewUrlStore, type ProductMode } from '@/stores/newUrl.store'
import { useProductsStore } from '@/stores/products.store'

const emit = defineEmits<{ next: [] }>()

const store = useNewUrlStore()
const { url, pageState, pageError, productMode, productId, newName, notes, host, hasProduct } = storeToRefs(store)

const modeOptions: { label: string; value: ProductMode }[] = [
  { label: 'Producto existente', value: 'existing' },
  { label: 'Producto nuevo', value: 'new' },
]

const productsStore = useProductsStore()
const { products, loading: loadingProducts, loadError } = storeToRefs(productsStore)

onMounted(async () => {
  if (!productsStore.loaded) await productsStore.fetchProducts()
  if (!productId.value) productId.value = products.value[0]?.id
})

const search = ref('')
const filtered = computed(() => {
  const term = search.value.trim().toLowerCase()
  return term ? products.value.filter((p) => p.name.toLowerCase().includes(term)) : products.value
})

const loading = computed(() => pageState.value === 'loading')
const ctaLabel = computed(() =>
  loading.value ? 'Abriendo la página…' : pageState.value === 'error' ? 'Reintentar' : 'Abrir página y continuar',
)

async function submit() {
  if (await store.openPage()) emit('next')
}
</script>

<template>
  <div class="flex max-w-190 flex-col gap-5">
    <Card aria-labelledby="t-url">
      <template #title>
        <h2 id="t-url" class="m-0 text-lg font-semibold">¿Qué página quieres vigilar?</h2>
      </template>
      <template #subtitle><span class="text-sm">Pega la dirección de la página donde se ve el precio del producto.</span></template>
      <template #content>
        <div class="flex flex-col gap-4">
          <div class="flex flex-col gap-2">
            <label for="url" class="text-sm font-semibold">URL de la página</label>
            <InputText
              id="url"
              v-model="url"
              type="url"
              placeholder="https://"
              spellcheck="false"
              :invalid="pageState === 'error'"
              fluid
              @update:model-value="pageState = 'idle'"
            />
          </div>

          <Message v-if="loading" severity="secondary" :closable="false" role="status">
            <template #icon><ProgressIcon height="1rem" class="animate-spin" /></template>
            <span class="text-sm">Abriendo la página en el servidor…</span>
          </Message>
          <Message v-else-if="pageState === 'error'" severity="error" :closable="false">
            <template #icon><CancelIcon height="1rem" /></template>
            <span class="text-sm"><strong>No se pudo abrir la página.</strong> {{ pageError ?? 'Revisa que la URL sea correcta o inténtalo de nuevo.' }}</span>
          </Message>
          <Message v-else-if="host" severity="success" :closable="false" role="status">
            <template #icon><CheckCircleIcon height="1rem" /></template>
            <span class="text-sm">
              <strong>Tienda detectada: {{ host }}.</strong> La página se abre en el servidor y, en el siguiente paso,
              verás una captura para elegir el precio.
            </span>
          </Message>
        </div>
      </template>
    </Card>

    <Card aria-labelledby="t-prod">
      <template #title>
        <h2 id="t-prod" class="m-0 text-lg font-semibold">¿A qué producto pertenece?</h2>
      </template>
      <template #subtitle><span class="text-sm">Las URLs del mismo producto en distintas tiendas se comparan entre sí.</span></template>
      <template #content>
        <div class="flex flex-col gap-4">
          <SelectButton
            v-model="productMode"
            :options="modeOptions"
            option-label="label"
            option-value="value"
            :allow-empty="false"
            aria-label="Tipo de producto"
            class="self-start"
          />

          <div v-if="productMode === 'existing'" class="flex flex-col gap-3">
            <IconField>
              <InputIcon><SearchIcon height="1rem" /></InputIcon>
              <InputText v-model="search" type="search" placeholder="Buscar producto" aria-label="Buscar producto" fluid />
            </IconField>
            <div role="radiogroup" aria-label="Productos existentes" class="flex flex-col gap-2">
              <label
                v-for="p in filtered"
                :key="p.id"
                :for="`producto-${p.id}`"
                class="flex cursor-pointer items-center gap-3 rounded-border border p-3.5 transition-colors hover:bg-emphasis"
                :class="productId === p.id ? 'border-primary' : 'border-surface'"
              >
                <RadioButton v-model="productId" :input-id="`producto-${p.id}`" name="producto" :value="p.id" />
                <span class="flex-1 text-sm font-semibold">{{ p.name }}</span>
                <span class="text-[13px] text-muted-color">{{ p.stores.length }} {{ p.stores.length === 1 ? 'tienda' : 'tiendas' }}</span>
              </label>
              <span v-if="loadingProducts" class="text-sm text-muted-color">Cargando productos…</span>
              <span v-else-if="loadError" class="text-sm text-red-700 dark:text-red-400">
                No se pudieron cargar los productos: {{ loadError }}
              </span>
              <span v-else-if="!products.length" class="text-sm text-muted-color">
                Todavía no hay productos. Elige «Producto nuevo».
              </span>
              <span v-else-if="!filtered.length" class="text-sm text-muted-color">Ningún producto coincide con la búsqueda.</span>
            </div>
          </div>

          <div v-else class="flex flex-col gap-4">
            <div class="flex flex-col gap-2">
              <label for="nombre" class="text-sm font-semibold">Nombre del producto</label>
              <InputText id="nombre" v-model="newName" placeholder="Ej. Booster box GD03" fluid />
              <span class="text-[13px] text-muted-color">
                Usa el mismo nombre en todas las tiendas, por ejemplo el de la caja o el mazo.
              </span>
            </div>
            <div class="flex flex-col gap-2">
              <label for="notas" class="text-sm font-semibold">
                Notas <span class="font-normal text-muted-color">(opcional)</span>
              </label>
              <Textarea id="notas" v-model="notes" rows="3" auto-resize fluid />
            </div>
          </div>
        </div>
      </template>
    </Card>

    <div class="flex flex-wrap justify-between gap-2">
      <Button v-slot="slotProps" as-child severity="secondary" variant="outlined">
        <RouterLink to="/" :class="slotProps.class">Cancelar</RouterLink>
      </Button>
      <Button :disabled="loading || !url.trim() || !hasProduct" @click="submit">{{ ctaLabel }}</Button>
    </div>
  </div>
</template>
