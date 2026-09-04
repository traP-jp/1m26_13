<script setup lang="ts">
import { onMounted, ref } from "vue";
import { useRoute } from "vue-router";

import { getLecture, type Lecture } from "@/api/resources";

const route = useRoute();
const lecture = ref<Lecture>();
const loading = ref(true);
const error = ref("");
async function load() {
  loading.value = true;
  error.value = "";
  try {
    lecture.value = await getLecture(String(route.params.id));
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
    <div v-if="loading" class="loading-state">講習会を読み込んでいます</div>
    <div v-else-if="error" class="error-state" role="alert">
      <p>{{ error }}</p>
      <button class="button secondary" @click="load">再試行</button>
    </div>
    <template v-else-if="lecture">
      <header class="page-heading">
        <div>
          <p class="eyebrow">LECTURE</p>
          <h1>{{ lecture.name }}</h1>
          <p>{{ lecture.description || "この講習会の説明はまだありません。" }}</p>
        </div>
        <RouterLink class="button secondary" :to="`/admin/lectures/${lecture.id}`">編集</RouterLink>
      </header>
      <div class="detail-layout">
        <div class="detail-main">
          <section class="surface detail-section">
            <h2>開催</h2>
            <div v-if="lecture.sessions.length" class="session-list">
              <RouterLink
                v-for="session in lecture.sessions"
                :key="session.id"
                class="session-row"
                :to="`/sessions/${session.id}`"
              >
                <span class="session-order">{{ session.order + 1 }}</span
                ><span
                  ><strong>{{ session.name }}</strong
                  ><small
                    >{{ session.date || "日時未定"
                    }}<template v-if="session.startTime"> {{ session.startTime }}</template> ·
                    {{ session.location || "場所未定" }}</small
                  ></span
                ><span v-if="session.isCompleted" class="pill success">完了</span
                ><span v-else>詳細 →</span>
              </RouterLink>
            </div>
            <div v-else class="empty-state">公開中の通常開催はありません。</div>
          </section>
          <section v-if="lecture.resources.length" class="surface detail-section">
            <h2>講習会全体の資料</h2>
            <ul class="resource-list">
              <li v-for="resource in lecture.resources" :key="resource.url">
                <a :href="resource.url" target="_blank" rel="noopener noreferrer"
                  ><span>{{ resource.title || resource.url }}</span
                  ><span aria-hidden="true">↗</span></a
                >
              </li>
            </ul>
          </section>
          <section v-if="lecture.relations.length" class="surface detail-section">
            <h2>学びのつながり</h2>
            <ul>
              <li
                v-for="relation in lecture.relations"
                :key="`${relation.type}-${relation.toLectureId}`"
              >
                <RouterLink :to="`/lectures/${relation.toLectureId}`"
                  >{{ relation.type }} · 関連講習会</RouterLink
                >
              </li>
            </ul>
          </section>
        </div>
        <aside class="detail-aside">
          <section class="surface detail-section">
            <h2>講習会情報</h2>
            <dl class="meta-list">
              <div>
                <dt>学年度</dt>
                <dd>
                  {{
                    lecture.academicYearStart === lecture.academicYearEnd
                      ? `${lecture.academicYearStart}年度`
                      : `${lecture.academicYearStart}–${lecture.academicYearEnd}年度`
                  }}
                </dd>
              </div>
              <div>
                <dt>対象者</dt>
                <dd>{{ lecture.targetAudience || "指定なし" }}</dd>
              </div>
              <div>
                <dt>入門向け</dt>
                <dd>{{ lecture.isIntroductory ? "はい" : "いいえ" }}</dd>
              </div>
              <div>
                <dt>進捗</dt>
                <dd>
                  {{ lecture.completedSessionCount }} / {{ lecture.requiredSessionCount }} 開催
                </dd>
              </div>
            </dl>
          </section>
        </aside>
      </div>
    </template>
  </div>
</template>
