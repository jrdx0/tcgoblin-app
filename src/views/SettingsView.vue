<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from 'vue'
import { storeToRefs } from 'pinia'
import {
  Button,
  Card,
  Dialog,
  DatePicker,
  Divider,
  InputGroup,
  InputGroupAddon,
  InputNumber,
  InputText,
  Message,
  Select,
  ToggleSwitch,
} from 'primevue'
import InfoIcon from '@iconify-vue/material-symbols/info-outline'
import CheckCircleIcon from '@iconify-vue/material-symbols/check-circle-outline'
import CancelIcon from '@iconify-vue/material-symbols/cancel-outline'
import WarningIcon from '@iconify-vue/material-symbols/warning-outline'
import PageHeader from '@/components/PageHeader.vue'
import { useSettingsStore } from '@/stores/settings.store'
import type { Settings, UpdateSettingsRequest } from '@/types/settings'
import { formatDateTime } from '@/utils/product'

const settingsStore = useSettingsStore()
const { settings, loading, loadError, saving, saveError, webhookSaving, webhookError, testing, testError } =
  storeToRefs(settingsStore)

onMounted(() => settingsStore.fetchSettings())

const toDate = (time: string) => {
  const [hours = 0, minutes = 0] = time.split(':').map(Number)
  const d = new Date()
  d.setHours(hours, minutes, 0, 0)
  return d
}
const toTime = (date: Date) =>
  `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`

const fromSettings = (s: Settings) => ({
  notifyRecovery: s.discord.notifyRecovery,
  time: toDate(s.dailyCheck.time),
  timezone: s.dailyCheck.timezone,
  pageTimeout: s.limits.pageTimeoutSeconds,
  storePause: s.limits.storeDelaySeconds,
  retryAfter: s.limits.retryAfterMinutes,
})

const form = reactive({
  notifyRecovery: true,
  time: toDate('02:00') as Date | null,
  timezone: 'America/Mexico_City',
  pageTimeout: 30 as number | null,
  storePause: 5 as number | null,
  retryAfter: 30 as number | null,
})
const savedNotice = ref(false)

function discard() {
  if (settings.value) Object.assign(form, fromSettings(settings.value))
  saveError.value = null
}

watch(settings, discard, { immediate: true })

const payload = computed<UpdateSettingsRequest | undefined>(() => {
  if (!form.time || form.pageTimeout == null || form.storePause == null || form.retryAfter == null) return undefined
  return {
    discord: { notifyRecovery: form.notifyRecovery },
    dailyCheck: { time: toTime(form.time), timezone: form.timezone },
    limits: {
      pageTimeoutSeconds: form.pageTimeout,
      storeDelaySeconds: form.storePause,
      retryAfterMinutes: form.retryAfter,
    },
  }
})

const dirty = computed(() => {
  const s = settings.value
  const p = payload.value
  if (!s || !p) return !!s
  return (
    p.discord.notifyRecovery !== s.discord.notifyRecovery ||
    p.dailyCheck.time !== s.dailyCheck.time ||
    p.dailyCheck.timezone !== s.dailyCheck.timezone ||
    p.limits.pageTimeoutSeconds !== s.limits.pageTimeoutSeconds ||
    p.limits.storeDelaySeconds !== s.limits.storeDelaySeconds ||
    p.limits.retryAfterMinutes !== s.limits.retryAfterMinutes
  )
})

watch(dirty, (value) => {
  if (value) savedNotice.value = false
})

async function save() {
  if (!payload.value) return
  try {
    await settingsStore.updateSettings(payload.value)
    savedNotice.value = true
  } catch {
    savedNotice.value = false
  }
}

const supportedTimezones = (Intl as unknown as { supportedValuesOf?: (key: string) => string[] }).supportedValuesOf?.(
  'timeZone',
)
const timezones = computed(() => {
  const list = supportedTimezones ?? ['America/Mexico_City', 'UTC']
  return list.includes(form.timezone) ? list : [form.timezone, ...list]
})

const webhookDisplay = computed(() => {
  const discord = settings.value?.discord
  if (!discord?.webhookConfigured) return ''
  return discord.webhookUrl ?? 'https://discord.com/api/webhooks/••••••••••••••••'
})
const lastTest = computed(() => settings.value?.discord.lastTest ?? null)

const webhookDialog = ref(false)
const newWebhook = ref('')
const webhookTouched = ref(false)
const webhookValid = computed(() =>
  /^https:\/\/(?:(?:ptb|canary)\.)?discord(?:app)?\.com\/api\/webhooks\/\d+\/[\w-]+\/?$/.test(newWebhook.value.trim()),
)

