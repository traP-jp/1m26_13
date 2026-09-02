<template>
  <div v-if="session" class="detail-container">
    <div class="main-content">
      <h1>{{ session.title }}</h1>
      
      <section class="section">
        <h2>概要</h2>
        <p>{{ session.description }}</p>
        <p><strong>対象者:</strong> {{ session.targetAudience }}</p>
        <p v-if="session.prerequisites"><strong>事前準備:</strong> {{ session.prerequisites }}</p>
      </section>

      <section class="section">
        <h2>教材・資料</h2>
        <ul v-if="session.materials.length > 0">
          <li v-for="mat in session.materials" :key="mat.url">
            <a :href="mat.url" target="_blank" rel="noopener">{{ mat.title }}</a>
          </li>
        </ul>
        <p v-else class="empty-text">教材リンク未登録（なし）</p>

        <div v-if="session.recordingUrl" class="recording">
          <h3>録画アーカイブ</h3>
          <a :href="session.recordingUrl" target="_blank" rel="noopener">YouTube録画を見る</a>
        </div>
      </section>
    </div>

    <!-- サイドバー -->
    <aside class="sidebar">
      <button
        :class="['complete-btn', { completed: isCompleted }]"
        @click="toggleComplete"
      >
        {{ isCompleted ? '✓ 受講完了済み' : '受講完了にする' }}
      </button>

      <!-- 含まれるロードマップ（存在する場合のみ表示） -->
      <div v-if="relatedRoadmaps.length > 0" class="roadmap-section">
        <h3>含まれるロードマップ</h3>
        <div v-for="rm in relatedRoadmaps" :key="rm.id" class="roadmap-item">
          <h4>{{ rm.title }}</h4>
          <p>{{ rm.description }}</p>
        </div>
      </div>
    </aside>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed } from 'vue';
import { useRoute } from 'vue-router';
import { storageService } from '@/services/storageService';
import type { LectureSession, Roadmap } from '@/types/lecture';

const route = useRoute();
const session = ref<LectureSession | null>(null);
const isCompleted = ref(false);
const roadmaps = ref<Roadmap[]>([]);

onMounted(() => {
  const sessionId = route.params.id as string;
  const lectures = storageService.getLectures();
  session.value = lectures.find((l) => l.id === sessionId) || null;

  if (session.value) {
    const completedIds = storageService.getCompletedSessionIds();
    isCompleted.value = completedIds.includes(session.value.id);

    roadmaps.value = storageService.getRoadmaps();
  }
});

const relatedRoadmaps = computed(() => {
  if (!session.value) return [];
  return roadmaps.value.filter((r) => session.value?.roadmapIds.includes(r.id));
});

const toggleComplete = () => {
  if (session.value) {
    isCompleted.value = storageService.toggleCompletedSession(session.value.id);
  }
};
</script>

<style scoped>
.detail-container {
  display: flex;
  gap: 24px;
  max-width: 960px;
  margin: 0 auto;
  padding: 24px;
  color: #fff;
}

.main-content { flex: 1; }

.sidebar {
  width: 280px;
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.complete-btn {
  width: 100%;
  padding: 12px;
  border-radius: 8px;
  border: 1px solid #3ea6ff;
  background: transparent;
  color: #3ea6ff;
  font-weight: bold;
  cursor: pointer;
}

.complete-btn.completed {
  background-color: #2e5b38;
  border-color: #2e5b38;
  color: #fff;
}

.roadmap-section {
  background-color: #1f1f1f;
  padding: 16px;
  border-radius: 8px;
  border: 1px solid #333;
}

.empty-text { color: #777; font-style: italic; }
</style>