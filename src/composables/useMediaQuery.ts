import { onBeforeUnmount, onMounted, ref } from 'vue'

export function useMediaQuery(query: string) {
  const matches = ref(false)
  let media: MediaQueryList | undefined
  const onChange = (event: MediaQueryListEvent) => (matches.value = event.matches)

  onMounted(() => {
    media = window.matchMedia(query)
    matches.value = media.matches
    media.addEventListener('change', onChange)
  })
  onBeforeUnmount(() => media?.removeEventListener('change', onChange))

  return matches
}
