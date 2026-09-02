import { createRouter, createWebHistory } from 'vue-router'
import HomeView from '../views/HomeView.vue'
import ProfileView from '../views/ProfileView.vue'
import LectureDetailView from '../views/LectureDetailView.vue'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      name: 'home',
      component: HomeView,
    },
    {
      path: '/profile',
      name: 'profile',
      component: ProfileView,
    },
    {
      path: '/lectures/:id',
      name: 'lecture-detail',
      component: LectureDetailView,
    },
    {
      path: '/search',
      name: 'search-results',
      component: () => import('@/views/SearchResultView.vue')
    }
  ],
})

export default router