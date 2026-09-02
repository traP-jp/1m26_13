<template>
  <div v-if="session" class="detail-page">
    <!-- 上部ナビゲーション -->
    <div class="top-nav">
      <button class="back-btn" @click="goBack">← 一覧に戻る</button>
    </div>

    <div class="detail-container">
      <!-- 左側メインコンテンツ -->
      <main class="main-content">
        <!-- 修正: 白背景でも視認できる黒文字色を設定 -->
        <h1 class="lecture-title">{{ session.title }}</h1>

        <!-- 1. 学べること / 概要 -->
        <section class="process-step">
          <div class="step-header">
            <span class="step-num">1</span>
            <h2>学べること / 概要</h2>
          </div>
          <p class="step-body">{{ session.description }}</p>
        </section>

        <!-- 2. 対象者 -->
        <section class="process-step">
          <div class="step-header">
            <span class="step-num">2</span>
            <h2>対象者</h2>
          </div>
          <p class="step-body">{{ session.targetAudience }}</p>
        </section>

        <!-- 3. 前提知識 -->
        <section class="process-step">
          <div class="step-header">
            <span class="step-num">3</span>
            <h2>前提知識 / 準備</h2>
          </div>
          <p class="step-body">
            {{ session.prerequisites || "特に必要な前提知識はありません。気軽にご参加ください。" }}
          </p>
        </section>

        <!-- 4. 各回の教材・動画 -->
        <section class="process-step">
          <div class="step-header">
            <span class="step-num">4</span>
            <h2>各回の教材・動画アーカイブ</h2>
          </div>
          <div class="step-body">
            <div v-if="session.materials.length > 0" class="materials-list">
              <h3>講習会資料</h3>
              <ul>
                <li v-for="mat in session.materials" :key="mat.url">
                  <a :href="mat.url" target="_blank" rel="noopener">📄 {{ mat.title }}</a>
                </li>
              </ul>
            </div>
            <div v-if="session.recordingUrl" class="recording-box">
              <h3>録画アーカイブ</h3>
              <a :href="session.recordingUrl" target="_blank" rel="noopener" class="recording-link">
                ▶ YouTube録画を視聴する
              </a>
            </div>
            <p v-if="session.materials.length === 0 && !session.recordingUrl" class="empty-text">
              まだ配布資料・録画アーカイブはありません。
            </p>
          </div>
        </section>
      </main>

      <!-- 右側サイドバー（右上: 完了ボタン, 中央: 開催情報, 右下: 関連ロードマップ） -->
      <aside class="sidebar">
        <!-- 右上: 受講完了ボタン -->
        <div class="action-card">
          <button
            :class="['complete-btn', { completed: isCompleted }]"
            @click="toggleComplete"
          >
            {{ isCompleted ? "✓ 受講完了済み" : "受講完了にする" }}
          </button>
        </div>

        <!-- 中央: 開催情報 -->
        <div class="info-card">
          <h3>開催情報</h3>
          <div class="info-item">
            <span class="info-label">開催ステータス</span>
            <span :class="['status-tag', eventStatus.class]">{{ eventStatus.label }}</span>
          </div>
          <div class="info-item">
            <span class="info-label">開催日</span>
            <span class="info-value">{{ session.date || "未定" }}</span>
          </div>
          <div class="info-item">
            <span class="info-label">場所</span>
            <span class="info-value">{{ session.location || "未定" }}</span>
          </div>
          <div class="info-item">
            <span class="info-label">形式</span>
            <span class="info-value">{{ session.format }}</span>
          </div>
          <div class="info-item">
            <span class="info-label">担当班 / 年度</span>
            <span class="info-value">{{ session.team }}班 ({{ session.year }}年度)</span>
          </div>
          <div class="info-item">
            <span class="info-label">講師 (traQ ID)</span>
            <span class="info-value">{{ session.instructors.map(i => "@" + i).join(", ") }}</span>
          </div>
        </div>

        <!-- 右下: 関連ロードマップ -->
        <div class="roadmap-card">
          <h3>関連ロードマップ</h3>
          <div v-if="relatedRoadmaps.length > 0" class="roadmap-list">
            <div v-for="rm in relatedRoadmaps" :key="rm.id" class="roadmap-box">
              <h4>{{ rm.title }}</h4>
              <p>{{ rm.description }}</p>
            </div>
          </div>
          <p v-else class="empty-text">関連するロードマップはありません。</p>
        </div>
      </aside>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed } from "vue";
import { useRoute, useRouter } from "vue-router";
import { storageService } from "@/services/storageService";
import type { LectureSession, Roadmap } from "@/types/lecture";

const route = useRoute();
const router = useRouter();

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

