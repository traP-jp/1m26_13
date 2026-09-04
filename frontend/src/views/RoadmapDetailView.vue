<script setup lang="ts">
import { onMounted, ref } from "vue";
import { useRoute } from "vue-router";

import { getRoadmap, listLectures, type Lecture, type Roadmap } from "@/api/resources";
const route = useRoute();
const roadmap = ref<Roadmap>();
const lectureNames = ref<Record<string, string>>({});
const loading = ref(true);
const error = ref("");
async function load() {
  loading.value = true;
  try {
    const [value, lectures] = await Promise.all([
      getRoadmap(String(route.params.id)),
      listLectures(),
    ]);
    roadmap.value = value;
    lectureNames.value = Object.fromEntries(
      lectures.map((lecture: Lecture) => [lecture.id, lecture.name]),
    );
  } catch (reason) {
    error.value = reason instanceof Error ? reason.message : "読み込めませんでした";
  } finally {
    loading.value = false;
  }
}
onMounted(load);
</script>
<template>
  <div class="page narrow">
    <div v-if="loading" class="loading-state">ロードマップを読み込んでいます</div>
    <div v-else-if="error" class="error-state">{{ error }}</div>
    <template v-else-if="roadmap"
      ><header class="page-heading">
        <div>
          <p class="eyebrow">ROADMAP</p>
          <h1>{{ roadmap.title }}</h1>
          <p>{{ roadmap.description }}</p>
        </div>
        <RouterLink class="button secondary" :to="`/admin/roadmaps/${roadmap.id}`">編集</RouterLink>
      </header>
      <section class="surface detail-section">
        <div class="section-heading">
          <h2>進捗</h2>
          <strong>{{ roadmap.completedItemCount }} / {{ roadmap.totalItemCount }}</strong>
        </div>
        <div class="progress-track" :aria-label="`進捗 ${roadmap.progressPercent}%`">
          <span :style="{ width: `${roadmap.progressPercent}%` }"></span>
        </div>
      </section>
      <div class="roadmap-path">
        <section v-for="stage in roadmap.stages" :key="stage.id" class="roadmap-stage">
          <h2>{{ stage.title }}</h2>
          <p>{{ stage.description }}</p>
          <div class="roadmap-items">
            <RouterLink
              v-for="item in stage.items"
              :key="item.lectureId"
              class="roadmap-item"
              :to="`/lectures/${item.lectureId}`"
              ><span
                ><strong>{{ lectureNames[item.lectureId] || "講習会" }}</strong
                ><small v-if="item.note">{{ item.note }}</small></span
              ><span
                v-if="roadmap.completedLectureIds.includes(item.lectureId)"
                class="pill success"
                >完了</span
              ><span v-else-if="roadmap.nextLectureId === item.lectureId" class="pill"
                >次に学ぶ</span
              ><span v-else>→</span></RouterLink
            >
          </div>
        </section>
      </div></template
    >
  </div>
</template>
