<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { RouterLink } from 'vue-router'
import { storeToRefs } from 'pinia'
import { Button, Card, Column, ConfirmPopup, DataTable, Message, SelectButton, Tag, useConfirm } from 'primevue'
import WarningIcon from '@iconify-vue/material-symbols/warning-outline'
import RefreshRoundedIcon from '@iconify-vue/material-symbols/refresh-rounded'
import DeleteIcon from '@iconify-vue/material-symbols/delete-outline'
import PageHeader from '@/components/PageHeader.vue'
import { useAlertsStore } from '@/stores/alerts.store'
import { useProductsStore } from '@/stores/products.store'
import type { Alert, AlertKind, DeliveryStatus } from '@/types/alert'
import type { Tone } from '@/data/mock'
import { describeError, formatDay, formatMoney, hostOf } from '@/utils/product'

type Filter = 'all' | AlertKind

const alertKinds: Record<AlertKind, { label: string; tone: Tone; title: string }> = {
  price_drop: { label: '↓ Bajada', tone: 'success', title: 'Bajada de precio' },
  price_rise: { label: '↑ Subida', tone: 'warn', title: 'Subida de precio' },
  failure: { label: 'Fallo', tone: 'danger', title: 'Fallo de lectura' },
  recovery: { label: 'Recuperación', tone: 'info', title: 'URL recuperada' },
}

const deliveryStatuses: Record<DeliveryStatus, { label: string; tone: Tone }> = {
  sent: { label: 'Enviada', tone: 'success' },
  failed: { label: 'Falló', tone: 'danger' },
  pending: { label: 'Pendiente', tone: 'secondary' },
}

const filterOptions: { label: string; value: Filter }[] = [
  { label: 'Todas', value: 'all' },
  { label: 'Bajadas', value: 'price_drop' },
  { label: 'Subidas', value: 'price_rise' },
  { label: 'Fallos', value: 'failure' },
  { label: 'Recuperaciones', value: 'recovery' },
]
const filter = ref<Filter>('all')

const alertsStore = useAlertsStore()
const { alerts, loading, loadError, testing, testError, deleting, deleteError } = storeToRefs(alertsStore)
const confirm = useConfirm()

const productsStore = useProductsStore()
const hasProducts = computed(() => productsStore.products.length > 0)

async function sendTestAlert() {
  const alert = await alertsStore.createTestAlert()
  if (alert?.id) {
    filter.value = 'all'
    selectedId.value = alert.id
  }
}

onMounted(() => alertsStore.fetchAlerts())

function confirmDeleteAlert(event: MouseEvent, alert: { id: string; productName: string; date: string; time: string }) {
  deleteError.value = null
  confirm.require({
    target: event.currentTarget as HTMLElement,
    message: `¿Eliminar la alerta de ${alert.productName} del ${alert.date}, ${alert.time}? No se puede deshacer.`,
    rejectProps: { label: 'Cancelar', severity: 'secondary', variant: 'outlined', size: 'small' },
    acceptProps: { label: 'Eliminar alerta', severity: 'danger', size: 'small' },
    accept: () => alertsStore.deleteAlert(alert.id),
  })
}

function confirmDeleteAllAlerts(event: MouseEvent) {
  deleteError.value = null
  const count = alerts.value.length
  confirm.require({
    target: event.currentTarget as HTMLElement,
    message: `¿Eliminar ${count === 1 ? 'la alerta' : `las ${count} alertas`} del historial? No se puede deshacer.`,
    rejectProps: { label: 'Cancelar', severity: 'secondary', variant: 'outlined', size: 'small' },
    acceptProps: { label: 'Eliminar todas', severity: 'danger', size: 'small' },
    accept: () => alertsStore.deleteAllAlerts(),
  })
}

