<script setup lang="ts">
import { computed } from 'vue'
import { RouterLink } from 'vue-router'
import { storeToRefs } from 'pinia'
import { Button, Card, Divider, Message } from 'primevue'
import CheckCircleIcon from '@iconify-vue/material-symbols/check-circle-outline'
import CheckIcon from '@iconify-vue/material-symbols/check'
import CancelIcon from '@iconify-vue/material-symbols/cancel-outline'
import { useNewUrlStore } from '@/stores/newUrl.store'
import { useProductsStore } from '@/stores/products.store'
import { formatMoney } from '@/utils/product'

const emit = defineEmits<{ go: [step: number]; restart: [] }>()

const newUrlStore = useNewUrlStore()
const {
  saved,
  url,
  host,
  productMode,
  product,
  productName,
  notes,
  selector,
  currency,
  currencyLabel,
  firstMatch,
  firstPrice,
  fetchMode,
  impact
} =
  storeToRefs(newUrlStore)

const productsStore = useProductsStore()
const { saving, saveError } = storeToRefs(productsStore)

async function save() {
  const newStore = {
    url: url.value.trim(),
    selector: selector.value.trim(),
    currency: currency.value,
    fetchMode: fetchMode.value
  }
  try {
    if (productMode.value === 'new') {
      await productsStore.createProduct({
        name: productName.value,
        notes: notes.value.trim(),
        stores: [newStore],
      })
    } else if (product.value) {
      await productsStore.addStore(product.value.id, newStore)
    }
  } catch {
    return
  }
  saved.value = true
}

const money = (v: number) => `$${v.toLocaleString('es-MX')}`
const signed = (v: number, text: string) => (v < 0 ? `−${text}` : `+${text}`)

const productNote = computed(() =>
  productMode.value === 'new'
    ? 'Producto nuevo · esta URL será su primera tienda'
    : `Se suma como la tienda ${(product.value?.stores.length ?? 0) + 1} de este producto`,
)

const averageNote = computed(() => {
  const i = impact.value
  if (!i) return `${productName.value} tendrá promedio cuando agregues una segunda tienda.`
  const position = i.diff < 0 ? 'por debajo' : i.diff > 0 ? 'por encima' : 'justo en el promedio'
  const delta = `${signed(i.diff, money(Math.abs(i.diff)))} (${signed(i.pct, `${Math.abs(i.pct).toFixed(1)}%`)})`
  return `El promedio de ${productName.value} pasa de ${money(i.average)} a ${money(i.nextAverage)}, y esta tienda queda ${position}: ${delta}.`
})
</script>

