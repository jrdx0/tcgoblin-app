import type { FetchMode } from '@/types/product'

export interface PageSnapshotRequest {
  url: string
}

export interface PageSnapshot {
  url: string
  html: string
  fetchMode: FetchMode
  takenAt: string
}
