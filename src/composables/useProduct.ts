import { computed, ref, watch } from 'vue'
import { ApiError } from '@/api/http'
import { useProductsStore } from '@/stores/products.store'

export function useProduct(id: () => string) {
  const productsStore = useProductsStore()

  const product = computed(() => productsStore.products.find((p) => p.id === id()))
  const loading = ref(false)
  const error = ref<string | null>(null)
  const notFound = ref(false)

  async function load() {
    error.value = null
    notFound.value = false
    if (product.value) return

    loading.value = true
    try {
      await productsStore.getProduct(id())
    } catch (e) {
      if (e instanceof ApiError && e.status === 404) notFound.value = true
      else error.value = e instanceof Error ? e.message : String(e)
    } finally {
      loading.value = false
    }
  }

  watch(id, load, { immediate: true })

  return { product, loading, error, notFound, reload: load }
}
