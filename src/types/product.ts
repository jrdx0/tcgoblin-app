export type FetchMode = 'http' | 'browser'
export type StoreStatus = 'ok' | 'failing' | 'paused'

export interface PricePoint {
  date: string
  price: number
}

export interface StoreError {
  date: string
  reason: string
  since: string
}

export interface Store {
  id: string
  url: string
  selector: string
  currency: string
  fetchMode: FetchMode
  status: StoreStatus
  lastError: StoreError | null
  lastSuccessAt: string | null
  createdAt: string
  priceHistory: PricePoint[]
}

export interface Product {
  id: string
  name: string
  notes: string
  isFavorite: boolean
  createdAt: string
  updatedAt: string
  stores: Store[]
}

export type CheckStatus = 'pending' | 'running' | 'done' | 'cancelled'

export interface CheckResponse {
  id: string
  productId: string
  storeId: string
  scheduledFor: string
  attempt: number
  status: CheckStatus
  startedAt: string | null
  finishedAt: string | null
  result: string | null
  fetchMode: FetchMode | null
  text: string | null
  price: number | null
  error: string | null
}

export interface CreateStoreRequest {
  url: string
  selector: string
  currency: string
  fetchMode: FetchMode
}

export interface CreateProductRequest {
  name: string
  notes: string
  stores: CreateStoreRequest[]
}
