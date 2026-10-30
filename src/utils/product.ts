import type { Product, Store } from '@/types/product'

export function hostOf(url: string) {
  try {
    return new URL(url).hostname
  } catch {
    return url
  }
}

export function lastPrice(store: Store) {
  return store.priceHistory.at(-1)?.price
}

export function formatMoney(value: number, currency?: string) {
  try {
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: currency ?? 'MXN',
      maximumFractionDigits: 2,
    }).format(value)
  } catch {
    return `${value.toLocaleString('es-MX')} ${currency ?? ''}`.trim()
  }
}

export function formatDateTime(iso: string) {
  return new Intl.DateTimeFormat('es-MX', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(iso))
}

export function summarize(product: Product) {
  const active = product.stores.filter((s) => s.status !== 'paused')
  const priced = active.flatMap((store) => {
    const price = lastPrice(store)
    return price == null ? [] : [{ store, price }]
  })

  const average = priced.length ? priced.reduce((sum, p) => sum + p.price, 0) / priced.length : undefined
  const cheapest = priced.reduce<(typeof priced)[number] | undefined>(
    (min, p) => (!min || p.price < min.price ? p : min),
    undefined,
  )
  const offerCount = average == null ? 0 : priced.filter((p) => p.price < average).length

  const dates = product.stores.flatMap((s) => [
    ...s.priceHistory.map((h) => h.date),
    ...(s.lastError ? [s.lastError.date] : []),
  ])
  const lastCheckedAt = dates.sort().at(-1)

  return {
    storeCount: product.stores.length,
    activeCount: active.length,
    pricedCount: priced.length,
    failingCount: product.stores.filter((s) => s.status === 'failing').length,
    pausedCount: product.stores.filter((s) => s.status === 'paused').length,
    currency: product.stores[0]?.currency,
    average,
    cheapest,
    offerCount,
    lastCheckedAt,
  }
}

export type ProductSummary = ReturnType<typeof summarize>

const errorReasons: Record<string, string> = {
  element_not_found: 'el elemento del precio ya no se encuentra',
  timeout: 'la página tardó demasiado en responder',
  page_unavailable: 'la página no está disponible',
  invalid_text: 'el texto leído no es un precio válido',
}

export function describeError(reason: string) {
  return errorReasons[reason] ?? reason
}

export function formatDay(date: Date | string) {
  return new Intl.DateTimeFormat('es-MX', { day: 'numeric', month: 'short' }).format(new Date(date))
}

export const storePalette = [
  { color: 'light-dark(#059669, #10b981)', dash: [] },
  { color: 'light-dark(#2563eb, #4d6bff)', dash: [1, 6] },
  { color: 'light-dark(#ea580c, #f97316)', dash: [8, 5] },
  { color: 'light-dark(#71717a, #a1a1aa)', dash: [10, 4, 2, 4] },
  { color: 'light-dark(#9333ea, #a855f7)', dash: [1, 4] },
  { color: 'light-dark(#db2777, #ec4899)', dash: [6, 3, 2, 3, 2, 3] },
]

const startOfDay = (date: Date) => new Date(date.getFullYear(), date.getMonth(), date.getDate())
const endOfDay = (date: Date) => new Date(date.getFullYear(), date.getMonth(), date.getDate(), 23, 59, 59, 999)

export function dailySeries(stores: Store[], days?: number) {
  const dates = stores.flatMap((s) => s.priceHistory.map((h) => new Date(h.date).getTime()))
  if (!dates.length) return undefined

  const today = startOfDay(new Date())
  const first = startOfDay(new Date(Math.min(...dates)))
  const start = days ? new Date(today.getFullYear(), today.getMonth(), today.getDate() - (days - 1)) : first

  const axis: Date[] = []
  for (let d = new Date(start); d <= today; d = new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1)) axis.push(d)

  const values = stores.map((store) => {
    const history = [...store.priceHistory].sort((a, b) => a.date.localeCompare(b.date))
    const failingSince = store.status === 'failing' && store.lastError ? startOfDay(new Date(store.lastError.since)) : undefined
    return axis.map((day) => {
      if (failingSince && day >= failingSince) return null
      const known = history.filter((h) => new Date(h.date) <= endOfDay(day)).at(-1)
      return known?.price ?? null
    })
  })

  return { days: axis.map(formatDay), values }
}

export function niceScale(prices: number[]) {
  const low = Math.min(...prices)
  const high = Math.max(...prices)
  const span = Math.max(high - low, Math.abs(high) * 0.1, 1)
  const magnitude = 10 ** Math.floor(Math.log10(span / 4))
  const step = [1, 2, 5, 10].map((m) => m * magnitude).find((s) => span / s <= 5) ?? magnitude * 10
  const min = Math.floor(low / step) * step
  const max = Math.ceil(high / step) * step
  return { min, max: max === min ? min + step : max, step }
}

export function parsePrice(text: string) {
  const raw = text.replace(/[^\d.,]/g, '')
  if (!raw) return undefined
  const lastComma = raw.lastIndexOf(',')
  const lastDot = raw.lastIndexOf('.')
  const decimalSep =
    lastComma > lastDot && raw.length - lastComma - 1 <= 2
      ? ','
      : lastDot > lastComma && (lastComma !== -1 || raw.length - lastDot - 1 <= 2)
        ? '.'
        : undefined
  const normalized = decimalSep
    ? raw.split(decimalSep === ',' ? '.' : ',').join('').replace(decimalSep, '.')
    : raw.replace(/[.,]/g, '')
  const value = Number(normalized)
  return Number.isFinite(value) ? value : undefined
}
