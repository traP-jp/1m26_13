<script setup lang="ts">
import { onMounted, ref } from "vue";

import { listLectures, listRoadmaps, type Lecture, type Roadmap } from "@/api/resources";
const lectures = ref<Lecture[]>([]);
const roadmaps = ref<Roadmap[]>([]);
const loading = ref(true);
const error = ref("");
async function load() {
  loading.value = true;
  try {
    [lectures.value, roadmaps.value] = await Promise.all([
      listLectures({ includeDraft: true }),
      listRoadmaps(true),
    ]);
  } catch (reason) {
    error.value = reason instanceof Error ? reason.message : "読み込めませんでした";
  } finally {
    loading.value = false;
  }
}
onMounted(load);
</script>
<template>
  <div class="page">
    <header class="page-heading">
      <div>
        <p class="eyebrow">OPERATIONS</p>
        <h1>運営する</h1>
        <p>講習会、開催、Flow、ロードマップを同じ資産として整えます。</p>
      </div>
    </header>
    <div class="admin-grid">
      <RouterLink class="surface admin-action" to="/admin/lectures/new"
        ><strong>講習会を登録</strong>
        <p>Lectureを先に保存し、必要なら事前Flowを適用して準備を進めます。</p></RouterLink
      ><RouterLink class="surface admin-action" to="/stock"
        ><strong>Flow Stock</strong>
        <p>事前・各開催・事後のFlowClassを作成し、再利用できる原本として管理します。</p></RouterLink
      ><RouterLink class="surface admin-action" to="/admin/roadmaps/new"
        ><strong>ロードマップを作成</strong>
        <p>講習会を段階と順序に沿って一本道に配置します。</p></RouterLink
      ><RouterLink class="surface admin-action" to="/roadmaps"
        ><strong>公開状態を確認</strong>
        <p>学習者に見えるロードマップと現在の進捗を確認します。</p></RouterLink
      >
    </div>
    <div class="section-heading">
      <h2>講習会</h2>
      <span>{{ lectures.length }}件</span>
    </div>
    <div v-if="loading" class="loading-state">読み込んでいます</div>
    <div v-else-if="error" class="error-state">{{ error }}</div>
    <div v-else class="editor-list">
      <RouterLink
        v-for="lecture in lectures"
        :key="lecture.id"
        class="editor-row surface"
        :to="`/admin/lectures/${lecture.id}`"
        ><span
          ><strong>{{ lecture.name }}</strong>
          <p>{{ lecture.sessions.length }}開催 · revision {{ lecture.revision }}</p></span
        ><span :class="['pill', lecture.isPublished ? 'success' : 'draft']">{{
          lecture.isPublished ? "公開中" : "作成中"
        }}</span></RouterLink
      >
    </div>
    <div class="section-heading">
      <h2>ロードマップ</h2>
      <span>{{ roadmaps.length }}件</span>
    </div>
    <div class="editor-list">
      <RouterLink
        v-for="roadmap in roadmaps"
        :key="roadmap.id"
        class="editor-row surface"
        :to="`/admin/roadmaps/${roadmap.id}`"
        ><span
          ><strong>{{ roadmap.title }}</strong>
          <p>{{ roadmap.totalItemCount }}講習会</p></span
        ><span :class="['pill', roadmap.published ? 'success' : 'draft']">{{
          roadmap.published ? "公開中" : "下書き"
        }}</span></RouterLink
      >
    </div>
  </div>
</template>
