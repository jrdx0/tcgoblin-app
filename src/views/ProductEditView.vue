<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { RouterLink, useRouter } from 'vue-router'
import { Button, Card, Divider, InputText, Message, Tag, Textarea } from 'primevue'
import AddIcon from '@iconify-vue/material-symbols/add'
import DeleteIcon from '@iconify-vue/material-symbols/delete-outline'
import WarningIcon from '@iconify-vue/material-symbols/warning-outline'
import AppBreadcrumb from '@/components/AppBreadcrumb.vue'
import PageHeader from '@/components/PageHeader.vue'
import { useProduct } from '@/composables/useProduct'
import { useProductsStore } from '@/stores/products.store'
import { formatDateTime, formatMoney, hostOf, lastPrice, storePalette, summarize } from '@/utils/product'

const props = defineProps<{ id: string }>()
const router = useRouter()
const productsStore = useProductsStore()

const { product, loading, error, notFound } = useProduct(() => props.id)

const name = ref('')
const notes = ref('')
const removedIds = ref<string[]>([])
const nameInvalid = computed(() => name.value.trim() === '')

watch(
  product,
  (p, previous) => {
    if (!p || p.id === previous?.id) return
    name.value = p.name
    notes.value = p.notes
    removedIds.value = []
  },
  { immediate: true },
)

const stores = computed(() =>
  (product.value?.stores ?? [])
    .map((store, i) => ({ store, ...storePalette[i % storePalette.length]! }))
    .filter(({ store }) => !removedIds.value.includes(store.id))
    .map(({ store, color, dash }) => {
      const price = lastPrice(store)
      return {
        id: store.id,
        name: hostOf(store.url),
        domain: store.url,
        color,
        dash,
        price: price != null ? formatMoney(price, store.currency) : '—',
        status: store.status === 'failing' ? 'Con fallo' : store.status === 'paused' ? 'Pausada' : 'Al corriente',
        statusTone: store.status === 'failing' ? 'danger' : store.status === 'paused' ? 'secondary' : 'success',
      }
    }),
)
const activeStores = computed(() => stores.value.filter((s) => s.statusTone !== 'secondary').length)
const lastChecked = computed(() => (product.value ? summarize(product.value).lastCheckedAt : undefined))

const confirmingDelete = ref(false)

const breadcrumb = computed(() => [
  { label: 'Productos', route: '/' },
  { label: product.value?.name ?? 'Producto', route: `/products/${props.id}` },
  { label: 'Editar' },
])

function removeStore(storeId: string) {
  removedIds.value = [...removedIds.value, storeId]
}

function save() {
  if (!product.value || nameInvalid.value) return
  product.value.name = name.value.trim()
  product.value.notes = notes.value.trim()
  product.value.stores = product.value.stores.filter((s) => !removedIds.value.includes(s.id))
  router.push(`/products/${props.id}`)
}

function deleteProduct() {
  productsStore.products = productsStore.products.filter((p) => p.id !== props.id)
  router.push('/')
}
</script>

