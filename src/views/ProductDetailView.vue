<script setup lang="ts">
import { computed, ref } from 'vue'
import { RouterLink } from 'vue-router'
import { storeToRefs } from 'pinia'
import { createReusableTemplate } from '@vueuse/core'
import { Button, Card, Column, ConfirmPopup, DataTable, Message, SelectButton, Tag, useConfirm } from 'primevue'
import AddIcon from '@iconify-vue/material-symbols/add'
import RefreshIcon from '@iconify-vue/material-symbols/refresh'
import ProgressActivityIcon from '@iconify-vue/material-symbols/progress-activity'
import PauseIcon from '@iconify-vue/material-symbols/pause'
import PlayIcon from '@iconify-vue/material-symbols/play-arrow'
import EditIcon from '@iconify-vue/material-symbols/edit-outline'
import DeleteIcon from '@iconify-vue/material-symbols/delete-outline'
import WarningIcon from '@iconify-vue/material-symbols/warning-outline'
import AppBreadcrumb from '@/components/AppBreadcrumb.vue'
import PageHeader from '@/components/PageHeader.vue'
import PriceHistoryChart from '@/components/PriceHistoryChart.vue'
import StatCard from '@/components/StatCard.vue'
import { useProduct } from '@/composables/useProduct'
import { useInterfaceStore } from '@/stores/interface.store'
import { useProductsStore } from '@/stores/products.store'
import {
  dailySeries,
  describeError,
  formatDateTime,
  formatDay,
  formatMoney,
  hostOf,
  isWeeklyLow,
  lastPrice,
  niceScale,
  storePalette,
  summarize,
} from '@/utils/product'

const props = defineProps<{ id: string }>()

const headerButtonDt = { outlined: { secondary: { borderColor: 'light-dark({surface.200}, {surface.600})', color: 'light-dark({surface.500}, {surface.50})' } } }

const { product, loading, error, notFound, reload } = useProduct(() => props.id)

const productsStore = useProductsStore()
const { saving, saveError, checkingStores, checkError, checkPending, statusPending, statusError } = storeToRefs(productsStore)
const { isMobile } = storeToRefs(useInterfaceStore())
const confirm = useConfirm()
saveError.value = null
checkError.value = null
checkPending.value = false
statusError.value = null

function confirmDeleteStore(event: MouseEvent, store: { id: string; host: string }) {
  saveError.value = null
  confirm.require({
    target: event.currentTarget as HTMLElement,
    message: `¿Eliminar ${store.host} de este producto? Se borra también su historial de precios.`,
    rejectProps: { label: 'Cancelar', severity: 'secondary', variant: 'outlined', size: 'small' },
    acceptProps: { label: 'Eliminar tienda', severity: 'danger', size: 'small' },
    accept: () => productsStore.deleteStore(props.id, store.id).catch(() => {}),
  })
}

const summary = computed(() => (product.value ? summarize(product.value) : undefined))
const currency = computed(() => summary.value?.currency)

const breadcrumb = computed(() => [{ label: 'Productos', route: '/' }, { label: product.value?.name ?? 'Producto' }])

const description = computed(() => {
  const s = summary.value
  if (!s) return undefined
  const parts = [`${s.storeCount} ${s.storeCount === 1 ? 'tienda' : 'tiendas'}`]
  if (s.failingCount) parts.push(`${s.failingCount} con fallo`)
  if (s.lastCheckedAt) parts.push(`Última revisión: ${formatDateTime(s.lastCheckedAt)}`)
  return parts.join(' · ')
})

const styled = computed(() =>
  (product.value?.stores ?? []).map((store, i) => ({ store, ...storePalette[i % storePalette.length]! })),
)

const percent = (diff: number, base: number) => `${diff < 0 ? '−' : '+'}${Math.abs((diff / base) * 100).toFixed(1)}%`
const signedMoney = (diff: number) => `${diff < 0 ? '−' : '+'}${formatMoney(Math.abs(diff), currency.value)}`

