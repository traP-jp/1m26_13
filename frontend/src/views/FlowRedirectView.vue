<script setup lang="ts">
import { BasiqButton, BasiqCard } from "basiq-ui";
import { onMounted, ref } from "vue";
import { useRoute, useRouter } from "vue-router";

import { getFlow, getSession } from "@/api/resources";

const route = useRoute();
const router = useRouter();
const error = ref("");

async function openEditor() {
  error.value = "";
  try {
    const flow = await getFlow(String(route.params.id));
    const lectureId =
      flow.type === "session_main"
        ? (await getSession(flow.targetId, true)).lectureId
        : flow.targetId;
    await router.replace(`/admin/lectures/${lectureId}`);
  } catch (reason) {
    error.value = reason instanceof Error ? reason.message : "Flowを読み込めませんでした";
  }
}

onMounted(openEditor);
</script>

<template>
  <main class="page redirect-page">
    <p v-if="!error" class="loading-state">講習会のFlowタブを開いています</p>
    <BasiqCard v-else>
      <template #header><h1>Flowを開けませんでした</h1></template>
      <p>{{ error }}</p>
      <template #footer>
        <BasiqButton type="button" @click="openEditor">再試行</BasiqButton>
      </template>
    </BasiqCard>
  </main>
</template>

<style scoped>
.redirect-page {
  max-width: 720px;
  margin: 0 auto;
  padding: 72px 24px;
}
</style>