const goBack = () => {
  router.back();
};

const toggleComplete = () => {
  if (session.value) {
    isCompleted.value = storageService.toggleCompletedSession(session.value.id);
  }
};

const relatedRoadmaps = computed(() => {
  if (!session.value) return [];
  return roadmaps.value.filter((r) => session.value?.roadmapIds.includes(r.id));
});

const eventStatus = computed(() => {
  if (!session.value?.date) {
    return { label: "日程未定", class: "upcoming" };
  }
  const todayStr = new Date().toISOString().split("T")[0];
  if (session.value.date < todayStr) {
    return { label: "終了済み", class: "ended" };
  } else if (session.value.date === todayStr) {
    return { label: "本日開催", class: "today" };
  } else {
    return { label: "開催予定", class: "upcoming" };
  }
});
</script>

<style scoped>
.detail-page {
  max-width: 1000px;
  margin: 0 auto;
  padding: 24px 16px;
  color: #121212;
}

.top-nav {
  margin-bottom: 16px;
}

.back-btn {
  background: none;
  border: none;
  color: #0066cc;
  font-size: 14px;
  cursor: pointer;
  padding: 0;
  font-weight: bold;
}

.back-btn:hover {
  text-decoration: underline;
}

.detail-container {
  display: flex;
  gap: 28px;
}

.main-content {
  flex: 1;
}

/* 修正: 白背景での視認性を確保するタイトルスタイル */
.lecture-title {
  font-size: 26px;
  font-weight: bold;
  color: #121212;
  margin-bottom: 24px;
  border-bottom: 2px solid #e0e0e0;
  padding-bottom: 12px;
}

.process-step {
  background-color: #ffffff;
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  padding: 16px;
  margin-bottom: 20px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
}

.step-header {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 10px;
}

.step-num {
  background-color: #0066cc;
  color: #ffffff;
  font-weight: bold;
  width: 24px;
  height: 24px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 13px;
}

.step-header h2 {
  font-size: 16px;
  margin: 0;
  color: #121212;
}

.step-body {
  margin: 0;
  color: #333333;
  font-size: 14px;
  line-height: 1.6;
  padding-left: 34px;
}

.materials-list ul {
  padding-left: 20px;
  margin: 8px 0;
}

.materials-list a,
.recording-link {
  color: #0066cc;
  text-decoration: none;
  font-weight: bold;
}

.recording-box {
  margin-top: 12px;
}

.sidebar {
  width: 300px;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.action-card {
  background-color: #ffffff;
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  padding: 16px;
}

.complete-btn {
  width: 100%;
  padding: 12px;
  border-radius: 20px;
  border: 2px solid #0066cc;
  background: #ffffff;
  color: #0066cc;
  font-weight: bold;
  font-size: 14px;
  cursor: pointer;
  transition: all 0.2s;
}

.complete-btn:hover {
  background-color: #f0f7ff;
}

.complete-btn.completed {
  background-color: #2e7d32;
  border-color: #2e7d32;
  color: #ffffff;
}

.info-card {
  background-color: #ffffff;
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  padding: 16px;
}

.info-card h3 {
  margin-top: 0;
  font-size: 15px;
  color: #121212;
  border-bottom: 1px solid #eee;
  padding-bottom: 8px;
}

.info-item {
  margin-bottom: 12px;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.info-label {
  font-size: 12px;
  color: #666666;
}

.info-value {
  font-size: 14px;
  color: #121212;
  font-weight: 500;
}

.status-tag {
  display: inline-block;
  padding: 3px 8px;
  border-radius: 4px;
  font-size: 12px;
  font-weight: bold;
  width: fit-content;
}

.status-tag.ended {
  background-color: #e0e0e0;
  color: #424242;
}

.status-tag.today {
  background-color: #d32f2f;
  color: #ffffff;
}

.status-tag.upcoming {
  background-color: #2e7d32;
  color: #ffffff;
}

.roadmap-card {
  background-color: #ffffff;
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  padding: 16px;
}

.roadmap-card h3 {
  margin-top: 0;
  font-size: 15px;
  color: #121212;
  border-bottom: 1px solid #eee;
  padding-bottom: 8px;
}

.roadmap-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.roadmap-box {
  background-color: #f8f9fa;
  padding: 10px;
  border-radius: 6px;
  border: 1px solid #e0e0e0;
}

.roadmap-box h4 {
  margin: 0 0 4px 0;
  color: #0066cc;
  font-size: 13px;
}

.roadmap-box p {
  margin: 0;
  font-size: 12px;
  color: #555555;
}

.empty-text {
  color: #777777;
  font-style: italic;
  font-size: 13px;
  margin: 0;
}
</style>