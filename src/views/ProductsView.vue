<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { RouterLink } from 'vue-router'
import { storeToRefs } from 'pinia'
import { createReusableTemplate } from '@vueuse/core'
import { Button, Column, DataTable, IconField, InputIcon, InputText, Message, SelectButton, Tag } from 'primevue'
import AddIcon from '@iconify-vue/material-symbols/add'
import SearchIcon from '@iconify-vue/material-symbols/search'
import WarningIcon from '@iconify-vue/material-symbols/warning-outline'
import ChevronRightIcon from '@iconify-vue/material-symbols/chevron-right'
import RefreshRoundedIcon from '@iconify-vue/material-symbols/refresh-rounded'
import StarIcon from '@iconify-vue/material-symbols/star'
import StarOutlineIcon from '@iconify-vue/material-symbols/star-outline'
import PageHeader from '@/components/PageHeader.vue'
import { useInterfaceStore } from '@/stores/interface.store'
import { useProductsStore } from '@/stores/products.store'
import { describeError, formatDateTime, formatMoney, hostOf, summarize } from '@/utils/product'

type Filter = 'all' | 'offer' | 'failure'

const filterOptions: { label: string; value: Filter }[] = [
  { label: 'Todos', value: 'all' },
  { label: 'En oferta', value: 'offer' },
  { label: 'Con fallo', value: 'failure' },
]

const productsStore = useProductsStore()
const { products, loading, loadError, favoritePending, favoriteError } = storeToRefs(productsStore)
const { isMobile } = storeToRefs(useInterfaceStore())

const [DefineToolbar, ReuseToolbar] = createReusableTemplate()

onMounted(() => productsStore.fetchProducts())

const search = ref('')
const filter = ref<Filter>('all')

const allRows = computed(() =>
  products.value.map((product) => {
    const s = summarize(product)
    const diff = s.cheapest && s.average != null ? s.cheapest.price - s.average : undefined
    const pct = diff != null && s.average ? (diff / s.average) * 100 : undefined

    return {
      id: product.id,
      name: product.name,
      isFavorite: product.isFavorite,
      storesLabel: `${s.storeCount} ${s.storeCount === 1 ? 'tienda' : 'tiendas'}`,
      average: s.average != null ? formatMoney(s.average, s.currency) : '—',
      averageNote: s.pricedCount === 1 ? 'Solo 1 URL con precio' : s.pricedCount === 0 ? 'Sin lecturas todavía' : '',
      cheapestHost: s.cheapest ? hostOf(s.cheapest.store.url) : '—',
      cheapestPrice: s.cheapest ? formatMoney(s.cheapest.price, s.cheapest.store.currency) : '',
      diff:
        diff != null && pct != null && diff < 0
          ? `↓ −${formatMoney(Math.abs(diff), s.currency)} · −${Math.abs(pct).toFixed(1)}%`
          : '—',
      isBelow: diff != null && diff < 0,
      offer: s.pricedCount > 1 ? `${s.offerCount} de ${s.pricedCount}` : '—',
      hasOfferData: s.pricedCount > 1,
      offerTone: s.offerCount > 0 ? 'success' : 'secondary',
      status:
        s.failingCount > 0
          ? `${s.failingCount} con fallo`
          : s.pausedCount > 0
            ? `${s.pausedCount} ${s.pausedCount === 1 ? 'pausada' : 'pausadas'}`
            : 'Al corriente',
      statusTone: s.failingCount > 0 ? 'danger' : s.pausedCount > 0 ? 'secondary' : 'success',
      last: s.lastCheckedAt ? `Revisado ${formatDateTime(s.lastCheckedAt)}` : 'Sin revisar todavía',
      hasOffer: s.offerCount > 0,
      hasFailure: s.failingCount > 0,
    }
  }),
)

const rows = computed(() => {
  const term = search.value.trim().toLowerCase()
  return allRows.value
    .filter((p) => {
      if (term && !p.name.toLowerCase().includes(term)) return false
      if (filter.value === 'offer') return p.hasOffer
      if (filter.value === 'failure') return p.hasFailure
      return true
    })
    .sort((a, b) => Number(b.isFavorite) - Number(a.isFavorite) || a.name.localeCompare(b.name, 'es'))
})

const lastCheck = computed(() =>
  products.value
    .map((p) => summarize(p).lastCheckedAt)
    .filter((d): d is string => !!d)
    .sort()
    .at(-1),
)

const firstFailure = computed(() => {
  for (const product of products.value) {
    const store = product.stores.find((s) => s.status === 'failing')
    if (store) return { product, store }
  }
  return undefined
})
</script>

