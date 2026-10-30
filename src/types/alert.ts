export type AlertKind = 'price_drop' | 'price_rise' | 'failure' | 'recovery'
export type DeliveryStatus = 'pending' | 'sent' | 'failed'

export interface AlertFailure {
  reason: string
  message: string | null
  lastSuccessAt: string | null
}

export interface AlertDelivery {
  status: DeliveryStatus
  attempts: number
  lastAttemptAt: string | null
  error: string | null
}

export interface Alert {
  id: string
  createdAt: string
  kind: AlertKind
  productId: string
  productName: string
  storeId: string
  storeUrl: string
  currency: string
  previousPrice: number | null
  price: number | null
  belowAverage: boolean
  failure: AlertFailure | null
  delivery: AlertDelivery
}
