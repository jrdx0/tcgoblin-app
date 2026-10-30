import { ref } from 'vue'
import { defineStore } from 'pinia'
import { request } from '@/api/http'
import { useProductsStore } from '@/stores/products.store'
import type { Alert } from '@/types/alert'

const errorMessage = (error: unknown) => (error instanceof Error ? error.message : String(error))

export const useAlertsStore = defineStore('alerts', () => {
  const alerts = ref<Alert[]>([])
  const loading = ref(false)
  const loadError = ref<string | null>(null)

  async function fetchAlerts() {
    loading.value = true
    loadError.value = null
    try {
      alerts.value = await request<Alert[]>('/alerts')
    } catch (error) {
      loadError.value = errorMessage(error)
    } finally {
      loading.value = false
    }
  }

  const testing = ref(false)
  const testError = ref<string | null>(null)

  async function createTestAlert() {
    testing.value = true
    testError.value = null
    try {
      const productsStore = useProductsStore()
      if (!productsStore.products.length) {
        await productsStore.fetchProducts()
        if (productsStore.loadError) throw new Error(`No se pudieron cargar los productos. ${productsStore.loadError}`)
      }

      const product = productsStore.products[0]
      if (!product) throw new Error('No se puede hacer la prueba sin un producto creado.')
      const store = product.stores[0]
      if (!store) throw new Error(`El producto "${product.name}" no tiene tiendas registradas.`)

      const alert = await request<Alert>('/alerts/test', {
        method: 'POST',
        body: JSON.stringify({
          createdAt: '2026-10-23T02:04:00Z',
          kind: 'price_drop',
          productId: product.id,
          productName: `[TEST ALERT] ${product.name}`,
          storeId: store.id,
          storeUrl: store.url,
          currency: store.currency,
          previousPrice: 289.0,
          price: 259.0,
          belowAverage: true,
          failure: null,
          delivery: {
            status: 'pending',
            attempts: 0,
            lastAttemptAt: null,
            error: null,
          },
        }),
      })
      if (alert?.id) alerts.value = [alert, ...alerts.value.filter((a) => a.id !== alert.id)]
      else await fetchAlerts()
      return alert
    } catch (error) {
      testError.value = errorMessage(error)
    } finally {
      testing.value = false
    }
  }

  const deleting = ref(false)
  const deleteError = ref<string | null>(null)

  async function deleteAlert(id: string) {
    deleting.value = true
    deleteError.value = null
    try {
      await request<void>(`/alert/${encodeURIComponent(id)}`, { method: 'DELETE' })
      alerts.value = alerts.value.filter((a) => a.id !== id)
    } catch (error) {
      deleteError.value = errorMessage(error)
    } finally {
      deleting.value = false
    }
  }

  async function deleteAllAlerts() {
    deleting.value = true
    deleteError.value = null
    try {
      await request<void>('/alerts', { method: 'DELETE' })
      alerts.value = []
    } catch (error) {
      deleteError.value = errorMessage(error)
    } finally {
      deleting.value = false
    }
  }

  return {
    alerts,
    loading,
    loadError,
    testing,
    testError,
    deleting,
    deleteError,
    fetchAlerts,
    createTestAlert,
    deleteAlert,
    deleteAllAlerts,
  }
})
