/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_PRIMEVUE_LICENSE: string
  readonly VITE_API_URL: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
