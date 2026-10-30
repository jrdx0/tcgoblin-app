export interface DiscordTest {
  sentAt: string
  delivered: boolean
  error: string | null
}

export interface Settings {
  discord: {
    webhookConfigured: boolean
    webhookUrl: string | null
    notifyRecovery: boolean
    lastTest: DiscordTest | null
  }
  dailyCheck: {
    time: string
    timezone: string
  }
  limits: {
    pageTimeoutSeconds: number
    storeDelaySeconds: number
    retryAfterMinutes: number
  }
  updatedAt: string
}

export interface UpdateSettingsRequest {
  discord: { notifyRecovery: boolean }
  dailyCheck: Settings['dailyCheck']
  limits: Settings['limits']
}
