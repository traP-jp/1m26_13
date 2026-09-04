<script setup lang="ts">
import { BasiqButton, BasiqCard } from "basiq-ui";
import { onMounted, ref } from "vue";
import { useRoute } from "vue-router";

import { getLecture, getSession, setCompletion, type Lecture, type Session } from "@/api/resources";
import AppIcon from "@/components/AppIcon.vue";

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
  <div class="page session-page">
    <div v-if="loading" class="loading-state">開催を読み込んでいます</div>
    <div v-else-if="error && !session" class="error-state" role="alert">
      <p>{{ error }}</p>
      <BasiqButton tone="neutral" variant="outline" @click="load">再試行</BasiqButton>
    </div>
    <template v-else-if="session">
      <div class="breadcrumb">
        <RouterLink to="/">ホーム</RouterLink><AppIcon name="chevron" :size="14" /><RouterLink
          :to="`/lectures/${session.lectureId}`"
          >{{ lecture?.name || "講習会" }}</RouterLink
        ><AppIcon name="chevron" :size="14" /><strong>{{ session.name }}</strong>
      </div>
      <header class="session-header">
        <div>
          <div class="meta-line">
            <span v-if="session.isReplay" class="pill">再放送・総集編</span
            ><span v-if="session.isCompleted" class="pill success">受講完了</span>
          </div>
          <h1>{{ session.name }}</h1>
          <p>{{ lecture?.name }}</p>
        </div>
        <BasiqButton
          tone="neutral"
          variant="outline"
          @click="$router.push(`/admin/lectures/${session.lectureId}?session=${session.id}`)"
          ><AppIcon name="edit" :size="16" />編集</BasiqButton
        >
      </header>
      <p v-if="notice" class="notice" role="status">{{ notice }}</p>
      <p v-if="error" class="notice error" role="alert">{{ error }}</p>
      <div class="detail-grid">
        <div class="detail-main">
          <BasiqCard class="detail-card"
            ><template #header><h2>この開催について</h2></template>
            <p class="prose">{{ session.description || "説明はまだありません。" }}</p></BasiqCard
          >
          <BasiqCard class="detail-card"
            ><template #header><h2>教材・関連リンク</h2></template>
            <ul v-if="session.resources.length" class="resource-list">
              <li v-for="resource in session.resources" :key="resource.url">
                <a :href="resource.url" target="_blank" rel="noopener noreferrer"
                  ><span
                    ><AppIcon name="book" :size="17" />{{ resource.title || resource.url }}</span
                  ><b>開く ↗</b></a
                >
              </li>
            </ul>
            <p v-else class="muted">登録された教材はありません。</p></BasiqCard
          >
        </div>
        <aside class="detail-rail">
          <BasiqCard class="meta-card"
            ><template #header><h2>開催情報</h2></template>
            <dl>
              <div>
                <dt><AppIcon name="calendar" :size="16" />日時</dt>
                <dd>
                  {{ session.date || "未定"
                  }}<template v-if="session.startTime"> {{ session.startTime }}</template>
                </dd>
              </div>
              <div>
                <dt><AppIcon name="pin" :size="16" />場所</dt>
                <dd>{{ session.location || "未定" }}</dd>
              </div>
            </dl></BasiqCard
          >
          <BasiqCard class="completion-card"
            ><template #header
              ><h2>{{ session.isReplay ? "再放送について" : "学習記録" }}</h2></template
            ><template v-if="session.isReplay"
              ><p>
                再放送から受講完了は記録しません。元の通常開催のページから記録できます。
              </p></template
            ><template v-else
              ><p>
                {{
                  session.isCompleted
                    ? "この開催は完了として記録されています。"
                    : "参加または自習を終えたら、完了として記録できます。"
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
              ></template
            ></BasiqCard
          >
        </aside>
      </div>
    </template>
  </div>
</template>

<style scoped>
.session-page {
  width: min(1160px, calc(100% - 80px));
  padding: 32px 0 72px;
}

.breadcrumb strong {
  color: var(--basiq-color-content-default);
}

.session-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 24px;
  margin-bottom: 24px;
  padding-bottom: 24px;
  border-bottom: 1px solid var(--basiq-color-border-separator);
}

.session-header h1 {
  margin-top: 8px;
  font-size: 30px;
  letter-spacing: -0.025em;
}

.session-header p {
  margin-top: 5px;
  color: var(--basiq-color-content-subtle);
}

.meta-line {
  display: flex;
  gap: 8px;
}

.notice {
  margin-bottom: 12px;
}

.detail-grid {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 310px;
  align-items: start;
  gap: 40px;
}

.detail-main,
.detail-rail {
  display: grid;
  gap: 16px;
}

.detail-card,
.meta-card,
.completion-card {
  border: 1px solid var(--basiq-color-border-separator);
}

.detail-card h2,
.meta-card h2,
.completion-card h2 {
  font-size: 16px;
}

.muted,
.completion-card p {
  color: var(--basiq-color-content-subtle);
}

.resource-list a {
  align-items: center;
}

.resource-list a > span {
  display: flex;
  align-items: center;
  gap: 8px;
}

.resource-list b {
  color: var(--basiq-color-content-accent);
  font-size: 11px;
}

.meta-card dl {
  display: grid;
  gap: 14px;
}

.meta-card dl > div {
  display: grid;
  gap: 3px;
  padding-bottom: 12px;
  border-bottom: 1px solid var(--basiq-color-border-separator);
}

.meta-card dl > div:last-child {
  padding-bottom: 0;
  border-bottom: 0;
}

.meta-card dt {
  display: flex;
  align-items: center;
  gap: 7px;
  color: var(--basiq-color-content-subtle);
  font-size: 11px;
  font-weight: 700;
}

.completion-card p {
  margin-bottom: 14px;
}

.completion-card button {
  width: 100%;
}

@media (width <= 980px) and (width >= 761px) {
  .session-page {
    width: calc(100% - 48px);
  }

  .detail-grid {
    grid-template-columns: minmax(0, 1fr) 280px;
    gap: 24px;
  }
}

@media (width <= 760px) {
  .session-page {
    width: auto;
    margin-inline: 16px;
    padding: 24px 0 32px;
  }

  .session-header {
    gap: 12px;
  }

  .session-header h1 {
    font-size: 23px;
  }

  .session-header > button {
    padding-inline: 10px;
  }

  .detail-grid {
    grid-template-columns: 1fr;
  }

  .detail-rail {
    grid-row: 1;
  }

  .completion-card {
    position: sticky;
    top: 68px;
    z-index: 5;
  }
}
</style>
