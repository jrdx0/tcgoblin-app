<script setup lang="ts">
import { computed } from 'vue'
import { storeToRefs } from 'pinia'
import { Button, Card, InputText, Message, Select, SelectButton } from 'primevue'
import RefreshIcon from '@iconify-vue/material-symbols/refresh'
import LockIcon from '@iconify-vue/material-symbols/lock-outline'
import CheckCircleIcon from '@iconify-vue/material-symbols/check-circle-outline'
import WarningIcon from '@iconify-vue/material-symbols/warning-outline'
import CancelIcon from '@iconify-vue/material-symbols/cancel-outline'
import InfoIcon from '@iconify-vue/material-symbols/info-outline'
import ProgressIcon from '@iconify-vue/material-symbols/progress-activity'
import PagePicker from '@/components/new-url/PagePicker.vue'
import { currencyOptions, useNewUrlStore } from '@/stores/newUrl.store'
import type { FetchMode } from '@/types/product'
import { formatDateTime, formatMoney } from '@/utils/product'

const emit = defineEmits<{ back: []; next: [] }>()

const store = useNewUrlStore()
const {
  url,
  host,
  productName,
  snapshot,
  pageState,
  pageError,
  selector,
  testedSelector,
  currency,
  matchCount,
  matchState,
  firstMatch,
  firstPrice,
  canContinue,
  fetchMode,
  requestedFetchMode,
} = storeToRefs(store)

const parsed = computed(() => (firstPrice.value != null ? formatMoney(firstPrice.value, currency.value) : '—'))
const fetchModeOptions: { label: string; value: FetchMode }[] = [
  { label: 'HTTP', value: 'http' },
  { label: 'Navegador', value: 'browser' },
]

const selectedFetchMode = computed<FetchMode>({
  get: () => requestedFetchMode.value ?? fetchMode.value,
  set: (mode) => store.openPage(mode),
})

