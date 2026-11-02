<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import { RouterView, useRoute } from 'vue-router'
import { storeToRefs } from 'pinia'
import {
  Sidebar,
  SidebarAside,
  SidebarBackdrop,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarLayout,
  SidebarMain,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarPanel,
  SidebarSpacer,
  SidebarTrigger,
} from 'primevue'
import InventoryIcon from '@iconify-vue/material-symbols/inventory-2-outline'
import NotificationsIcon from '@iconify-vue/material-symbols/notifications-outline'
import TuneIcon from '@iconify-vue/material-symbols/tune'
import MenuIcon from '@iconify-vue/material-symbols/menu'
import { useInterfaceStore } from '@/stores/interface.store'
import { useSettingsStore } from '@/stores/settings.store'

const route = useRoute()
const { title, isMobile } = storeToRefs(useInterfaceStore())
const open = ref(!isMobile.value)

watch(isMobile, (mobile) => (open.value = !mobile))
watch(
  () => route.fullPath,
  () => {
    if (isMobile.value) open.value = false
  },
)

const nav = [
  { label: 'Productos', to: '/', icon: InventoryIcon, match: ['products', 'product', 'product-edit', 'new-url'] },
  { label: 'Alertas', to: '/alerts', icon: NotificationsIcon, match: ['alerts'] },
  { label: 'Configuración', to: '/settings', icon: TuneIcon, match: ['settings'] },
]

const activeName = computed(() => String(route.name ?? ''))

const settingsStore = useSettingsStore()
const { settings, loadError: settingsError } = storeToRefs(settingsStore)

const now = ref(new Date())
let clock: ReturnType<typeof setInterval> | undefined

onMounted(() => {
  if (!settings.value) settingsStore.fetchSettings()
  clock = setInterval(() => (now.value = new Date()), 60_000)
})
onUnmounted(() => clearInterval(clock))

function timeIn(timeZone: string, date: Date) {
  const parts = new Intl.DateTimeFormat('en-GB', { timeZone, hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).formatToParts(date)
  const part = (type: string) => parts.find((p) => p.type === type)?.value ?? '00'
  return `${part('hour')}:${part('minute')}`
}

const nextDailyCheck = computed(() => {
  const dailyCheck = settings.value?.dailyCheck
  if (!dailyCheck) return settingsError.value ? 'No disponible' : '—'

  try {
    const day = timeIn(dailyCheck.timezone, now.value) < dailyCheck.time ? 'Hoy' : 'Mañana'
    return `${day}, ${dailyCheck.time}`
  } catch {
    return dailyCheck.time
  }
})

const browserTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone
const dailyCheckTimezone = computed(() => {
  const timezone = settings.value?.dailyCheck.timezone
  return timezone && timezone !== browserTimezone ? timezone : undefined
})
</script>

<template>
  <SidebarLayout>
    <SidebarBackdrop v-if="isMobile && open" />
    <Sidebar
      id="principal"
      v-model:open="open"
      :collapsible="isMobile ? 'offcanvas' : 'none'"
      :overlay="isMobile"
      as="nav"
      aria-label="Principal"
      class="lg:sticky! lg:top-0 lg:h-svh lg:self-start"
    >
      <SidebarSpacer />
      <SidebarAside class="max-lg:fixed! max-lg:h-svh">
        <SidebarPanel>
          <SidebarHeader>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton as="RouterLink" to="/">
                  <img src="/favicons/android-chrome-192x192.png" alt="" class="size-6 shrink-0" />
                  <span class="font-bold">TCGoblin</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarHeader>

          <SidebarContent>
            <SidebarGroup>
              <SidebarGroupContent>
                <SidebarMenu>
                  <SidebarMenuItem v-for="item in nav" :key="item.to">
                    <SidebarMenuButton
                      as="RouterLink"
                      :to="item.to"
                      :is-active="item.match.includes(activeName)"
                      :aria-current="item.match.includes(activeName) ? 'page' : undefined"
                    >
                      <component :is="item.icon" height="1rem" />
                      <span>{{ item.label }}</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          </SidebarContent>

          <SidebarFooter>
            <div class="flex flex-col gap-0.5 rounded-border border border-surface p-3">
              <span class="text-xs text-muted-color">Próxima revisión diaria</span>
              <span class="text-sm font-semibold">{{ nextDailyCheck }}</span>
              <span v-if="dailyCheckTimezone" class="text-xs text-muted-color">Hora de {{ dailyCheckTimezone }}</span>
            </div>
          </SidebarFooter>
        </SidebarPanel>
      </SidebarAside>
    </Sidebar>

    <SidebarMain>
      <header
        v-if="isMobile"
        class="sticky top-0 z-10 flex h-12 items-center gap-2 border-b border-surface bg-(--p-content-background) py-4 px-2"
      >
        <SidebarTrigger severity="secondary" target="principal" :text="true" size="small" aria-label="Abrir menú">
          <MenuIcon height="1.5em" />
        </SidebarTrigger>
        <h1 class="m-0 min-w-0 flex-1 truncate font-semibold">{{ title || 'TCGoblin' }}</h1>
        <div id="mobile-header-actions" class="flex shrink-0 items-center gap-2" />
      </header>
      <main class="flex min-w-0 flex-col gap-6 px-4 pb-4 lg:p-8">
        <RouterView />
      </main>
    </SidebarMain>
  </SidebarLayout>
</template>
