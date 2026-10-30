import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import { request } from '@/api/http'
import { useProductsStore } from '@/stores/products.store'
import type { PageSnapshot, PageSnapshotRequest } from '@/types/page'
import type { FetchMode } from '@/types/product'
import { parsePrice, summarize } from '@/utils/product'

export type ProductMode = 'existing' | 'new'
export type PageState = 'idle' | 'loading' | 'ok' | 'error'

export const currencyOptions = [
  { label: 'MXN · Peso mexicano', value: 'MXN' },
  { label: 'USD · Dólar estadounidense', value: 'USD' },
]

interface TestResult {
  selector: string
  count: number
  firstText: string | null
  invalid: boolean
}

export const useNewUrlStore = defineStore('newUrl', () => {
  const productsStore = useProductsStore()

  const step = ref(1)
  const saved = ref(false)

  const url = ref('')
  const pageState = ref<PageState>('idle')
  const pageError = ref<string | null>(null)
  const snapshot = ref<PageSnapshot | null>(null)
  const requestedFetchMode = ref<FetchMode | null>(null)

  const productMode = ref<ProductMode>('existing')
  const productId = ref<string | undefined>()
  const newName = ref('')
  const notes = ref('')

  const selector = ref('')
  const testedSelector = ref('')
  const testResult = ref<TestResult | null>(null)
  const currency = ref('MXN')

  const host = computed(() => {
    try {
      const parsed = new URL(url.value.trim())
      return /^https?:$/.test(parsed.protocol) && parsed.hostname.includes('.') ? parsed.hostname : undefined
    } catch {
      return undefined
    }
  })

  const product = computed(() => productsStore.products.find((p) => p.id === productId.value))
  const productName = computed(() =>
    productMode.value === 'new' ? newName.value.trim() : (product.value?.name ?? ''),
  )
  const hasProduct = computed(() => productName.value.length > 0)

  const currentResult = computed(() =>
    testResult.value && testResult.value.selector === testedSelector.value ? testResult.value : null,
  )
  const matchCount = computed(() => currentResult.value?.count ?? 0)
  const matchState = computed(() => {
    if (!testedSelector.value.trim()) return 'empty'
    if (!currentResult.value) return 'testing'
    if (currentResult.value.invalid) return 'invalid'
    return matchCount.value === 0 ? 'none' : matchCount.value > 1 ? 'multiple' : 'ok'
  })
  const firstMatch = computed(() =>
    currentResult.value?.firstText != null ? { text: currentResult.value.firstText } : undefined,
  )
  const firstPrice = computed(() => (firstMatch.value ? parsePrice(firstMatch.value.text) : undefined))
  const canContinue = computed(
    () => (matchState.value === 'ok' || matchState.value === 'multiple') && firstPrice.value != null,
  )
  const fetchMode = computed(() => snapshot.value?.fetchMode ?? 'http')

  const currencyLabel = computed(() => currencyOptions.find((c) => c.value === currency.value)?.label ?? currency.value)

  const impact = computed(() => {
    if (productMode.value !== 'existing' || !product.value || firstPrice.value == null) return undefined
    const summary = summarize(product.value)
    if (summary.average == null) return undefined
    const stores = summary.pricedCount
    const average = Math.round(summary.average)
    const price = firstPrice.value
    const nextAverage = Math.round((average * stores + price) / (stores + 1))
    const diff = price - nextAverage
    return { stores, average, nextAverage, diff, pct: (diff / nextAverage) * 100 }
  })

  function reset(options: { productMode?: ProductMode; productId?: string } = {}) {
    step.value = 1
    saved.value = false
    url.value = ''
    pageState.value = 'idle'
    pageError.value = null
    snapshot.value = null
    requestedFetchMode.value = null
    productMode.value = options.productMode ?? 'existing'
    productId.value = options.productId ?? productsStore.products[0]?.id
    newName.value = ''
    notes.value = ''
    selector.value = ''
    testedSelector.value = ''
    testResult.value = null
    currency.value = 'MXN'
  }

  async function openPage(mode?: FetchMode) {
    pageError.value = null
    requestedFetchMode.value = mode ?? null
    if (!host.value) {
      pageState.value = 'error'
      pageError.value = 'La URL no es válida.'
      return false
    }
    pageState.value = 'loading'
    try {
      const body: PageSnapshotRequest = { url: url.value.trim() }
      const query = mode ? `?fetchMode=${mode}` : ''
      snapshot.value = await request<PageSnapshot>(`/page/snapshot${query}`, {
        method: 'POST',
        body: JSON.stringify(body),
      })
      pageState.value = 'ok'
      return true
    } catch (error) {
      pageState.value = 'error'
      pageError.value = error instanceof Error ? error.message : String(error)
      return false
    } finally {
      requestedFetchMode.value = null
    }
  }

  function pick(value: string) {
    selector.value = value
    testedSelector.value = value
  }

  function test() {
    testedSelector.value = selector.value.trim()
  }

  function applyResult(result: TestResult) {
    testResult.value = result
  }

  return {
    step,
    saved,
    url,
    pageState,
    pageError,
    snapshot,
    requestedFetchMode,
    productMode,
    productId,
    newName,
    notes,
    selector,
    testedSelector,
    currency,
    host,
    product,
    productName,
    hasProduct,
    matchCount,
    matchState,
    firstMatch,
    firstPrice,
    canContinue,
    fetchMode,
    currencyLabel,
    impact,
    reset,
    openPage,
    pick,
    test,
    applyResult,
  }
})
