<script setup lang="ts">
import { BasiqButton } from "basiq-ui";
import { onMounted, ref } from "vue";
import { useRoute } from "vue-router";

import { getLecture, getSession, setCompletion, type Lecture, type Session } from "@/api/resources";

const route = useRoute();
const session = ref<Session>();
const lecture = ref<Lecture>();
const loading = ref(true);
const saving = ref(false);
const error = ref("");
const notice = ref("");
async function load() {
  loading.value = true;
  error.value = "";
  try {
    session.value = await getSession(String(route.params.id));
    lecture.value = await getLecture(session.value.lectureId);
  } catch (reason) {
    error.value = reason instanceof Error ? reason.message : "読み込めませんでした";
  } finally {
    loading.value = false;
  }
}
async function toggleCompletion() {
  if (!session.value || session.value.isReplay) return;
  saving.value = true;
  notice.value = "";
  try {
    await setCompletion(session.value.id, !session.value.isCompleted);
    session.value = await getSession(session.value.id);
    notice.value = session.value.isCompleted
      ? "受講完了を記録しました。"
      : "完了記録を取り消しました。";
  } catch (reason) {
    error.value = reason instanceof Error ? reason.message : "更新できませんでした";
  } finally {
    saving.value = false;
  }
}
onMounted(load);
</script>

<template>
  <div class="page narrow">
    <div v-if="loading" class="loading-state">開催を読み込んでいます</div>
    <div v-else-if="error && !session" class="error-state" role="alert">
      <p>{{ error }}</p>
      <button class="button secondary" @click="load">再試行</button>
    </div>
    <template v-else-if="session">
      <header class="page-heading">
        <div>
          <p class="eyebrow">SESSION <span v-if="session.isReplay">· REPLAY</span></p>
          <h1>{{ session.name }}</h1>
          <p>
            <RouterLink :to="`/lectures/${session.lectureId}`">{{
              lecture?.name || "講習会へ戻る"
            }}</RouterLink>
          </p>
        </div>
        <RouterLink
          class="button secondary"
          :to="`/admin/lectures/${session.lectureId}?session=${session.id}`"
          >編集</RouterLink
        >
      </header>
      <p v-if="notice" class="notice" role="status">{{ notice }}</p>
      <p v-if="error" class="notice error" role="alert">{{ error }}</p>
      <section class="surface detail-section">
        <div class="card-meta">
          <span v-if="session.isReplay" class="pill">再放送・総集編</span
          ><span v-if="session.isCompleted" class="pill success">受講完了</span>
        </div>
        <p class="prose">{{ session.description || "説明はまだありません。" }}</p>
        <dl class="meta-list">
          <div>
            <dt>日時</dt>
            <dd>
              {{ session.date || "未定"
              }}<template v-if="session.startTime"> {{ session.startTime }}</template>
            </dd>
          </div>
          <div>
            <dt>場所</dt>
            <dd>{{ session.location || "未定" }}</dd>
          </div>
        </dl>
      </section>
      <section class="surface detail-section">
        <h2>教材・関連リンク</h2>
        <ul v-if="session.resources.length" class="resource-list">
          <li v-for="resource in session.resources" :key="resource.url">
            <a :href="resource.url" target="_blank" rel="noopener noreferrer"
              ><span>{{ resource.title || resource.url }}</span
              ><span aria-hidden="true">↗</span></a
            >
          </li>
        </ul>
        <p v-else>登録された教材はありません。</p>
      </section>
      <section v-if="!session.isReplay" class="surface detail-section">
        <h2>学習記録</h2>
        <p>
          {{
            session.isCompleted
              ? "この開催は完了として記録されています。"
              : "参加または自習を終えたら、本人の記録として完了にできます。"
          }}
        </p>
        <BasiqButton
          :disabled="saving"
          :tone="session.isCompleted ? 'neutral' : 'accent'"
          :variant="session.isCompleted ? 'outline' : 'solid'"
          @click="toggleCompletion"
          >{{
            saving ? "保存中…" : session.isCompleted ? "完了を取り消す" : "受講完了にする"
          }}</BasiqButton
        >
      </section>
      <section v-else class="surface detail-section">
        <h2>再放送について</h2>
        <p>再放送から受講完了は記録しません。元の通常開催のページから記録できます。</p>
      </section>
    </template>
  </div>
</template>
