<script setup lang="ts">
import {
  BasiqButton,
  BasiqFormField,
  BasiqInput,
  BasiqSelect,
  BasiqSwitch,
  BasiqTextarea,
} from "basiq-ui";
import { onMounted, reactive, ref } from "vue";

import { createFlowClass, listFlowClasses, updateFlowClass, type FlowClass } from "@/api/resources";
const flowClasses = ref<FlowClass[]>([]);
const editingId = ref("");
const saving = ref(false);
const loading = ref(true);
const error = ref("");
const notice = ref("");
const example =
  "# 講習会を企画する\n\n講習会名を確認してください。\n\n{{ lecture.name }}\n\n- [ ]{#confirm-purpose} 目的と対象者を確認する\n\n---\n# 告知を準備する\n\n```copy\n[[ lecture.name ]]を開催します。\n```";
const form = reactive({
  name: "",
  type: "lecture_pre" as FlowClass["type"],
  text: example,
  listed: true,
  revision: 0,
});
const flowTypeItems = [
  { label: "講習会の事前", value: "lecture_pre" },
  { label: "各開催のメイン", value: "session_main" },
  { label: "講習会の事後", value: "lecture_post" },
];
function setFlowType(value: string | null) {
  if (value === "lecture_pre" || value === "session_main" || value === "lecture_post") {
    form.type = value;
  }
}
async function load() {
  loading.value = true;
  try {
    flowClasses.value = await listFlowClasses(true);
  } catch (reason) {
    error.value = reason instanceof Error ? reason.message : "読み込めませんでした";
  } finally {
    loading.value = false;
  }
}
function edit(flowClass: FlowClass) {
  editingId.value = flowClass.id;
  Object.assign(form, {
    name: flowClass.name,
    type: flowClass.type,
    text: flowClass.text,
    listed: flowClass.listed,
    revision: flowClass.revision,
  });
  if (matchMedia("(max-width: 860px)").matches) {
    document.querySelector<HTMLFormElement>(".stock-layout > form")?.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
  }
}
function reset() {
  editingId.value = "";
  Object.assign(form, { name: "", type: "lecture_pre", text: example, listed: true, revision: 0 });
}
async function save() {
  saving.value = true;
  error.value = "";
  notice.value = "";
  try {
    const body = {
      name: form.name,
      type: form.type,
      text: form.text,
      listed: form.listed,
      expectedRevision: form.revision,
    };
    if (editingId.value) await updateFlowClass(editingId.value, body);
    else await createFlowClass(body);
    await load();
    reset();
    notice.value = "手順テンプレートを保存しました。";
  } catch (reason) {
    error.value = reason instanceof Error ? reason.message : "保存できませんでした";
  } finally {
    saving.value = false;
  }
}
onMounted(load);
</script>
<template>
  <div class="page stock-page">
    <nav class="breadcrumb" aria-label="パンくず">
      <RouterLink to="/admin">運営向けページ</RouterLink><b>/</b><span>Flow Stock</span>
    </nav>
    <header class="page-heading">
      <div>
        <h1>Flow Stock</h1>
        <p>講習会で使う手順テンプレート</p>
      </div>
    </header>
    <div class="stock-layout">
      <form @submit.prevent="save">
        <section class="stock-form">
          <h2>{{ editingId ? "テンプレートを編集" : "テンプレートを作成" }}</h2>
          <div class="form-stack">
            <p v-if="notice" class="notice" role="status">{{ notice }}</p>
            <p v-if="error" class="notice error" role="alert">{{ error }}</p>
            <BasiqFormField label="名前" required
              ><BasiqInput v-model="form.name" required
            /></BasiqFormField>
            <BasiqFormField label="分類">
              <BasiqSelect
                :model-value="form.type"
                :items="flowTypeItems"
                @update:model-value="setFlowType"
              />
            </BasiqFormField>
            <BasiqFormField label="本文" required
              ><BasiqTextarea v-model="form.text" :rows="18" required
            /></BasiqFormField>
            <div class="listing">
              <BasiqSwitch v-model="form.listed">一覧に掲載する</BasiqSwitch
              ><small>非掲載にしても、適用済みFlowの本文と進捗は残ります。</small>
            </div>
          </div>
          <div class="form-actions">
            <BasiqButton
              v-if="editingId"
              tone="neutral"
              variant="outline"
              type="button"
              @click="reset"
              >新規作成へ戻る</BasiqButton
            ><BasiqButton type="submit" :disabled="saving">{{
              saving ? "保存中…" : "保存"
            }}</BasiqButton>
          </div>
        </section>
      </form>
      <aside class="stock-side">
        <details class="syntax-reference">
          <summary>本文の記法</summary>
          <div class="syntax-list">
            <p><code># 見出し</code><span>ページのタイトル</span></p>
            <p><code>---</code><span>ページ区切り</span></p>
            <p>
              <code v-pre>{{ lecture.name }}</code
              ><span>入力欄</span>
            </p>
            <p><code v-pre>[[ lecture.name ]]</code><span>値の展開</span></p>
            <p><code>- [ ]{#stable-key}</code><span>進捗を持つタスク</span></p>
          </div>
        </details>
        <div class="saved-heading">
          <h2>保存済み</h2>
          <span>{{ flowClasses.length }}件</span>
        </div>
        <div v-if="loading" class="loading-state">読み込んでいます</div>
        <div v-else class="saved-list">
          <button
            v-for="flowClass in flowClasses"
            :key="flowClass.id"
            type="button"
            :class="{ active: editingId === flowClass.id }"
            :aria-pressed="editingId === flowClass.id"
            @click="edit(flowClass)"
          >
            <span
              ><strong>{{ flowClass.name }}</strong></span
            ><span class="tag-column"
              ><b>{{
                flowClass.type === "lecture_pre"
                  ? "事前"
                  : flowClass.type === "session_main"
                    ? "開催"
                    : "事後"
              }}</b
              ><em v-if="!flowClass.listed">非掲載</em></span
            >
          </button>
        </div>
      </aside>
    </div>
  </div>
</template>

<style scoped>
.stock-page {
  width: min(1120px, 100%);
}

.stock-layout {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 320px;
  align-items: start;
  gap: 24px;
}

.stock-form {
  min-width: 0;
  display: grid;
  gap: 16px;
}

.stock-form h2,
.saved-heading h2 {
  font-size: 1rem;
}

.form-stack,
.stock-side {
  display: grid;
  gap: 16px;
}

.listing {
  display: grid;
  gap: 8px;
}

.listing small {
  color: var(--basiq-color-content-subtle);
}

.form-actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  margin: 0;
  padding-top: 16px;
  border-top: 1px solid var(--basiq-color-border-separator);
}

