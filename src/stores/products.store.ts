import { ref } from 'vue'
import { defineStore } from 'pinia'
import { request } from '@/api/http'
import type { CheckResponse, CreateProductRequest, CreateStoreRequest, Product, Store, StoreStatus } from '@/types/product'

const errorMessage = (error: unknown) => (error instanceof Error ? error.message : String(error))

const CHECK_POLL_MS = 3_000
const CHECK_TIMEOUT_MS = 90_000

export const useProductsStore = defineStore('products', () => {
  const products = ref<Product[]>([])
  const loading = ref(false)
  const loaded = ref(false)
  const loadError = ref<string | null>(null)
  const saving = ref(false)
  const saveError = ref<string | null>(null)

  async function fetchProducts() {
    loading.value = true
    loadError.value = null
    try {
      products.value = await request<Product[]>('/products')
      loaded.value = true
    } catch (error) {
      loadError.value = errorMessage(error)
    } finally {
      loading.value = false
    }
  }

  async function getProduct(id: string) {
    const cached = products.value.find((p) => p.id === id)
    if (cached) return cached
    return refreshProduct(id)
  }

  async function refreshProduct(id: string) {
    const product = await request<Product>(`/product/${encodeURIComponent(id)}`)
    const index = products.value.findIndex((p) => p.id === product.id)
    if (index === -1) products.value.push(product)
    else products.value[index] = product
    return products.value.find((p) => p.id === product.id) ?? product
  }

  async function run<T>(action: () => Promise<T>) {
    saving.value = true
    saveError.value = null
    try {
      return await action()
    } catch (error) {
      saveError.value = errorMessage(error)
      throw error
    } finally {
      saving.value = false
    }
  }

  function createProduct(payload: CreateProductRequest) {
    return run(async () => {
      const product = await request<Product>('/product', {
        method: 'POST',
        body: JSON.stringify(payload),
      })
      products.value.push(product)
      return product
    })
  }

  function addStore(productId: string, payload: CreateStoreRequest) {
    return run(async () => {
      const store = await request<Store>(`/product/${encodeURIComponent(productId)}/store`, {
        method: 'POST',
        body: JSON.stringify(payload),
      })
      products.value.find((p) => p.id === productId)?.stores.push(store)
      return store
    })
  }

  function deleteStore(productId: string, storeId: string) {
    return run(async () => {
      await request<void>(
        `/product/${encodeURIComponent(productId)}/store/${encodeURIComponent(storeId)}`,
        { method: 'DELETE' },
      )
      const product = products.value.find((p) => p.id === productId)
      if (product) product.stores = product.stores.filter((s) => s.id !== storeId)
    })
  }

  const favoritePending = ref<string[]>([])
  const favoriteError = ref<string | null>(null)

  async function setFavorite(productId: string, isFavorite: boolean) {
    const product = products.value.find((p) => p.id === productId)
    if (!product || favoritePending.value.includes(productId)) return
    favoritePending.value = [...favoritePending.value, productId]
    favoriteError.value = null
    const previous = product.isFavorite
    product.isFavorite = isFavorite
    try {
      await request<Product>(`/product/${encodeURIComponent(productId)}`, {
        method: 'PATCH',
        body: JSON.stringify({ isFavorite }),
      })
    } catch (error) {
      product.isFavorite = previous
      favoriteError.value = errorMessage(error)
    } finally {
      favoritePending.value = favoritePending.value.filter((id) => id !== productId)
    }
  }

  const statusPending = ref<string[]>([])
  const statusError = ref<string | null>(null)

  async function setStoreStatus(productId: string, storeId: string, status: Exclude<StoreStatus, 'failing'>) {
    if (statusPending.value.includes(storeId)) return
    statusPending.value = [...statusPending.value, storeId]
    statusError.value = null
    try {
      const store = await request<Store>(
        `/product/${encodeURIComponent(productId)}/store/${encodeURIComponent(storeId)}`,
        { method: 'PATCH', body: JSON.stringify({ status }) },
      )
      const product = products.value.find((p) => p.id === productId)
      const index = product?.stores.findIndex((s) => s.id === storeId) ?? -1
      if (product && index !== -1) product.stores[index] = store
    } catch (error) {
      statusError.value = errorMessage(error)
    } finally {
      statusPending.value = statusPending.value.filter((id) => id !== storeId)
    }
  }

  const checkingStores = ref<string[]>([])
  const checkError = ref<string | null>(null)
  const checkPending = ref(false)

  const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

  const checkedSince = (store: Store | undefined, since: number) =>
    !!store &&
    [store.lastSuccessAt, store.lastError?.date].some((date) => date != null && new Date(date).getTime() >= since)

  async function checkStore(productId: string, storeId: string) {
    if (checkingStores.value.includes(storeId)) return
    checkingStores.value = [...checkingStores.value, storeId]
    checkError.value = null
    checkPending.value = false
    try {
      const check = await request<CheckResponse>(
        `/product/${encodeURIComponent(productId)}/store/${encodeURIComponent(storeId)}/check`,
        { method: 'POST' },
      )
      const since = new Date(check.scheduledFor).getTime()

      for (let elapsed = 0; elapsed < CHECK_TIMEOUT_MS; elapsed += CHECK_POLL_MS) {
        await sleep(CHECK_POLL_MS)
        const product = await refreshProduct(productId)
        if (checkedSince(product.stores.find((s) => s.id === storeId), since)) return
      }
      checkPending.value = true
    } catch (error) {
      checkError.value = errorMessage(error)
    } finally {
      checkingStores.value = checkingStores.value.filter((id) => id !== storeId)
    }
  }

  return {
    products,
    loading,
    loaded,
    loadError,
    saving,
    saveError,
    fetchProducts,
    getProduct,
    refreshProduct,
    favoritePending,
    statusPending,
    statusError,
    setStoreStatus,
    favoriteError,
    setFavorite,
    checkingStores,
    checkError,
    checkPending,
    checkStore,
    createProduct,
    addStore,
    deleteStore,
  }
})