const stats = computed(() => {
  const s = summary.value
  if (!s || !product.value) return []
  const entries = product.value.stores.flatMap((store) => store.priceHistory.map((h) => ({ store, ...h })))
  const min = entries.reduce<(typeof entries)[number] | undefined>((m, e) => (!m || e.price < m.price ? e : m), undefined)
  const max = entries.reduce<(typeof entries)[number] | undefined>((m, e) => (!m || e.price > m.price ? e : m), undefined)
  const cheapestDiff = s.cheapest && s.average != null ? s.cheapest.price - s.average : undefined

  return [
    {
      label: 'Más barata hoy',
      value: s.cheapest ? formatMoney(s.cheapest.price, s.cheapest.store.currency) : '—',
      note:
        s.cheapest && cheapestDiff != null && s.average
          ? `${hostOf(s.cheapest.store.url)} · ${signedMoney(cheapestDiff)} (${percent(cheapestDiff, s.average)}) frente al promedio`
          : 'Sin lecturas todavía',
      accent: true,
    },
    {
      label: 'Mínimo histórico',
      value: min ? formatMoney(min.price, min.store.currency) : '—',
      note: min ? `${hostOf(min.store.url)} · desde el ${formatDay(min.date)}` : 'Sin lecturas todavía',
    },
    {
      label: 'Máximo histórico',
      value: max ? formatMoney(max.price, max.store.currency) : '—',
      note: max ? `${hostOf(max.store.url)} · ${formatDay(max.date)}` : 'Sin lecturas todavía',
    },
  ]
})

type Range = '14' | '30' | 'all'
const rangeOptions: { label: string; value: Range }[] = [
  { label: '14 días', value: '14' },
  { label: '30 días', value: '30' },
  { label: 'Todo', value: 'all' },
]
const range = ref<Range>('14')

const history = computed(() => {
  const series = dailySeries(
    styled.value.map((s) => s.store),
    range.value === 'all' ? undefined : Number(range.value),
  )
  if (!series) return undefined
  const prices = series.values.flat().filter((v): v is number => v != null)
  if (summary.value?.average != null) prices.push(summary.value.average)
  if (!prices.length) return undefined
  return {
    days: series.days,
    scale: niceScale(prices),
    series: styled.value.map(({ store, color, dash }, i) => ({
      label:
        store.status === 'failing' && store.lastError
          ? `${hostOf(store.url)} · sin lectura desde el ${formatDay(store.lastError.since)}`
          : hostOf(store.url),
      color,
      dash,
      values: series.values[i] ?? [],
    })),
  }
})

const chartLabel = computed(() =>
  history.value && product.value
    ? `Historial de precios de ${product.value.name} del ${history.value.days[0]} al ${history.value.days.at(-1)}.`
    : '',
)

const rows = computed(() => {
  const average = summary.value?.average
  return styled.value
    .map(({ store, color, dash }) => {
      const price = lastPrice(store)
      const history = [...store.priceHistory].sort((a, b) => a.date.localeCompare(b.date))
      const last = history.at(-1)
      const previous = history.at(-2)
      const change = last && previous ? last.price - previous.price : undefined
      const diff = price != null && average != null ? price - average : undefined
      const failing = store.status === 'failing'

      return {
        id: store.id,
        host: hostOf(store.url),
        url: store.url,
        color,
        dash,
        sortPrice: price ?? Number.POSITIVE_INFINITY,
        price: price != null ? formatMoney(price, store.currency) : '—',
        priceNote: failing && price != null ? 'Último precio correcto' : price == null ? 'Sin lecturas todavía' : '',
        change:
          change != null
            ? `${change < 0 ? '↓' : '↑'} ${change < 0 ? '−' : '+'}${formatMoney(Math.abs(change), store.currency)}`
            : last
              ? 'Primer precio'
              : '—',
        changeUp: change != null && change > 0,
        changeDate: last ? formatDay(last.date) : '',
        diff: diff != null && average ? `${signedMoney(diff)} · ${percent(diff, average)}` : '—',
        isBelow: diff != null && diff < 0,
        isOffer: isWeeklyLow(store),
        status: failing ? 'Con fallo' : store.status === 'paused' ? 'Pausada' : 'Al corriente',
        statusTone: failing ? 'danger' : store.status === 'paused' ? 'secondary' : 'success',
        statusNote:
          failing && store.lastError
            ? `${describeError(store.lastError.reason)} · desde el ${formatDay(store.lastError.since)}`
            : last
              ? `Último cambio ${formatDateTime(last.date)}`
              : `Agregada ${formatDateTime(store.createdAt)}`,
        mode: store.fetchMode === 'http' ? 'HTTP' : 'Navegador',
        paused: store.status === 'paused',
      }
    })
    .sort((a, b) => a.sortPrice - b.sortPrice)
})

type Row = (typeof rows.value)[number]
const [DefineStoreActions, ReuseStoreActions] = createReusableTemplate<{ data: Row; fill?: boolean }>()
</script>