.syntax-reference {
  padding-block: 12px;
  border-block: 1px solid var(--basiq-color-border-separator);
}

.syntax-reference summary {
  color: var(--basiq-color-content-subtle);
  font-weight: 700;
  cursor: pointer;
}

.syntax-list {
  display: grid;
  margin-top: 8px;
}

.syntax-list p {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 8px 0;
}

.syntax-list code {
  font-size: 0.75rem;
}

.syntax-list span {
  color: var(--basiq-color-content-subtle);
  font-size: 0.75rem;
}

.saved-heading {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: 8px;
}

.saved-heading span {
  color: var(--basiq-color-content-subtle);
  font-size: 0.875rem;
}

.saved-list {
  display: grid;
  border-top: 1px solid var(--basiq-color-border-separator);
}

.saved-list > button {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 12px 8px;
  border: 0;
  border-bottom: 1px solid var(--basiq-color-border-separator);
  color: inherit;
  background: transparent;
  text-align: left;
  cursor: pointer;
}

.saved-list > button:hover,
.saved-list > button.active {
  background: var(--basiq-color-navigation-item-background-current-rest);
}

.saved-list > button:focus-visible {
  outline: 2px solid var(--basiq-color-accent-default);
  outline-offset: -2px;
}

.saved-list > button > span:first-child {
  min-width: 0;
  display: grid;
  gap: 4px;
  overflow-wrap: anywhere;
}

.saved-list strong {
  font-size: 0.875rem;
  font-weight: 500;
}

.saved-list small {
  color: var(--basiq-color-content-subtle);
}

.tag-column {
  display: grid;
  flex: 0 0 auto;
  justify-items: end;
  gap: 4px;
}

.tag-column b,
.tag-column em {
  color: var(--basiq-color-content-subtle);
  font-size: 0.75rem;
  font-style: normal;
  font-weight: 400;
}

.tag-column em {
  font-size: 0.6875rem;
}

@media (width <= 860px) {
  .stock-layout {
    grid-template-columns: 1fr;
  }

  .stock-side {
    grid-row: 1;
  }

  .saved-list {
    max-height: 240px;
    overflow-y: auto;
  }
}
</style>