<template>
  <div class="flex max-w-190 flex-col gap-5">
    <template v-if="!saved">
      <Card aria-labelledby="t-resumen">
        <template #title>
          <h2 id="t-resumen" class="m-0 text-lg font-semibold">Revisa antes de guardar</h2>
        </template>
        <template #content>
          <dl class="m-0 flex flex-col">
            <div class="flex flex-wrap items-center gap-x-4 gap-y-1 py-3.5">
              <dt class="flex-[0_0_160px] text-[13px] font-medium text-muted-color">Producto</dt>
              <dd class="m-0 flex flex-[1_1_240px] flex-col gap-0.5">
                <span class="text-sm font-semibold">{{ productName }}</span>
                <span class="text-[13px] text-muted-color">{{ productNote }}</span>
              </dd>
              <Button variant="link" @click="emit('go', 1)">Cambiar</Button>
            </div>
            <Divider />
            <div class="flex flex-wrap items-center gap-x-4 gap-y-1 py-3.5">
              <dt class="flex-[0_0_160px] text-[13px] font-medium text-muted-color">URL</dt>
              <dd class="m-0 min-w-0 flex-[1_1_240px] font-mono text-[13px] break-all">{{ url }}</dd>
              <Button variant="link" @click="emit('go', 1)">Cambiar</Button>
            </div>
            <Divider />
            <div class="flex flex-wrap items-center gap-x-4 gap-y-1 py-3.5">
              <dt class="flex-[0_0_160px] text-[13px] font-medium text-muted-color">Selector CSS</dt>
              <dd class="m-0 min-w-0 flex-[1_1_240px] font-mono text-[13px] break-all">{{ selector }}</dd>
              <Button variant="link" @click="emit('go', 2)">Cambiar</Button>
            </div>
            <Divider />
            <div class="flex flex-wrap items-center gap-x-4 gap-y-1 py-3.5">
              <dt class="flex-[0_0_160px] text-[13px] font-medium text-muted-color">Moneda</dt>
              <dd class="m-0 flex-[1_1_240px] text-sm font-medium">{{ currencyLabel }}</dd>
              <Button variant="link" @click="emit('go', 2)">Cambiar</Button>
            </div>
            <Divider />
            <div class="flex flex-wrap items-center gap-x-4 gap-y-1 py-3.5">
              <dt class="flex-[0_0_160px] text-[13px] font-medium text-muted-color">Lectura diaria</dt>
              <dd class="m-0 flex flex-[1_1_240px] flex-col gap-0.5">
                <span class="text-sm font-medium">{{ fetchMode === 'http' ? 'Petición HTTP simple' : 'Navegador del servidor' }}</span>
                <span class="text-[13px] text-muted-color">
                  {{ fetchMode === 'http' ? 'El precio viene en el HTML de la página' : 'La página carga el precio con JavaScript' }}
                </span>
              </dd>
            </div>
            <Divider />
            <div class="flex flex-wrap items-center gap-x-4 gap-y-1 pt-3.5">
              <dt class="flex-[0_0_160px] text-[13px] font-medium text-muted-color">Primer precio leído</dt>
              <dd class="m-0 flex flex-[1_1_240px] flex-col gap-0.5">
                <span class="text-xl font-bold tabular-nums">{{ firstPrice != null ? formatMoney(firstPrice, currency) : '—' }}</span>
                <span class="font-mono text-[13px] text-muted-color">Texto leído: {{ firstMatch?.text ?? '—' }}</span>
              </dd>
            </div>
          </dl>
        </template>
      </Card>

      <Card aria-labelledby="t-pasara">
        <template #title>
          <h2 id="t-pasara" class="m-0 text-lg font-semibold">Qué pasará al guardar</h2>
        </template>
        <template #content>
          <ul class="m-0 flex list-none flex-col gap-3 p-0 text-sm leading-relaxed">
            <li class="flex items-start gap-2.5">
              <CheckCircleIcon height="1rem" class="mt-0.5 flex-none text-primary" />
              <span>El primer precio se guarda como punto de partida del historial y <strong>no genera alerta</strong>.</span>
            </li>
            <li class="flex items-start gap-2.5">
              <CheckCircleIcon height="1rem" class="mt-0.5 flex-none text-primary" />
              <span>La URL se revisa una vez al día. La próxima revisión es mañana, a las 02:00.</span>
            </li>
            <li class="flex items-start gap-2.5">
              <CheckCircleIcon height="1rem" class="mt-0.5 flex-none text-primary" />
              <span>{{ averageNote }}</span>
            </li>
          </ul>
        </template>
      </Card>

      <Message v-if="saveError" severity="error" :closable="false">
        <template #icon><CancelIcon height="1rem" /></template>
        <span class="text-sm"><strong>No se pudo guardar.</strong> {{ saveError }}</span>
      </Message>

      <div class="flex flex-wrap justify-between gap-2">
        <Button severity="secondary" variant="outlined" :disabled="saving" @click="emit('go', 2)">Atrás</Button>
        <Button :disabled="saving" @click="save">{{ saving ? 'Guardando…' : 'Guardar url' }}</Button>
      </div>
    </template>

    <Card v-else role="status" aria-labelledby="t-listo">
      <template #content>
        <div class="flex flex-col items-start gap-5 p-2">
          <span aria-hidden="true" class="inline-flex size-12 items-center justify-center rounded-full bg-highlight">
            <CheckIcon height="1rem" class="text-2xl" />
          </span>
          <div class="flex flex-col gap-1.5">
            <h2 id="t-listo" class="m-0 text-[22px] font-bold tracking-tight">URL agregada a {{ productName }}</h2>
            <p class="m-0 text-sm leading-normal text-muted-color">
              Se guardó la primera lectura de <strong class="text-color">{{ host }}</strong>:
              <strong class="text-color tabular-nums">{{ firstPrice != null ? formatMoney(firstPrice, currency) : firstMatch?.text }}</strong>. Es el punto de partida del
              historial, así que no se envió ninguna alerta. La próxima revisión es mañana, a las 02:00.
            </p>
          </div>
          <div class="flex flex-wrap gap-2">
            <Button v-if="product && productMode === 'existing'" v-slot="slotProps" as-child>
              <RouterLink :to="`/products/${product.id}`" :class="slotProps.class">Ver {{ product.name }}</RouterLink>
            </Button>
            <Button severity="secondary" variant="outlined" @click="emit('restart')">Agregar otra url</Button>
            <Button v-slot="slotProps" as-child variant="text">
              <RouterLink to="/" :class="slotProps.class">Volver a productos</RouterLink>
            </Button>
          </div>
        </div>
      </template>
    </Card>
  </div>
</template>
