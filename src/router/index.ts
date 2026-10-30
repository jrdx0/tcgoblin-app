import { createRouter, createWebHistory } from 'vue-router'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    { path: '/', name: 'products', component: () => import('@/views/ProductsView.vue') },
    {
      path: '/products/:id',
      name: 'product',
      component: () => import('@/views/ProductDetailView.vue'),
      props: true,
    },
    {
      path: '/products/:id/edit',
      name: 'product-edit',
      component: () => import('@/views/ProductEditView.vue'),
      props: true,
    },
    { path: '/urls/new', name: 'new-url', component: () => import('@/views/NewUrlView.vue') },
    { path: '/alerts', name: 'alerts', component: () => import('@/views/AlertsView.vue') },
    { path: '/settings', name: 'settings', component: () => import('@/views/SettingsView.vue') },
  ],
})

export default router
