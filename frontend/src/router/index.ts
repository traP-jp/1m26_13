import { createRouter, createWebHistory, type RouterHistory } from "vue-router";

export function createAppRouter(history: RouterHistory = createWebHistory()) {
  return createRouter({
    history,
    routes: [
      {
        path: "/",
        name: "home",
        component: () => import("@/views/HomeView.vue"),
      },
      {
        path: "/lectures/:id",
        name: "lecture-detail",
        component: () => import("@/views/LectureDetailView.vue"),
      },
      {
        path: "/roadmaps",
        name: "roadmaps",
        component: () => import("@/views/RoadmapListView.vue"),
      },
      {
        path: "/roadmaps/:id",
        name: "roadmap-detail",
        component: () => import("@/views/RoadmapDetailView.vue"),
      },
      {
        path: "/profiles/:traqId",
        name: "profile",
        component: () => import("@/views/ProfileView.vue"),
      },
      { path: "/admin", name: "admin", component: () => import("@/views/AdminView.vue") },
      {
        path: "/admin/lectures/new",
        name: "lecture-new",
        component: () => import("@/views/LectureWorkspaceEditor.vue"),
      },
      {
        path: "/admin/lectures/:id",
        name: "lecture-edit",
        component: () => import("@/views/LectureWorkspaceEditor.vue"),
      },
      {
        path: "/admin/roadmaps/new",
        name: "roadmap-new",
        component: () => import("@/views/RoadmapEditorView.vue"),
      },
      {
        path: "/admin/roadmaps/:id",
        name: "roadmap-edit",
        component: () => import("@/views/RoadmapEditorView.vue"),
      },
      { path: "/stock", name: "flow-stock", component: () => import("@/views/FlowStockView.vue") },
      {
        path: "/flows/:id",
        name: "flow-runner",
        component: () => import("@/views/FlowRedirectView.vue"),
      },
      {
        path: "/:pathMatch(.*)*",
        name: "not-found",
        component: () => import("@/views/NotFoundView.vue"),
      },
    ],
  });
}
