import { reactive } from 'vue'

export type Tone = 'success' | 'danger' | 'secondary' | 'warn' | 'info'

export interface ProductRow {
  id: string
  name: string
  stores: string
  avg: string
  avgNote?: string
  cheapStore: string
  cheapPrice: string
  diff: string
  isBelow: boolean
  offer: string
  offerTone: Tone
  status: string
  statusTone: Tone
  hasFailure: boolean
  hasOffer: boolean
  last: string
  notes?: string
  createdAt: string
}

export const products = reactive<ProductRow[]>([
  { id: 'gd02', name: 'Booster box GD02', stores: '4 tiendas', avg: '$1,844', cheapStore: 'Tienda Uno', cheapPrice: '$1,749', diff: '↓ −$95 · −5.2%', isBelow: true, offer: '2 de 4', offerTone: 'success', status: '1 con fallo', statusTone: 'danger', hasFailure: true, hasOffer: true, last: 'Revisado hoy, 02:04', notes: 'Caja de 24 sobres. Comparar siempre contra la edición en español.', createdAt: '10 oct 2026' },
  { id: 'gd01', name: 'Booster box GD01', stores: '4 tiendas', avg: '$1,602', cheapStore: 'Tienda Uno', cheapPrice: '$1,549', diff: '↓ −$53 · −3.3%', isBelow: true, offer: '2 de 4', offerTone: 'success', status: 'Al corriente', statusTone: 'success', hasFailure: false, hasOffer: true, last: 'Revisado hoy, 02:04', createdAt: '12 oct 2026' },
  { id: 'st01', name: 'Starter deck ST01', stores: '3 tiendas', avg: '$276', cheapStore: 'Tienda Dos', cheapPrice: '$259', diff: '↓ −$17 · −6.0%', isBelow: true, offer: '1 de 3', offerTone: 'success', status: 'Al corriente', statusTone: 'success', hasFailure: false, hasOffer: true, last: 'Revisado hoy, 02:04', createdAt: '12 oct 2026' },
  { id: 'st02', name: 'Starter deck ST02', stores: '3 tiendas', avg: '$269', cheapStore: 'Tienda Dos', cheapPrice: '$259', diff: '↓ −$10 · −3.7%', isBelow: true, offer: '1 de 3', offerTone: 'success', status: 'Al corriente', statusTone: 'success', hasFailure: false, hasOffer: true, last: 'Revisado hoy, 02:05', createdAt: '12 oct 2026' },
  { id: 'st03', name: 'Starter deck ST03', stores: '2 tiendas', avg: '$249', avgNote: 'Solo 1 URL activa', cheapStore: 'Tienda Uno', cheapPrice: '$249', diff: '—', isBelow: false, offer: '—', offerTone: 'secondary', status: '1 pausada', statusTone: 'secondary', hasFailure: false, hasOffer: false, last: 'Revisado hoy, 02:05', createdAt: '12 oct 2026' },
])

export interface StoreRow {
  name: string
  domain: string
  color: string
  dash: number[]
  price: string
  priceNote?: string
  change: string
  changeUp: boolean
  changeDate: string
  diff: string
  isBelow: boolean
  offer: boolean
  status: string
  statusTone: Tone
  statusNote: string
  mode: 'HTTP' | 'Navegador'
  failing: boolean
}

export interface ProductDetail {
  summary: string
  stats: { label: string; value: string; note: string; accent?: boolean }[]
  stores: StoreRow[]
  history: { days: string[]; average: number; series: Record<string, (number | null)[]> }
}

const days = Array.from({ length: 14 }, (_, i) => `${10 + i} oct`)

export const productDetails: Record<string, ProductDetail> = {
  gd02: {
    summary: '4 tiendas · 1 con fallo · Última revisión: hoy, 02:04',
    stats: [
      { label: 'Promedio', value: '$1,844', note: 'Último precio correcto de las 4 URLs activas' },
      { label: 'Más barata hoy', value: '$1,749', note: 'Tienda Uno · −$95 (−5.2%) frente al promedio', accent: true },
      { label: 'Mínimo histórico', value: '$1,749', note: 'Tienda Uno · desde el 20 oct' },
      { label: 'Máximo histórico', value: '$1,999', note: 'Tienda Cuatro · 10 al 14 oct' },
    ],
    stores: [
      { name: 'Tienda Uno', domain: 'tiendauno.example', color: '#059669', dash: [], price: '$1,749', change: '↓ −$50', changeUp: false, changeDate: '20 oct', diff: '−$95 · −5.2%', isBelow: true, offer: true, status: 'Al corriente', statusTone: 'success', statusNote: 'Revisado hoy, 02:04', mode: 'HTTP', failing: false },
      { name: 'Tienda Tres', domain: 'tiendatres.example', color: '#2563eb', dash: [2, 5], price: '$1,779', change: '↓ −$20', changeUp: false, changeDate: '16 oct', diff: '−$65 · −3.5%', isBelow: true, offer: true, status: 'Al corriente', statusTone: 'success', statusNote: 'Revisado hoy, 02:04', mode: 'Navegador', failing: false },
      { name: 'Tienda Dos', domain: 'tiendados.example', color: '#ea580c', dash: [8, 5], price: '$1,899', change: '↑ +$40', changeUp: true, changeDate: '18 oct', diff: '+$55 · +3.0%', isBelow: false, offer: false, status: 'Al corriente', statusTone: 'success', statusNote: 'Revisado hoy, 02:04', mode: 'HTTP', failing: false },
      { name: 'Tienda Cuatro', domain: 'tiendacuatro.example', color: '#71717a', dash: [10, 4, 2, 4], price: '$1,949', priceNote: 'Último precio correcto', change: '↓ −$50', changeUp: false, changeDate: '15 oct', diff: '+$105 · +5.7%', isBelow: false, offer: false, status: 'Con fallo', statusTone: 'danger', statusNote: 'Elemento no encontrado · última lectura correcta: 20 oct', mode: 'Navegador', failing: true },
    ],
    history: {
      days,
      average: 1844,
      series: {
        'Tienda Uno': [1899, 1899, 1899, 1849, 1849, 1849, 1799, 1799, 1799, 1799, 1749, 1749, 1749, 1749],
        'Tienda Tres': [1799, 1799, 1799, 1799, 1799, 1799, 1779, 1779, 1779, 1779, 1779, 1779, 1779, 1779],
        'Tienda Dos': [1859, 1859, 1859, 1859, 1859, 1859, 1859, 1859, 1899, 1899, 1899, 1899, 1899, 1899],
        'Tienda Cuatro': [1999, 1999, 1999, 1999, 1999, 1949, 1949, 1949, 1949, 1949, 1949, null, null, null],
      },
    },
  },
}