const capitalize = (text: string) => text.charAt(0).toUpperCase() + text.slice(1)
const formatTime = (iso: string) =>
  new Intl.DateTimeFormat('es-MX', { hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).format(new Date(iso))
const money = (value: number | null, currency: string) => (value == null ? '—' : formatMoney(value, currency))

function describe(alert: Alert) {
  const { kind, previousPrice, price, currency, failure } = alert

  if (kind === 'price_drop' || kind === 'price_rise') {
    const pct = previousPrice && price != null ? ((price - previousPrice) / previousPrice) * 100 : undefined
    return {
      detail: `${money(previousPrice, currency)} → ${money(price, currency)}`,
      detailSub: pct == null ? '' : `${pct > 0 ? '+' : '−'}${Math.abs(pct).toFixed(1)}%`,
    }
  }

  if (kind === 'failure') {
    return {
      detail: failure ? capitalize(describeError(failure.reason)) : 'Fallo de lectura',
      detailSub: failure?.lastSuccessAt
        ? `Última lectura correcta: ${formatDay(failure.lastSuccessAt)}`
        : (failure?.message ?? ''),
    }
  }

  return {
    detail: price == null ? 'Lectura recuperada' : `Precio actual ${money(price, currency)}`,
    detailSub: 'La URL vuelve a leer el precio',
  }
}

function sendNote({ status, attempts, error }: Alert['delivery']) {
  if (status === 'failed') return error ?? `Sin respuesta tras ${attempts} ${attempts === 1 ? 'intento' : 'intentos'}`
  if (status === 'sent' && attempts > 1) return `${attempts} intentos`
  return ''
}

const allRows = computed(() =>
  alerts.value.map((alert) => ({
    ...alert,
    ...describe(alert),
    date: formatDay(alert.createdAt),
    time: formatTime(alert.createdAt),
    sendNote: sendNote(alert.delivery),
  })),
)

type AlertRow = (typeof allRows.value)[number]

const rows = computed(() => (filter.value === 'all' ? allRows.value : allRows.value.filter((a) => a.kind === filter.value)))

const selectedId = ref<string>()
const selected = computed<AlertRow | undefined>({
  get: () => allRows.value.find((a) => a.id === selectedId.value),
  set: (row) => (selectedId.value = row?.id),
})

watch(allRows, (list) => {
  if (!list.some((a) => a.id === selectedId.value)) selectedId.value = list[0]?.id
})

const isPriceChange = (a: AlertRow) => a.kind === 'price_drop' || a.kind === 'price_rise'
</script>

<template>
  <PageHeader title="Alertas" description="Cada alerta enviada a Discord, con su estado de entrega.">
    <template #actions>
      <Button severity="secondary" variant="outlined" :loading="testing" @click="sendTestAlert">
        Enviar alerta de prueba
      </Button>
      <Button v-slot="slotProps" as-child>
        <RouterLink to="/settings" :class="slotProps.class">Configurar webhook</RouterLink>
      </Button>
    </template>
  </PageHeader>

  <Message v-if="loadError" severity="error" :closable="false">
    <template #icon><WarningIcon height="1rem" /></template>
    <div class="flex flex-wrap items-center gap-3 text-sm">
      <span class="flex-[1_1_280px]"><strong>No se pudieron cargar las alertas.</strong> {{ loadError }}</span>
      <Button severity="danger" variant="outlined" size="small" :disabled="loading" @click="alertsStore.fetchAlerts()">
        Reintentar
      </Button>
    </div>
  </Message>

  <Message v-if="testError" severity="error" :closable="false">
    <template #icon><WarningIcon height="1rem" /></template>
    <div class="flex flex-wrap items-center gap-3 text-sm">
      <span class="flex-[1_1_280px]"><strong>No se pudo crear la alerta de prueba.</strong> {{ testError }}</span>
      <Button
        v-if="!hasProducts"
        v-slot="slotProps"
        as-child
        severity="danger"
        variant="outlined"
        size="small"
      >
        <RouterLink to="/urls/new?product=new" :class="slotProps.class">Crear producto</RouterLink>
      </Button>
    </div>
  </Message>

  <Message v-if="deleteError" severity="error" :closable="false">
    <template #icon><WarningIcon height="1rem" /></template>
    <span class="text-sm"><strong>No se pudo eliminar la alerta.</strong> {{ deleteError }}</span>
  </Message>

  <ConfirmPopup>
    <template #message="{ message }">
      <div class="flex max-w-80 items-start gap-3 p-4 text-sm">
        <DeleteIcon height="1rem" class="mt-0.5 flex-none text-lg text-red-700 dark:text-red-400" />
        <span>{{ message.message }}</span>
      </div>
    </template>
  </ConfirmPopup>

  <div class="flex flex-wrap items-start gap-6">
    <section
      aria-label="Historial de alertas"
      class="min-w-0 flex-[999_1_520px] overflow-hidden rounded-xl border border-surface"
    >
      <DataTable
        v-model:selection="selected"
        :value="rows"
        :loading="loading"
        data-key="id"
        selection-mode="single"
        :meta-key-selection="false"
        scrollable
        table-style="min-width: 830px"
      >
        <template #header>
          <div class="w-full flex justify-between">
            <SelectButton
              v-model="filter"
              :options="filterOptions"
              option-label="label"
              option-value="value"
              :allow-empty="false"
              aria-label="Filtrar por tipo"
            />
            <div class="flex items-center gap-1">
              <Button
                severity="secondary"
                variant="text"
                @click="alertsStore.fetchAlerts()"
              >
                <RefreshRoundedIcon height="1rem" />
              </Button>
              <Button
                aria-label="Eliminar todas las alertas"
                severity="danger"
                variant="text"
                :disabled="deleting || loading || !alerts.length"
                @click="confirmDeleteAllAlerts($event)"
              >
                <DeleteIcon height="1rem" />
              </Button>
            </div>
          </div>
        </template>

        <template #empty>
          <span class="text-sm text-muted-color">{{ loading ? 'Cargando alertas…' : 'No hay alertas.' }}</span>
        </template>

        <Column header="Fecha" style="width: 84px">
          <template #body="{ data }">
            <div class="flex flex-col gap-0.5">
              <span class="text-sm font-semibold text-color">{{ data.date }}</span>
              <span class="text-xs text-muted-color">{{ data.time }}</span>
            </div>
          </template>
        </Column>
        <Column header="Tipo" style="width: 130px">
          <template #body="{ data }">
            <div class="flex flex-col items-start gap-1">
              <Tag :value="alertKinds[data.kind as AlertKind].label" :severity="alertKinds[data.kind as AlertKind].tone" rounded />
              <Tag v-if="data.belowAverage" value="Oferta" severity="success" rounded />
            </div>
          </template>
        </Column>
        <Column header="Producto y tienda">
          <template #body="{ data }">
            <div class="flex flex-col gap-0.5">
              <span class="text-sm font-semibold">{{ data.productName }}</span>
              <span class="text-[13px] text-muted-color">{{ hostOf(data.storeUrl) }}</span>
            </div>
          </template>
        </Column>
        <Column header="Detalle">
          <template #body="{ data }">
            <div class="flex flex-col gap-0.5">
              <span class="text-sm font-medium tabular-nums">{{ data.detail }}</span>
              <span class="text-[13px] text-muted-color">{{ data.detailSub }}</span>
            </div>
          </template>
        </Column>
        <Column header="Envío" style="width: 170px">
          <template #body="{ data }">
            <div class="flex flex-col items-start gap-1">
              <Tag
                :value="deliveryStatuses[data.delivery.status as DeliveryStatus].label"
                :severity="deliveryStatuses[data.delivery.status as DeliveryStatus].tone"
                rounded
              />
              <span v-if="data.sendNote" class="text-xs text-muted-color">{{ data.sendNote }}</span>
              <Button v-if="data.delivery.status === 'failed'" severity="danger" variant="outlined" size="small" @click.stop>Reintentar envío</Button>
            </div>
          </template>
        </Column>
        <Column header="Acciones" style="width: 90px">
          <template #body="{ data }">
            <Button
              :aria-label="`Eliminar alerta de ${data.productName} del ${data.date}, ${data.time}`"
              severity="danger"
              variant="outlined"
              icon-only
              :disabled="deleting"
              @click="confirmDeleteAlert($event, data)"
            >
              <DeleteIcon height="1rem" />
            </Button>
          </template>
        </Column>

        <template #footer>
          <span class="text-sm">{{ rows.length }} alertas más recientes</span>
        </template>
      </DataTable>
    </section>

    <aside aria-label="Vista previa del mensaje" class="flex max-w-[340px] min-w-0 flex-[1_1_320px] flex-col gap-3">
      <div class="flex flex-col gap-0.5">
        <h2 class="m-0 text-base font-semibold">Vista previa del mensaje</h2>
        <span class="text-[13px] text-muted-color">
          {{ selected ? `Alerta seleccionada: ${selected.date}, ${selected.time}` : 'Selecciona una alerta de la lista' }}
        </span>
      </div>

      <Card v-if="selected">
        <template #content>
          <div class="flex flex-col gap-3.5">
            <div class="flex flex-col gap-3 rounded-lg bg-emphasis p-3.5">
              <div class="flex flex-wrap items-center gap-2">
                <span class="text-[15px] font-bold">{{ alertKinds[selected.kind].title }} · {{ selected.productName }}</span>
                <Tag v-if="selected.belowAverage" value="Oferta" severity="success" rounded />
              </div>
              <dl class="m-0 grid grid-cols-2 gap-x-3 gap-y-2.5 text-[13px]">
                <div>
                  <dt class="text-muted-color">Tienda</dt>
                  <dd class="m-0 mt-0.5 font-semibold">{{ hostOf(selected.storeUrl) }}</dd>
                </div>
                <template v-if="isPriceChange(selected)">
                  <div>
                    <dt class="text-muted-color">Variación</dt>
                    <dd class="m-0 mt-0.5 font-semibold" :class="selected.kind === 'price_drop' ? 'text-green-700 dark:text-green-400' : 'text-orange-700 dark:text-orange-400'">
                      {{ selected.detailSub }}
                    </dd>
                  </div>
                  <div>
                    <dt class="text-muted-color">Precio anterior</dt>
                    <dd class="m-0 mt-0.5 font-semibold tabular-nums">{{ money(selected.previousPrice, selected.currency) }}</dd>
                  </div>
                  <div>
                    <dt class="text-muted-color">Precio nuevo</dt>
                    <dd class="m-0 mt-0.5 font-semibold tabular-nums">{{ money(selected.price, selected.currency) }}</dd>
                  </div>
                </template>
                <div v-else>
                  <dt class="text-muted-color">Detalle</dt>
                  <dd class="m-0 mt-0.5 font-semibold">{{ selected.detail }}</dd>
                </div>
              </dl>
              <span v-if="selected.belowAverage" class="text-[13px]">Queda por debajo del promedio del producto.</span>
              <span v-else-if="!isPriceChange(selected)" class="text-[13px]">{{ selected.detailSub }}</span>
              <RouterLink :to="`/products/${selected.productId}`" class="font-mono text-[13px] break-all text-green-700 dark:text-green-400">
                {{ selected.storeUrl }}
              </RouterLink>
            </div>

            <div class="flex flex-col gap-1 text-[13px] text-muted-color">
              <span v-if="selected.delivery.status === 'failed'">No se entregó: {{ selected.sendNote.toLowerCase() }}.</span>
              <span v-else-if="selected.delivery.status === 'pending'">Aún no se envía a Discord.</span>
              <span v-else-if="selected.sendNote">
                Entregada tras {{ selected.sendNote }}: Discord pidió esperar antes del reintento.
              </span>
              <span>Si una revisión detecta varios cambios, se envían juntos en un solo mensaje.</span>
            </div>
          </div>
        </template>
      </Card>
    </aside>
  </div>
</template>