function openWebhookDialog() {
  newWebhook.value = ''
  webhookTouched.value = false
  webhookError.value = null
  webhookDialog.value = true
}

async function saveWebhook() {
  webhookTouched.value = true
  if (!webhookValid.value) return
  try {
    await settingsStore.setWebhook(newWebhook.value.trim())
    webhookDialog.value = false
  } catch {
    return
  }
}
</script>

<template>
  <PageHeader title="Configuración" />

  <div class="flex max-w-190 flex-col gap-5">
    <Message v-if="loadError" severity="error" :closable="false">
      <template #icon><WarningIcon height="1rem" /></template>
      <div class="flex flex-wrap items-center gap-3 text-sm">
        <span class="flex-[1_1_280px]"><strong>No se pudo cargar la configuración.</strong> {{ loadError }}</span>
        <Button severity="danger" variant="outlined" size="small" :disabled="loading" @click="settingsStore.fetchSettings()">
          Reintentar
        </Button>
      </div>
    </Message>

    <Card aria-labelledby="t-discord">
      <template #title>
        <h2 id="t-discord" class="m-0 text-lg font-semibold">Alertas en Discord</h2>
      </template>
      <template #subtitle><span class="text-sm">Se envía un mensaje cuando cambia un precio o cuando una url falla.</span></template>
      <template #content>
        <div class="flex flex-col gap-5">
          <div class="flex flex-col gap-2">
            <label for="webhook" class="text-sm font-semibold">URL del webhook</label>
            <div class="flex flex-wrap gap-2">
              <InputText
                id="webhook"
                :model-value="webhookDisplay"
                placeholder="Sin configurar"
                readonly
                class="flex-[1_1_300px]"
              />
              <Button severity="secondary" variant="outlined" :disabled="!settings" @click="openWebhookDialog">
                {{ settings?.discord.webhookConfigured ? 'Cambiar url' : 'Configurar url' }}
              </Button>
            </div>
            <span class="text-[13px] text-muted-color">
              Contiene un token: se guarda solo en el servidor y no se vuelve a mostrar completa.
            </span>
          </div>

          <div class="flex flex-wrap items-center justify-between gap-3 rounded-border border border-surface px-4 py-3.5">
            <div
              v-if="lastTest"
              class="flex items-center gap-2.5 text-sm font-semibold"
              :class="lastTest.delivered ? 'text-green-700 dark:text-green-400' : 'text-red-700 dark:text-red-400'"
            >
              <CheckCircleIcon v-if="lastTest.delivered" height="1rem" />
              <CancelIcon v-else height="1rem" />
              <span>
                {{ lastTest.delivered ? 'Último mensaje de prueba entregado' : 'El último mensaje de prueba falló' }}
                <span class="block text-[13px] font-normal text-muted-color">
                  {{ formatDateTime(lastTest.sentAt) }}{{ lastTest.error ? ` · ${lastTest.error}` : '' }}
                </span>
              </span>
            </div>
            <span v-else class="text-sm text-muted-color">Todavía no se ha enviado un mensaje de prueba.</span>
            <Button variant="outlined" :disabled="!settings?.discord.webhookConfigured || testing" @click="settingsStore.testWebhook()">
              {{ testing ? 'Enviando…' : 'Enviar mensaje de prueba' }}
            </Button>
          </div>

          <Message v-if="testError" severity="error" :closable="false">
            <template #icon><CancelIcon height="1rem" /></template>
            <span class="text-sm"><strong>No se pudo enviar el mensaje de prueba.</strong> {{ testError }}</span>
          </Message>

          <div class="flex items-center justify-between gap-4">
            <div class="flex flex-col gap-0.5">
              <label for="recup" class="text-sm font-semibold">Avisar cuando una url se recupera</label>
              <span class="text-[13px] text-muted-color">Un solo mensaje cuando vuelve a leerse el precio tras un fallo.</span>
            </div>
            <ToggleSwitch class="shrink-0" v-model="form.notifyRecovery" input-id="recup" />
          </div>
        </div>
      </template>
    </Card>

    <Card aria-labelledby="t-revision">
      <template #title>
        <h2 id="t-revision" class="m-0 text-lg font-semibold">Revisión diaria</h2>
      </template>
      <template #subtitle><span class="text-sm">Todas las urls se revisan una vez al día, a la misma hora.</span></template>
      <template #content>
        <div class="flex flex-wrap gap-4">
          <div class="flex flex-[1_1_200px] flex-col gap-2">
            <label for="hora" class="text-sm font-semibold">Hora de la revisión</label>
            <DatePicker v-model="form.time" input-id="hora" time-only hour-format="24" fluid />
          </div>
          <div class="flex flex-[2_1_280px] flex-col gap-2">
            <label for="zona" class="text-sm font-semibold">Zona horaria de visualización</label>
            <Select v-model="form.timezone" input-id="zona" :options="timezones" filter fluid />
          </div>
        </div>

        <Divider />

        <h3 class="m-0 mb-3 text-sm font-semibold">Límites de cada revisión</h3>
        <div class="flex flex-wrap gap-4">
          <div class="flex flex-[1_1_200px] flex-col gap-2">
            <label for="limite" class="text-[13px] font-medium">Tiempo límite por página</label>
            <InputGroup>
              <InputNumber v-model="form.pageTimeout" input-id="limite" :min="5" />
              <InputGroupAddon><span class="text-sm">s</span></InputGroupAddon>
            </InputGroup>
          </div>
          <div class="flex flex-[1_1_200px] flex-col gap-2">
            <label for="pausa" class="text-[13px] font-medium">Pausa entre páginas de una misma tienda</label>
            <InputGroup>
              <InputNumber v-model="form.storePause" input-id="pausa" :min="0" />
              <InputGroupAddon><span class="text-sm">s</span></InputGroupAddon>
            </InputGroup>
          </div>
          <div class="flex flex-[1_1_200px] flex-col gap-2">
            <label for="reintento" class="text-[13px] font-medium">Reintento tras un fallo</label>
            <InputGroup>
              <InputNumber v-model="form.retryAfter" input-id="reintento" :min="1" />
              <InputGroupAddon><span class="text-sm">min</span></InputGroupAddon>
            </InputGroup>
          </div>
        </div>
      </template>
    </Card>

    <Message v-if="saveError" severity="error" :closable="false">
      <template #icon><CancelIcon height="1rem" /></template>
      <span class="text-sm"><strong>No se pudieron guardar los cambios.</strong> {{ saveError }}</span>
    </Message>
    <Message v-else-if="savedNotice" severity="success" :closable="false" role="status">
      <template #icon><CheckCircleIcon height="1rem" /></template>
      <span class="text-sm">Cambios guardados.</span>
    </Message>

    <div class="flex flex-wrap items-center justify-end gap-2">
      <span v-if="settings" class="mr-auto text-[13px] text-muted-color">
        Última modificación: {{ formatDateTime(settings.updatedAt) }}
      </span>
      <Button severity="secondary" variant="outlined" :disabled="!dirty || saving" @click="discard">Descartar cambios</Button>
      <Button :disabled="!dirty || !payload || saving" @click="save">{{ saving ? 'Guardando…' : 'Guardar cambios' }}</Button>
    </div>
  </div>

  <Dialog
    v-model:visible="webhookDialog"
    modal
    :closable="!webhookSaving"
    :header="settings?.discord.webhookConfigured ? 'Cambiar URL del webhook' : 'Configurar URL del webhook'"
    class="w-[min(32rem,calc(100vw-2rem))]"
  >
    <form class="flex flex-col gap-4" @submit.prevent="saveWebhook">
      <span class="text-sm text-muted-color">
        En Discord: Ajustes del canal › Integraciones › Webhooks › Copiar URL del webhook.
      </span>
      <div class="flex flex-col gap-2">
        <label for="nuevo-webhook" class="text-sm font-semibold">URL del webhook</label>
        <InputText
          id="nuevo-webhook"
          v-model="newWebhook"
          type="url"
          placeholder="https://discord.com/api/webhooks/…"
          autocomplete="off"
          spellcheck="false"
          :invalid="webhookTouched && !webhookValid"
          aria-describedby="nuevo-webhook-ayuda"
          fluid
          autofocus
          @blur="webhookTouched = true"
        />
        <span
          id="nuevo-webhook-ayuda"
          class="text-[13px]"
          :class="webhookTouched && !webhookValid ? 'text-red-700 dark:text-red-400' : 'text-muted-color'"
        >
          {{
            webhookTouched && !webhookValid
              ? 'Debe ser una URL de webhook de Discord: https://discord.com/api/webhooks/…'
              : 'Reemplaza a la URL actual. Después no se vuelve a mostrar completa.'
          }}
        </span>
      </div>
      <Message v-if="webhookError" severity="error" :closable="false">
        <template #icon><CancelIcon height="1rem" /></template>
        <span class="text-sm"><strong>No se pudo guardar la URL.</strong> {{ webhookError }}</span>
      </Message>
      <div class="flex justify-end gap-2">
        <Button severity="secondary" variant="outlined" :disabled="webhookSaving" @click="webhookDialog = false">Cancelar</Button>
        <Button type="submit" :disabled="webhookSaving">{{ webhookSaving ? 'Guardando…' : 'Guardar url' }}</Button>
      </div>
    </form>
  </Dialog>
</template>