<template>
  <DefineStoreActions v-slot="{ data, fill }">
    <div class="flex" :class="fill ? 'gap-2' : 'gap-1'">
      <Button
        :aria-label="`Revisar ahora ${data.host}`"
        severity="secondary"
        variant="outlined"
        icon-only
        :class="{ 'h-11! min-w-0 flex-1': fill }"
        :disabled="data.paused || checkingStores.includes(data.id)"
        @click="productsStore.checkStore(id, data.id)"
      >
        <ProgressActivityIcon v-if="checkingStores.includes(data.id)" height="1rem" class="animate-spin" />
        <RefreshIcon v-else height="1rem" />
      </Button>
      <Button
        :aria-label="data.paused ? `Reanudar ${data.host}` : `Pausar ${data.host}`"
        severity="secondary"
        variant="outlined"
        icon-only
        :class="{ 'h-11! min-w-0 flex-1': fill }"
        :disabled="statusPending.includes(data.id)"
        @click="productsStore.setStoreStatus(id, data.id, data.paused ? 'ok' : 'paused')"
      >
        <PlayIcon v-if="data.paused" height="1rem" />
        <PauseIcon v-else height="1rem" />
      </Button>
      <Button
        :aria-label="`Eliminar ${data.host}`"
        severity="danger"
        variant="outlined"
        icon-only
        :class="{ 'h-11! min-w-0 flex-1': fill }"
        :disabled="saving"
        @click="confirmDeleteStore($event, data)"
      >
        <DeleteIcon height="1rem" />
      </Button>
    </div>
  </DefineStoreActions>
  <div class="flex flex-col gap-3">
    <AppBreadcrumb :items="breadcrumb" />

    <PageHeader
      :title="product?.name ?? (loading ? 'Cargando producto…' : 'Producto no encontrado')"
      :description="description"
    >
      <template v-if="product && isMobile" #actions>
        <Button v-slot="slotProps" as-child severity="secondary" variant="text">
          <RouterLink :to="`/products/${id}/edit`" :class="slotProps.class" aria-label="Editar producto">
            <EditIcon height="1.125rem" />
          </RouterLink>
        </Button>
        <Button severity="secondary" variant="text" aria-label="Revisar todas ahora"><RefreshIcon height="1.125rem" /></Button>
        <Button v-slot="slotProps" as-child variant="text">
          <RouterLink :to="`/urls/new?product=${id}`" :class="slotProps.class" aria-label="Agregar url">
            <AddIcon height="1.25rem" />
          </RouterLink>
        </Button>
      </template>
      <template v-else-if="product" #actions>
        <Button v-slot="slotProps" as-child severity="secondary" variant="outlined" :dt="headerButtonDt">
          <RouterLink :to="`/products/${id}/edit`" :class="slotProps.class">Editar producto</RouterLink>
        </Button>
        <Button severity="secondary" variant="outlined" :dt="headerButtonDt"><RefreshIcon height="1rem" /> Revisar todas ahora</Button>
        <Button v-slot="slotProps" as-child>
          <RouterLink :to="`/urls/new?product=${id}`" :class="slotProps.class"><AddIcon height="1rem" /> Agregar url</RouterLink>
        </Button>
      </template>
    </PageHeader>
  </div>

  <Message v-if="error" severity="error" :closable="false">
    <template #icon><WarningIcon height="1rem" /></template>
    <div class="flex flex-wrap items-center gap-3 text-sm">
      <span class="flex-[1_1_280px]"><strong>No se pudo cargar el producto.</strong> {{ error }}</span>
      <Button severity="danger" variant="outlined" size="small" :disabled="loading" @click="reload">Reintentar</Button>
    </div>
  </Message>

  <Message v-else-if="notFound" severity="secondary" :closable="false">
    <span class="text-sm">Este producto no existe o ya fue eliminado.</span>
  </Message>

  <template v-else-if="product">
    <section
      aria-label="Resumen de precios"
      :tabindex="isMobile ? 0 : undefined"
      class="flex gap-4 max-lg:-mx-4 max-lg:snap-x max-lg:snap-mandatory max-lg:scroll-px-4 max-lg:gap-3 max-lg:overflow-x-auto max-lg:px-4 max-lg:pb-1 lg:flex-wrap"
    >
      <StatCard
        v-for="stat in stats"
        :key="stat.label"
        :label="stat.label"
        :value="stat.value"
        :note="stat.note"
        :tone="stat.accent ? 'success' : 'default'"
      />
    </section>

    <Card>
      <template #title>
        <div class="flex flex-wrap items-center justify-between gap-3">
          <h2 class="m-0 text-lg font-semibold">Historial de precios</h2>
          <SelectButton
            v-model="range"
            :options="rangeOptions"
            option-label="label"
            option-value="value"
            :allow-empty="false"
            aria-label="Rango del historial"
          />
        </div>
      </template>
      <template #subtitle>
        <span v-if="history" class="text-sm">Una lectura correcta por día y por tienda{{ currency ? `, en ${currency}` : '' }}</span>
      </template>
      <template #content>
        <PriceHistoryChart
          v-if="history"
          :days="history.days"
          :series="history.series"
          :average="summary?.average ?? 0"
          :min="history.scale.min"
          :max="history.scale.max"
          :step="history.scale.step"
          :description="chartLabel"
          :compact="isMobile"
        />
        <span v-else class="text-sm text-muted-color">Todavía no hay lecturas de precio para este producto.</span>
      </template>
    </Card>

    <Message v-if="checkError" severity="error" :closable="false">
      <template #icon><WarningIcon height="1rem" /></template>
      <span class="text-sm"><strong>No se pudo revisar la tienda.</strong> {{ checkError }}</span>
    </Message>
    <Message v-else-if="checkPending" severity="info" :closable="false">
      <span class="text-sm">La revisión sigue en cola. El resultado aparecerá al recargar el producto en unos momentos.</span>
    </Message>

    <Message v-if="statusError" severity="error" :closable="false">
      <template #icon><WarningIcon height="1rem" /></template>
      <span class="text-sm"><strong>No se pudo cambiar el estado de la tienda.</strong> {{ statusError }}</span>
    </Message>

    <Message v-if="saveError" severity="error" :closable="false">
      <template #icon><WarningIcon height="1rem" /></template>
      <span class="text-sm"><strong>No se pudo eliminar la tienda.</strong> {{ saveError }}</span>
    </Message>

    <ConfirmPopup>
      <template #message="{ message }">
        <div class="flex max-w-80 items-start gap-3 p-4 text-sm">
          <DeleteIcon height="1rem" class="mt-0.5 flex-none text-lg text-red-700 dark:text-red-400" />
          <span>{{ message.message }}</span>
        </div>
      </template>
    </ConfirmPopup>

    <section v-if="isMobile" aria-label="Tiendas del producto" class="flex flex-col gap-3">
      <div class="flex flex-col gap-1">
        <h2 class="m-0 text-lg font-semibold">Tiendas</h2>
        <span class="text-[13px] text-muted-color">
          Ordenadas por precio actual. Si una tienda falla, se muestra su último precio correcto.
        </span>
      </div>

      <ul v-if="rows.length" class="m-0 flex list-none flex-col gap-3 p-0">
        <li
          v-for="data in rows"
          :key="data.id"
          class="flex flex-col gap-3 rounded-xl border border-surface-200 bg-(--p-card-background) p-3.5 dark:border-surface-800"
        >
          <div class="flex items-center justify-between gap-2">
            <div class="flex min-w-0 items-center gap-2.5">
              <svg width="28" height="10" aria-hidden="true" class="flex-none">
                <line
                  x1="2" y1="5" x2="26" y2="5"
                  :style="{ stroke: data.color }" stroke-width="3" stroke-linecap="round"
                  :stroke-dasharray="data.dash.join(' ') || undefined"
                />
              </svg>
              <a :href="data.url" target="_blank" rel="noopener" class="truncate text-[15px] font-semibold text-color no-underline hover:underline">
                {{ data.host }}
              </a>
            </div>
            <Tag :value="data.mode" :severity="data.mode === 'HTTP' ? 'secondary' : 'info'" class="flex-none" />
          </div>

          <span class="line-clamp-2 font-mono text-xs leading-snug break-all text-muted-color">{{ data.url }}</span>

          <div class="grid grid-cols-2 gap-x-3">
            <div class="flex min-w-0 flex-col gap-0.5">
              <span class="text-xs text-muted-color">Precio actual</span>
              <span class="text-xl leading-tight font-bold tabular-nums">{{ data.price }}</span>
              <span v-if="data.priceNote" class="text-xs text-muted-color">{{ data.priceNote }}</span>
              <span class="text-xs text-muted-color">
                <span
                  class="font-semibold tabular-nums"
                  :class="data.changeUp ? 'text-orange-700 dark:text-orange-400' : 'text-green-700 dark:text-green-500'"
                >{{ data.change }}</span><template v-if="data.changeDate"> · {{ data.changeDate }}</template>
              </span>
            </div>
            <div class="flex min-w-0 flex-col items-start gap-1">
              <span class="text-xs text-muted-color">Frente al promedio</span>
              <span class="text-sm font-medium tabular-nums" :class="{ 'text-green-700 dark:text-green-500': data.isBelow }">
                {{ data.diff }}
              </span>
              <Tag v-if="data.isOffer" value="Oferta" severity="success" />
            </div>
          </div>

          <div class="flex flex-wrap items-center gap-2 border-t border-surface-200 pt-3 dark:border-surface-800">
            <Tag :value="data.status" :severity="data.statusTone" />
            <span class="text-xs text-muted-color">{{ data.statusNote }}</span>
          </div>

          <ReuseStoreActions :data="data" fill />
        </li>
      </ul>
      <p v-else class="m-0 text-sm text-muted-color">Este producto todavía no tiene URLs.</p>
    </section>

    <section v-else aria-label="Tiendas del producto" class="overflow-hidden rounded-xl border border-surface">
      <DataTable :value="rows" data-key="id" scrollable table-style="min-width: 1100px">
        <template #header>
          <div class="flex flex-wrap items-center justify-between gap-2">
            <h2 class="m-0 text-lg font-semibold">Tiendas</h2>
            <span class="text-[13px] font-normal text-muted-color">
              Ordenadas por precio actual. Si una tienda falla, se muestra su último precio correcto.
            </span>
          </div>
        </template>

        <Column header="Tienda" style="min-width: 180px">
          <template #body="{ data }">
            <div class="flex items-center gap-3">
              <svg width="28" height="10" aria-hidden="true" class="flex-none">
                <line
                  x1="2" y1="5" x2="26" y2="5"
                  :style="{ stroke: data.color }" stroke-width="3" stroke-linecap="round"
                  :stroke-dasharray="data.dash.join(' ') || undefined"
                />
              </svg>
              <div class="flex min-w-0 flex-col gap-0.5">
                <a :href="data.url" target="_blank" rel="noopener" class="text-[15px] font-semibold text-color no-underline hover:underline">
                  {{ data.host }}
                </a>
                <span class="font-mono text-[13px] break-all text-muted-color">{{ data.url }}</span>
              </div>
            </div>
          </template>
        </Column>
        <Column header="Precio actual">
          <template #body="{ data }">
            <div class="flex flex-col gap-0.5">
              <span class="text-base font-bold tabular-nums">{{ data.price }}</span>
              <span v-if="data.priceNote" class="text-xs text-muted-color">{{ data.priceNote }}</span>
            </div>
          </template>
        </Column>
        <Column header="Último cambio">
          <template #body="{ data }">
            <div class="flex flex-col gap-0.5">
              <span
                class="text-sm font-semibold tabular-nums"
                :class="data.changeUp ? 'text-orange-700 dark:text-orange-400' : 'text-green-700 dark:text-green-500'"
              >
                {{ data.change }}
              </span>
              <span class="text-xs text-muted-color">{{ data.changeDate }}</span>
            </div>
          </template>
        </Column>
        <Column header="Frente al promedio">
          <template #body="{ data }">
            <div class="flex flex-wrap items-center gap-2">
              <span class="text-sm font-medium tabular-nums" :class="{ 'text-green-700 dark:text-green-500': data.isBelow }">
                {{ data.diff }}
              </span>
              <Tag v-if="data.isOffer" value="Oferta" severity="success" />
            </div>
          </template>
        </Column>
        <Column header="Estado" style="min-width: 190px">
          <template #body="{ data }">
            <div class="flex flex-col items-start gap-1">
              <Tag :value="data.status" :severity="data.statusTone" />
              <span class="text-xs text-muted-color">{{ data.statusNote }}</span>
            </div>
          </template>
        </Column>
        <Column header="Lectura">
          <template #body="{ data }">
            <Tag :value="data.mode" :severity="data.mode === 'HTTP' ? 'secondary' : 'info'" />
          </template>
        </Column>
        <Column header="Acciones">
          <template #body="{ data }">
            <ReuseStoreActions :data="data" />
          </template>
        </Column>

        <template #empty><span class="text-sm">Este producto todavía no tiene URLs.</span></template>
      </DataTable>
    </section>
  </template>
</template>