<template>
  <PageHeader
    title="Productos"
    :description="`${lastCheck ? ` Última revisión diaria: ${formatDateTime(lastCheck)}` : ''}`"
  >
    <template #actions>
      <Button v-slot="slotProps" as-child variant="text">
        <RouterLink to="/urls/new?product=new" :class="slotProps.class">
          <AddIcon height="1.2rem" />
          <span v-if="!isMobile"> Nuevo</span>
        </RouterLink>
      </Button>
    </template>
  </PageHeader>

  <Message v-if="loadError" severity="error" :closable="false">
    <template #icon><WarningIcon height="1rem" /></template>
    <div class="flex flex-wrap items-center gap-3 text-sm">
      <span class="flex-[1_1_280px]"><strong>No se pudieron cargar los productos.</strong> {{ loadError }}</span>
      <Button severity="danger" variant="outlined" size="small" :disabled="loading" @click="productsStore.fetchProducts()">
        Reintentar
      </Button>
    </div>
  </Message>

  <Message v-if="firstFailure" severity="error" :closable="false">
    <template #icon><WarningIcon height="1rem" /></template>
    <div class="flex flex-wrap items-center gap-3 text-sm">
      <span class="flex-[1_1_280px]">
        <strong class="font-semibold">{{ hostOf(firstFailure.store.url) }}</strong> tiene fallo en
        {{ firstFailure.product.name }}<template v-if="firstFailure.store.lastError">
          desde el {{ formatDateTime(firstFailure.store.lastError.since) }}:
          {{ describeError(firstFailure.store.lastError.reason) }}</template>.
      </span>
      <RouterLink :to="`/products/${firstFailure.product.id}`" class="font-semibold text-inherit underline">
        Revisar selector
      </RouterLink>
    </div>
  </Message>

  <Message v-if="favoriteError" severity="error" :closable="false">
    <template #icon><WarningIcon height="1rem" /></template>
    <span class="text-sm"><strong>No se pudo actualizar el favorito.</strong> {{ favoriteError }}</span>
  </Message>

  <DefineToolbar>
    <div class="flex flex-wrap items-center justify-between gap-3">
      <IconField class="min-w-[220px] flex-[1_1_100%] lg:flex-[0_1_300px]">
        <InputIcon><SearchIcon height="1rem" /></InputIcon>
        <InputText v-model="search" type="search" placeholder="Buscar producto" aria-label="Buscar producto" fluid />
      </IconField>
      <div class="flex items-center gap-2 justify-between lg:justify-end w-full lg:w-auto">
        <SelectButton
          v-model="filter"
          :options="filterOptions"
          option-label="label"
          option-value="value"
          :allow-empty="false"
          aria-label="Filtrar productos"
        />
        <Button
          severity="secondary"
          variant="text"
          @click="productsStore.fetchProducts()"
        >
          <RefreshRoundedIcon height="1rem" />
        </Button>
      </div>
    </div>
  </DefineToolbar>

  <section v-if="isMobile" aria-label="Lista de productos" class="flex flex-col gap-3">
    <ReuseToolbar />

    <ul v-if="rows.length" class="m-0 flex list-none flex-col gap-3 p-0">
      <li
        v-for="data in rows"
        :key="data.id"
        class="relative flex flex-col gap-4 rounded-xl border border-surface bg-(--p-content-background) p-4"
      >
        <div class="flex items-center gap-2">
          <Button
            severity="secondary"
            variant="text"
            icon-only
            class="relative z-10 shrink-0"
            :aria-label="data.isFavorite ? `Quitar ${data.name} de favoritos` : `Marcar ${data.name} como favorito`"
            :aria-pressed="data.isFavorite"
            :disabled="favoritePending.includes(data.id)"
            @click="productsStore.setFavorite(data.id, !data.isFavorite)"
          >
            <StarIcon v-if="data.isFavorite" height="1.25rem" class="text-yellow-500" />
            <StarOutlineIcon v-else height="1.25rem" class="text-muted-color" />
          </Button>
          <div class="flex min-w-0 flex-1 flex-col gap-0.5">
            <RouterLink
              :to="`/products/${data.id}`"
              class="truncate text-base font-semibold text-color no-underline after:absolute after:inset-0 after:rounded-xl"
            >
              {{ data.name }}
            </RouterLink>
            <span class="text-[13px] text-muted-color">{{ data.storesLabel }}</span>
          </div>
          <ChevronRightIcon height="1.25rem" class="shrink-0 text-muted-color" aria-hidden="true" />
        </div>

        <dl class="m-0 grid grid-cols-2 gap-4">
          <div class="flex min-w-0 flex-col gap-0.5">
            <dt class="text-xs text-muted-color">Promedio</dt>
            <dd class="m-0 text-xl font-bold tabular-nums">{{ data.average }}</dd>
            <dd v-if="data.averageNote" class="m-0 text-xs text-muted-color">{{ data.averageNote }}</dd>
          </div>
          <div class="flex min-w-0 flex-col gap-0.5">
            <dt class="text-xs text-muted-color">Más barata</dt>
            <dd class="m-0 text-xl font-bold tabular-nums">{{ data.cheapestPrice || '—' }}</dd>
            <dd v-if="data.cheapestPrice" class="m-0 truncate text-sm">{{ data.cheapestHost }}</dd>
          </div>
        </dl>

        <div v-if="data.isBelow || data.hasOfferData" class="flex items-center justify-between gap-2">
          <span v-if="data.isBelow" class="text-sm font-medium tabular-nums text-green-700 dark:text-green-400">
            {{ data.diff }}
          </span>
          <span v-else />
          <Tag v-if="data.hasOfferData" :value="`${data.offer} en oferta`" :severity="data.offerTone" />
        </div>

        <div class="flex flex-wrap items-center gap-2 border-t border-surface pt-3">
          <Tag :value="data.status" :severity="data.statusTone" />
          <span class="text-xs text-muted-color">{{ data.last }}</span>
        </div>
      </li>
    </ul>

    <p v-else class="m-0 rounded-xl border border-surface p-4 text-sm text-muted-color">
      {{
        loading
          ? 'Cargando productos…'
          : products.length
            ? 'Ningún producto coincide con la búsqueda.'
            : 'Todavía no hay productos. Crea el primero con «Nuevo producto».'
      }}
    </p>

    <span v-if="rows.length" class="text-sm text-muted-color">{{ rows.length }} {{ rows.length === 1 ? 'producto' : 'productos' }}</span>
  </section>

  <section v-else aria-label="Lista de productos" class="overflow-hidden rounded-xl border border-surface">
    <DataTable :value="rows" data-key="id" :loading="loading" scrollable table-style="min-width: 980px">
      <template #header>
        <ReuseToolbar />
      </template>

      <Column header="Producto" style="min-width: 200px">
        <template #body="{ data }">
          <div class="flex items-center gap-2">
            <Button
              severity="secondary"
              variant="text"
              icon-only
              class="shrink-0"
              :aria-label="data.isFavorite ? `Quitar ${data.name} de favoritos` : `Marcar ${data.name} como favorito`"
              :aria-pressed="data.isFavorite"
              :disabled="favoritePending.includes(data.id)"
              @click="productsStore.setFavorite(data.id, !data.isFavorite)"
            >
              <StarIcon v-if="data.isFavorite" height="1.25rem" class="text-yellow-500" />
              <StarOutlineIcon v-else height="1.25rem" class="text-muted-color" />
            </Button>
            <div class="flex min-w-0 flex-col gap-0.5">
              <RouterLink :to="`/products/${data.id}`" class="text-[15px] font-semibold text-color no-underline hover:underline">
                {{ data.name }}
              </RouterLink>
              <span class="text-[13px] text-muted-color">{{ data.storesLabel }}</span>
            </div>
          </div>
        </template>
      </Column>
      <Column header="Promedio">
        <template #body="{ data }">
          <div class="flex flex-col gap-0.5">
            <span class="text-[15px] font-medium tabular-nums">{{ data.average }}</span>
            <span v-if="data.averageNote" class="text-xs text-muted-color">{{ data.averageNote }}</span>
          </div>
        </template>
      </Column>
      <Column header="Tienda más barata">
        <template #body="{ data }">
          <div class="flex flex-col gap-0.5">
            <span class="text-sm">{{ data.cheapestHost }}</span>
            <span class="text-[15px] font-semibold tabular-nums">{{ data.cheapestPrice }}</span>
          </div>
        </template>
      </Column>
      <Column header="Frente al promedio">
        <template #body="{ data }">
          <span class="text-sm font-medium tabular-nums" :class="data.isBelow ? 'text-green-700 dark:text-green-400' : 'text-muted-color'">
            {{ data.diff }}
          </span>
        </template>
      </Column>
      <Column header="En oferta">
        <template #body="{ data }">
          <Tag :value="data.offer" :severity="data.offerTone" rounded />
        </template>
      </Column>
      <Column header="Estado">
        <template #body="{ data }">
          <div class="flex flex-col items-start gap-1">
            <Tag :value="data.status" :severity="data.statusTone" rounded />
            <span class="text-xs text-muted-color">{{ data.last }}</span>
          </div>
        </template>
      </Column>
      <Column style="width: 56px">
        <template #header><span class="sr-only">Abrir</span></template>
        <template #body="{ data }">
          <Button v-slot="slotProps" as-child severity="secondary" variant="text" icon-only>
            <RouterLink :to="`/products/${data.id}`" :class="slotProps.class" :aria-label="`Abrir ${data.name}`">
              <ChevronRightIcon height="1rem" />
            </RouterLink>
          </Button>
        </template>
      </Column>

      <template #empty>
        <span class="text-sm">
          {{ products.length ? 'Ningún producto coincide con la búsqueda.' : 'Todavía no hay productos. Crea el primero con «Nuevo producto».' }}
        </span>
      </template>
      <template #footer>
        <span class="text-sm">{{ rows.length }} {{ rows.length === 1 ? 'producto' : 'productos' }}</span>
      </template>
    </DataTable>
  </section>
</template>
