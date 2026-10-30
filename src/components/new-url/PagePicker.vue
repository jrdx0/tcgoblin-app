<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { buildPickerDocument, PICKER_SOURCE, type PageToPicker, type PickerToPage } from '@/utils/pagePicker'

const props = defineProps<{ html: string; pageUrl: string; selector: string }>()
const emit = defineEmits<{
  pick: [selector: string]
  result: [result: { selector: string; count: number; firstText: string | null; invalid: boolean }]
}>()

const frame = ref<HTMLIFrameElement>()
const ready = ref(false)
const srcdoc = computed(() => buildPickerDocument(props.html, props.pageUrl))

function test() {
  if (!ready.value) return
  const message: PickerToPage = { source: PICKER_SOURCE, type: 'test', selector: props.selector }
  frame.value?.contentWindow?.postMessage(message, '*')
}

function onMessage(event: MessageEvent<PageToPicker>) {
  if (event.source !== frame.value?.contentWindow || event.data?.source !== PICKER_SOURCE) return
  const data = event.data
  if (data.type === 'ready') {
    ready.value = true
    test()
  } else if (data.type === 'pick') {
    emit('pick', data.selector)
  } else if (data.type === 'result') {
    emit('result', { selector: data.selector, count: data.count, firstText: data.firstText, invalid: data.invalid })
  }
}

watch(srcdoc, () => (ready.value = false))
watch(() => props.selector, test)

onMounted(() => window.addEventListener('message', onMessage))
onBeforeUnmount(() => window.removeEventListener('message', onMessage))
</script>

<template>
  <iframe
    ref="frame"
    :srcdoc="srcdoc"
    sandbox="allow-scripts"
    referrerpolicy="no-referrer"
    title="Página de la tienda: haz clic sobre el precio"
    class="block h-[640px] w-full border-0 bg-white"
  />
</template>