const pagePath = computed(() => (snapshot.value?.url ?? url.value.trim()).replace(/^https?:\/\//, ''))
</script>

<template>
  <div class="flex flex-col gap-6">
    <Card>
      <template #content>
        <div class="flex flex-wrap items-center gap-x-8 gap-y-4">
          <div class="flex min-w-0 flex-col gap-0.5">
            <span class="text-xs font-medium text-muted-color">URL de la tienda</span>
            <span class="font-mono text-[13px] break-all">{{ url }}</span>
          </div>
          <div class="flex flex-col gap-0.5">
            <span class="text-xs font-medium text-muted-color">Producto</span>
            <span class="text-sm font-semibold">{{ productName }}</span>
          </div>
          <Button variant="text" class="ml-auto" @click="emit('back')">Cambiar</Button>
        </div>
      </template>
    </Card>

    <div class="flex flex-wrap items-start gap-6">
      <Card class="min-w-0 flex-[999_1_520px]">
        <template #title>
          <div class="flex flex-wrap items-center justify-between gap-3">
            <h2 class="m-0 text-base font-semibold">Haz clic sobre el precio</h2>
            <div class="flex flex-wrap items-center gap-2">
              <SelectButton
                v-model="selectedFetchMode"
                :options="fetchModeOptions"
                option-label="label"
                option-value="value"
                :allow-empty="false"
                :disabled="pageState === 'loading'"
                aria-label="Cómo abrir la página"
              />
              <Button
                severity="secondary"
                variant="outlined"
                :disabled="pageState === 'loading'"
                @click="store.openPage(snapshot ? fetchMode : undefined)"
              >
                <RefreshIcon height="1rem" :class="{ 'animate-spin': pageState === 'loading' }" />
                {{ pageState === 'loading' ? 'Recargando…' : 'Recargar página' }}
              </Button>
            </div>
          </div>
        </template>
        <template #subtitle>
          <span class="text-sm">
            Página abierta en el servidor{{ snapshot ? ` el ${formatDateTime(snapshot.takenAt)}` : '' }}. El elemento que
            elijas se convierte en un selector CSS.
          </span>
        </template>
        <template #content>
          <Message v-if="pageState === 'error' && snapshot" severity="error" :closable="false" class="mb-3">
            <template #icon><WarningIcon height="1rem" /></template>
            <span class="text-sm"><strong>No se pudo abrir la página.</strong> {{ pageError }} Se muestra la última versión cargada.</span>
          </Message>
          <div class="overflow-hidden rounded-border border border-surface">
            <div class="flex items-center gap-2.5 border-b border-surface bg-emphasis px-3.5 py-2.5">
              <LockIcon height="1rem" class="text-muted-color" />
              <span class="truncate font-mono text-xs text-muted-color">{{ pagePath || host }}</span>
            </div>
            <PagePicker
              v-if="snapshot"
              :html="snapshot.html"
              :page-url="snapshot.url"
              :selector="testedSelector"
              @pick="store.pick"
              @result="store.applyResult"
            />
            <div v-else class="flex h-40 items-center justify-center p-6 text-center text-sm text-muted-color">
              <span v-if="pageState === 'loading'" class="flex items-center gap-2">
                <ProgressIcon height="1rem" class="animate-spin" /> Abriendo la página en el servidor…
              </span>
              <span v-else>{{ pageError ?? 'La página no está disponible. Recárgala para intentarlo de nuevo.' }}</span>
            </div>
          </div>
        </template>
      </Card>

      <section aria-label="Selector y prueba" class="flex max-w-full min-w-0 flex-[1_1_360px] flex-col gap-4">
        <Card>
          <template #content>
            <form class="flex flex-col gap-3" @submit.prevent="store.test()">
              <label for="selector" class="text-sm font-semibold">Selector CSS</label>
              <InputText id="selector" v-model="selector" spellcheck="false" placeholder="Haz clic sobre el precio" fluid />
              <div class="flex flex-wrap items-center justify-between gap-2">
                <span class="flex-[1_1_180px] text-[13px] text-muted-color">
                  Se genera con tu clic. Puedes editarlo y volver a probarlo.
                </span>
                <Button type="submit" severity="secondary" variant="outlined" :disabled="!snapshot || !selector.trim()">
                  Probar selector
                </Button>
              </div>
            </form>
          </template>
        </Card>

        <Card>
          <template #content>
            <div class="flex flex-col gap-3.5">
              <Message v-if="matchState === 'empty'" severity="secondary" :closable="false">
                <template #icon><InfoIcon height="1rem" /></template>
                <span class="text-sm">Haz clic sobre el precio en la página o escribe un selector.</span>
              </Message>
              <Message v-else-if="matchState === 'testing'" severity="secondary" :closable="false" role="status">
                <template #icon><ProgressIcon height="1rem" class="animate-spin" /></template>
                <span class="text-sm">Probando el selector…</span>
              </Message>
              <Message v-else-if="matchState === 'ok'" severity="success" :closable="false" role="status">
                <template #icon><CheckCircleIcon height="1rem" /></template>
                <span class="text-sm">1 coincidencia</span>
              </Message>
              <Message v-else-if="matchState === 'multiple'" severity="warn" :closable="false" role="status">
                <template #icon><WarningIcon height="1rem" /></template>
                <div class="flex flex-col gap-1.5 text-sm">
                  <strong>{{ matchCount }} coincidencias · se usará la primera</strong>
                  <span>La primera está marcada con borde continuo en la página. Afina el selector si no es el precio correcto.</span>
                </div>
              </Message>
              <Message v-else-if="matchState === 'invalid'" severity="error" :closable="false">
                <template #icon><CancelIcon height="1rem" /></template>
                <div class="flex flex-col gap-1.5 text-sm">
                  <strong>Selector no válido</strong>
                  <span>Revisa la sintaxis del selector CSS.</span>
                </div>
              </Message>
              <Message v-else severity="error" :closable="false">
                <template #icon><CancelIcon height="1rem" /></template>
                <div class="flex flex-col gap-1.5 text-sm">
                  <strong>0 coincidencias</strong>
                  <span>Ningún elemento coincide con el selector. Haz clic en el precio o corrige el texto.</span>
                </div>
              </Message>

              <Message v-if="firstMatch && firstPrice == null" severity="warn" :closable="false">
                <template #icon><WarningIcon height="1rem" /></template>
                <span class="text-sm">El texto del elemento no contiene un precio. Elige el elemento que muestra el número.</span>
              </Message>

              <dl class="m-0 grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-sm">
                <dt class="text-muted-color">Texto del primer elemento</dt>
                <dd class="m-0 truncate text-right font-mono font-medium">{{ firstMatch?.text || '—' }}</dd>
                <dt class="text-muted-color">Precio interpretado</dt>
                <dd class="m-0 text-right font-bold tabular-nums">{{ parsed }}</dd>
              </dl>
            </div>
          </template>
        </Card>

        <Card>
          <template #title><h2 class="m-0 text-sm font-semibold">Cómo se leerá cada día</h2></template>
          <template #content>
            <div v-if="snapshot" class="flex items-start gap-2 text-[13px] text-green-700 dark:text-green-400">
              <CheckCircleIcon height="1rem" class="mt-px flex-none" />
              <span v-if="fetchMode === 'http'">
                Se usará una petición HTTP simple: el precio viene en el HTML de la página y es más rápido. Si algún día
                falla, se abre el navegador.
              </span>
              <span v-else>
                Se usará el navegador del servidor: la página carga el precio con JavaScript.
              </span>
            </div>
            <span v-else class="text-[13px] text-muted-color">
              El servidor decide cómo leer la página en cuanto la abre.
            </span>
          </template>
        </Card>

        <Card>
          <template #content>
            <div class="flex flex-col gap-2">
              <label for="moneda" class="text-sm font-semibold">Moneda de esta tienda</label>
              <Select
                v-model="currency"
                input-id="moneda"
                :options="currencyOptions"
                option-label="label"
                option-value="value"
                fluid
              />
            </div>
          </template>
        </Card>

        <div class="flex flex-wrap justify-between gap-2">
          <Button severity="secondary" variant="outlined" @click="emit('back')">Atrás</Button>
          <Button :disabled="!canContinue" @click="emit('next')">Continuar</Button>
        </div>
      </section>
    </div>
  </div>
</template>
