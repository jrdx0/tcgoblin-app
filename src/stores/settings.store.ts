import { ref } from 'vue'
import { defineStore } from 'pinia'
import { request } from '@/api/http'
import type { DiscordTest, Settings, UpdateSettingsRequest } from '@/types/settings'

const errorMessage = (error: unknown) => (error instanceof Error ? error.message : String(error))

export const useSettingsStore = defineStore('settings', () => {
  const settings = ref<Settings | null>(null)
  const loading = ref(false)
  const loadError = ref<string | null>(null)
  const saving = ref(false)
  const saveError = ref<string | null>(null)

  async function fetchSettings() {
    loading.value = true
    loadError.value = null
    try {
      settings.value = await request<Settings>('/settings')
    } catch (error) {
      loadError.value = errorMessage(error)
    } finally {
      loading.value = false
    }
  }

  async function updateSettings(payload: UpdateSettingsRequest) {
    saving.value = true
    saveError.value = null
    try {
      const response = await request<Settings | undefined>('/settings', {
        method: 'PUT',
        body: JSON.stringify(payload),
      })
      if (response?.dailyCheck) {
        settings.value = response
      } else if (settings.value) {
        settings.value = {
          ...settings.value,
          discord: { ...settings.value.discord, ...payload.discord },
          dailyCheck: payload.dailyCheck,
          limits: payload.limits,
          updatedAt: new Date().toISOString(),
        }
      }
    } catch (error) {
      saveError.value = errorMessage(error)
      throw error
    } finally {
      saving.value = false
    }
  }

  const webhookSaving = ref(false)
  const webhookError = ref<string | null>(null)

  async function setWebhook(webhookUrl: string) {
    webhookSaving.value = true
    webhookError.value = null
    try {
      await request<unknown>('/settings/webhook', {
        method: 'PUT',
        body: JSON.stringify({ webhookUrl }),
      })
      if (settings.value) {
        settings.value.discord = { ...settings.value.discord, webhookConfigured: true, webhookUrl: null, lastTest: null }
        settings.value.updatedAt = new Date().toISOString()
      }
    } catch (error) {
      webhookError.value = errorMessage(error)
      throw error
    } finally {
      webhookSaving.value = false
    }
  }

  const testing = ref(false)
  const testError = ref<string | null>(null)

  async function refreshLastTest() {
    const latest = await request<Settings>('/settings')
    if (settings.value) settings.value.discord = { ...settings.value.discord, lastTest: latest.discord.lastTest }
  }

  async function testWebhook() {
    testing.value = true
    testError.value = null
    try {
      const response = await request<DiscordTest | undefined>('/settings/webhook/test', { method: 'POST' })
      if (response && typeof response.delivered === 'boolean' && settings.value) {
        settings.value.discord = { ...settings.value.discord, lastTest: response }
      } else {
        await refreshLastTest()
      }
    } catch (error) {
      testError.value = errorMessage(error)
      await refreshLastTest().catch(() => {})
    } finally {
      testing.value = false
    }
  }

  return {
    settings,
    loading,
    loadError,
    saving,
    saveError,
    webhookSaving,
    webhookError,
    testing,
    testError,
    fetchSettings,
    updateSettings,
    setWebhook,
    testWebhook,
  }
})
