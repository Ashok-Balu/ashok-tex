import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

const routes = [
  { path: '/login', name: 'login', component: () => import('@/views/auth/LoginView.vue'), meta: { public: true } },
  {
    path: '/',
    component: () => import('@/components/layout/AppLayout.vue'),
    meta: { requiresAuth: true },
    children: [
      { path: '',           redirect: '/dashboard' },
      { path: 'dashboard',  name: 'dashboard',     component: () => import('@/views/dashboard/DashboardView.vue') },
      { path: 'companies',  name: 'companies',     component: () => import('@/views/companies/CompaniesView.vue') },
      { path: 'orders',     name: 'orders',        component: () => import('@/views/orders/OrdersView.vue') },
      { path: 'orders/:id', name: 'order-detail',  component: () => import('@/views/orders/OrderDetailView.vue') },
      // allocations removed — close order flow handles payment allocation now
      { path: 'company-statement', name: 'company-statement', component: () => import('@/views/reports/CompanyStatementView.vue') },
      { path: 'analytics', name: 'analytics', component: () => import('@/views/analytics/AnalyticsView.vue') },
      { path: 'payroll',    name: 'payroll',       component: () => import('@/views/salary/PayrollView.vue') },
      // { path: 'financial-intelligence', name: 'financial-intelligence', component: () => import('@/views/financial/FinancialIntelligenceView.vue') }, // HIDDEN - enable when needed
      // { path: 'financial-intelligence/debts/:id', name: 'financial-intelligence-debt-detail', component: () => import('@/views/financial/DebtDetailView.vue') }, // HIDDEN - enable when needed
      { path: 'about', name: 'about', component: () => import('@/views/about/AboutView.vue'), meta: { public: true, requiresAuth: false } },
    ],
  },
  { path: '/:pathMatch(.*)*', redirect: '/dashboard' },
]

const router = createRouter({
  history: createWebHistory(),
  routes,
  scrollBehavior(to, from, savedPosition) {
    if (savedPosition) return savedPosition
    return { top: 0 }
  },
})

router.beforeEach((to, _, next) => {
  const auth = useAuthStore()
  if (to.meta.requiresAuth && !auth.isLoggedIn) return next('/login')
  if (to.path === '/login' && auth.isLoggedIn) return next('/dashboard')
  next()
})

export default router
