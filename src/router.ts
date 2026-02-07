import { createRouter, createWebHistory } from 'vue-router'

const router = createRouter({
  routes: [
    { path: '/', component: () => import('./pages/index.vue') },
    { path: '/session', component: () => import('./pages/session.vue'), meta: { guest: true } },
    {
      path: '/admin',
      component: () => import('./pages/admin.vue'),
      meta: { admin: true },
      redirect: '/admin/home',
      children: [
        { path: 'home', component: () => import('./pages/admin/home.vue') }
      ]
    }
  ],
  history: createWebHistory()
})

export default router
