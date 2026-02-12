import { createRouter, createWebHistory } from 'vue-router'

const router = createRouter({
  routes: [
    { path: '/', component: () => import('./pages/landing.vue'), meta: { guest: true } },
    { path: '/home', component: () => import('./pages/index.vue') },
    { path: '/settings', component: () => import('./pages/settings.vue') },
    { path: '/shares', component: () => import('./pages/shares.vue') },
    { path: '/trash', component: () => import('./pages/trash.vue') },
    { path: '/session', component: () => import('./pages/session.vue'), meta: { guest: true } },
    { path: '/s/:code', component: () => import('./pages/share-view.vue'), meta: { guest: true } },
    {
      path: '/admin',
      component: () => import('./pages/admin.vue'),
      meta: { admin: true },
      redirect: '/admin/home',
      children: [
        { path: 'home', component: () => import('./pages/admin/home.vue') },
        { path: 'settings/site', component: () => import('./pages/admin/settings/site.vue') },
        { path: 'settings/captcha', component: () => import('./pages/admin/settings/captcha.vue') },
        { path: 'settings/mail', component: () => import('./pages/admin/settings/mail.vue') },
        { path: 'settings/appearance', component: () => import('./pages/admin/settings/appearance.vue') },
        { path: 'settings/session', component: () => import('./pages/admin/settings/session.vue') },
        { path: 'settings/:section', component: () => import('./pages/admin/placeholder.vue') },
        { path: 'fs/:section', component: () => import('./pages/admin/placeholder.vue') },
        { path: 'policies', component: () => import('./pages/admin/placeholder.vue') },
        { path: 'nodes', component: () => import('./pages/admin/placeholder.vue') },
        { path: 'groups', component: () => import('./pages/admin/groups.vue') },
        { path: 'users', component: () => import('./pages/admin/users.vue') },
        { path: 'files', component: () => import('./pages/admin/files.vue') },
        { path: 'blobs', component: () => import('./pages/admin/placeholder.vue') },
        { path: 'shares', component: () => import('./pages/admin/placeholder.vue') },
        { path: 'orders', component: () => import('./pages/admin/placeholder.vue') },
        { path: 'events', component: () => import('./pages/admin/placeholder.vue') },
        { path: 'reports', component: () => import('./pages/admin/placeholder.vue') },
        { path: 'oauth', component: () => import('./pages/admin/placeholder.vue') }
      ]
    },
    { path: '/:pathMatch(.*)*', component: () => import('./pages/not-found.vue') },
  ],
  history: createWebHistory()
})

export default router
