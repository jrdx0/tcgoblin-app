import { ref } from 'vue'
import { defineStore } from 'pinia'
import { breakpointsTailwind, useBreakpoints } from '@vueuse/core'

export const useInterfaceStore = defineStore('interface', () => {
  const title = ref('');

  const breakpoints = useBreakpoints(breakpointsTailwind)
  const isMobile = breakpoints.smaller('lg')

  return {
    title,
    isMobile,
  }
})