<template>
  <div class="flex max-w-220 flex-col gap-3">
    <AppBreadcrumb :items="breadcrumb" />
    <PageHeader title="Editar producto" description="Cambia el nombre o las notas. El historial de precios no se modifica." />
  </div>

  <Message v-if="error" severity="error" :closable="false">
    <template #icon><WarningIcon height="1rem" /></template>
    <span class="text-sm"><strong>No se pudo cargar el producto.</strong> {{ error }}</span>
  </Message>
  <Message v-else-if="notFound" severity="secondary" :closable="false">
    <span class="text-sm">Este producto no existe o ya fue eliminado.</span>
  </Message>
  <span v-else-if="loading && !product" class="text-sm text-muted-color">Cargando producto…</span>

  <div v-else-if="product" class="flex max-w-220 flex-col gap-5">
    <Card aria-labelledby="t-datos">
      <template #title>
        <h2 id="t-datos" class="m-0 text-lg font-semibold">Datos del producto</h2>
      </template>
      <template #content>
        <div class="flex flex-col gap-5">
          <div class="flex flex-col gap-2">
            <label for="nombre" class="text-sm font-semibold">Nombre del producto</label>
            <InputText id="nombre" v-model="name" :invalid="nameInvalid" aria-describedby="nombre-ayuda" fluid />
            <span
              id="nombre-ayuda"
              class="text-[13px]"
              :class="nameInvalid ? 'text-red-700 dark:text-red-400' : 'text-muted-color'"
            >
              {{
                nameInvalid
                  ? 'Escribe un nombre para el producto.'
                  : 'Usa el mismo nombre en todas las tiendas, por ejemplo el de la caja o el mazo.'
              }}
            </span>
          </div>

          <div class="flex flex-col gap-2">
            <label for="notas" class="text-sm font-semibold">
              Notas <span class="font-normal text-muted-color">(opcional)</span>
            </label>
            <Textarea id="notas" v-model="notes" rows="3" auto-resize fluid />
          </div>

          <Divider />

          <dl class="m-0 flex flex-wrap gap-x-10 gap-y-4">
            <div class="flex flex-col gap-0.5">
              <dt class="text-[13px] text-muted-color">Creado</dt>
              <dd class="m-0 text-sm font-medium">{{ formatDateTime(product.createdAt) }}</dd>
            </div>
            <div class="flex flex-col gap-0.5">
              <dt class="text-[13px] text-muted-color">Tiendas</dt>
              <dd class="m-0 text-sm font-medium">{{ activeStores }} {{ activeStores === 1 ? 'activa' : 'activas' }}</dd>
            </div>
            <div class="flex flex-col gap-0.5">
              <dt class="text-[13px] text-muted-color">Última revisión</dt>
              <dd class="m-0 text-sm font-medium">{{ lastChecked ? formatDateTime(lastChecked) : 'Sin revisar todavía' }}</dd>
            </div>
          </dl>
        </div>
      </template>
    </Card>

    <Card aria-labelledby="t-tiendas">
      <template #title>
        <div class="flex flex-wrap items-center justify-between gap-3">
          <h2 id="t-tiendas" class="m-0 text-lg font-semibold">Tiendas de este producto</h2>
          <Button v-slot="slotProps" as-child severity="secondary" variant="outlined">
            <RouterLink :to="`/urls/new?product=${id}`" :class="slotProps.class"><AddIcon height="1rem" /> Agregar url</RouterLink>
          </Button>
        </div>
      </template>
      <template #subtitle><span class="text-sm">Cada URL aporta su último precio correcto al promedio.</span></template>
      <template #content>
        <ul v-if="stores.length" class="m-0 list-none p-0">
          <li v-for="(store, i) in stores" :key="store.id">
            <Divider v-if="i > 0" />
            <div class="flex flex-wrap items-center justify-between gap-3">
              <div class="flex min-w-0 items-center gap-3">
                <svg width="28" height="10" aria-hidden="true" class="flex-none">
                  <line
                    x1="2" y1="5" x2="26" y2="5"
                    :style="{ stroke: store.color }" stroke-width="3" stroke-linecap="round"
                    :stroke-dasharray="store.dash.join(' ') || undefined"
                  />
                </svg>
                <div class="flex min-w-0 flex-col gap-0.5">
                  <span class="text-[15px] font-semibold">{{ store.name }}</span>
                  <span class="font-mono text-[13px] break-all text-muted-color">{{ store.domain }}</span>
                </div>
              </div>
              <div class="flex flex-wrap items-center gap-3">
                <span class="text-[15px] font-bold tabular-nums">{{ store.price }}</span>
                <Tag :value="store.status" :severity="store.statusTone" rounded />
                <Button v-slot="slotProps" as-child variant="link">
                  <RouterLink :to="`/urls/new?product=${id}`" :class="slotProps.class">Editar selector</RouterLink>
                </Button>
                <Button
                  :aria-label="`Quitar ${store.name} del producto`"
                  severity="secondary"
                  variant="outlined"
                  icon-only
                  @click="removeStore(store.id)"
                >
                  <DeleteIcon height="1rem" />
                </Button>
              </div>
            </div>
          </li>
        </ul>
        <span v-else class="text-sm text-muted-color">Este producto todavía no tiene URLs.</span>
      </template>
    </Card>

    <div class="flex flex-wrap justify-between gap-2">
      <Button v-slot="slotProps" as-child severity="secondary" variant="outlined">
        <RouterLink :to="`/products/${id}`" :class="slotProps.class">Cancelar</RouterLink>
      </Button>
      <Button :disabled="nameInvalid" @click="save">Guardar cambios</Button>
    </div>

    <Card aria-labelledby="t-eliminar">
      <template #title>
        <div class="flex flex-wrap items-center justify-between gap-4">
          <h2 id="t-eliminar" class="m-0 text-lg font-semibold text-red-700 dark:text-red-400">Eliminar producto</h2>
          <Button v-if="!confirmingDelete" severity="danger" variant="outlined" @click="confirmingDelete = true">
            <DeleteIcon height="1rem" /> Eliminar producto
          </Button>
        </div>
      </template>
      <template #subtitle>
        <span class="text-sm">
          Se borran sus {{ stores.length }} URLs y todo su historial de precios. Las alertas ya enviadas se conservan en el
          historial de alertas.
        </span>
      </template>
      <template v-if="confirmingDelete" #content>
        <Message severity="error" :closable="false" role="alertdialog" aria-labelledby="confirmar-titulo">
          <template #icon><WarningIcon height="1rem" /></template>
          <div class="flex flex-col gap-3 text-sm">
            <div class="flex flex-col gap-1">
              <strong id="confirmar-titulo">¿Eliminar {{ product.name }}?</strong>
              <span>
                Esta acción no se puede deshacer. Si solo quieres dejar de revisarlo, pausa sus URLs en lugar de eliminarlo.
              </span>
            </div>
            <div class="flex flex-wrap gap-2">
              <Button severity="danger" @click="deleteProduct">Sí, eliminar producto</Button>
              <Button severity="secondary" variant="outlined" @click="confirmingDelete = false">No, conservarlo</Button>
            </div>
          </div>
        </Message>
      </template>
    </Card>
  </div>
</template>
