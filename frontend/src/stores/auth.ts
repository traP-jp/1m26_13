import { defineStore } from "pinia";
import { ref } from "vue";

import { getCurrentUser, type CurrentUser } from "@/api/currentUser";

export const useAuthStore = defineStore("auth", () => {
  const user = ref<CurrentUser>();
  const loading = ref(false);
  const error = ref("");
  async function load() {
    if (user.value || loading.value) return;
    loading.value = true;
    error.value = "";
    try {
      user.value = await getCurrentUser();
    } catch (reason) {
      error.value = reason instanceof Error ? reason.message : "認証情報を取得できませんでした";
    } finally {
      loading.value = false;
    }
  }
  return { user, loading, error, load };
});
