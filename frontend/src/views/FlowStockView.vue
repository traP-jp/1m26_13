<script setup lang="ts">
import {
  BasiqButton,
  BasiqCard,
  BasiqFormField,
  BasiqInput,
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
  scrollTo({ top: 0, behavior: "smooth" });
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
    notice.value = "FlowClassを保存しました。";
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
    <div class="breadcrumb">
      <RouterLink to="/admin">運営向けページ</RouterLink><b>/</b><span>Flow Stock</span>
    </div>
    <header class="page-heading">
      <div>
        <p class="eyebrow">FLOW STOCK</p>
        <h1>運営ノウハウを再利用する</h1>
        <p>講習会や開催に適用する手順を、再利用できる型として管理します。</p>
      </div>
    </header>
    <div class="stock-layout">
      <form @submit.prevent="save">
        <BasiqCard class="stock-form-card">
          <template #header
            ><div>
              <p class="card-kicker">{{ editingId ? "編集中" : "新しいFlowClass" }}</p>
              <h2>{{ editingId ? "FlowClassを編集" : "FlowClassを作成" }}</h2>
            </div></template
          >
          <div class="form-stack">
            <p v-if="notice" class="notice">{{ notice }}</p>
            <p v-if="error" class="notice error">{{ error }}</p>
            <BasiqFormField label="名前" required
              ><BasiqInput v-model="form.name" required
            /></BasiqFormField>
            <label class="native-field"
              ><span>分類</span
              ><select v-model="form.type">
                <option value="lecture_pre">講習会の事前</option>
                <option value="session_main">各開催のメイン</option>
                <option value="lecture_post">講習会の事後</option>
              </select></label
            >
            <BasiqFormField label="Flow本文" required
              ><BasiqTextarea v-model="form.text" :rows="18" required
            /></BasiqFormField>
            <div class="listing">
              <BasiqSwitch v-model="form.listed">Stockに掲載する</BasiqSwitch
              ><small>非掲載にしても、適用済みFlowの本文と進捗は残ります。</small>
            </div>
          </div>
          <template #footer
            ><div class="form-actions">
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
            </div></template
          >
        </BasiqCard>
      </form>
      <aside class="stock-side">
        <BasiqCard class="syntax-card"
          ><template #header><h2>Flowの文法</h2></template>
          <div class="syntax-list">
            <p><code># 見出し</code><span>ページのタイトル</span></p>
            <p><code>---</code><span>ページ区切り</span></p>
            <p>
              <code v-pre>{{ lecture.name }}</code
              ><span>入力欄</span>
            </p>
            <p><code v-pre>[[ lecture.name ]]</code><span>値の展開</span></p>
            <p><code>- [ ]{#stable-key}</code><span>進捗を持つタスク</span></p>
          </div></BasiqCard
        >
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
            @click="edit(flowClass)"
          >
            <span
              ><strong>{{ flowClass.name }}</strong
              ><small
                >format v{{ flowClass.formatVersion }} · revision {{ flowClass.revision }}</small
              ></span
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
  grid-template-columns: minmax(0, 1.4fr) minmax(300px, 0.75fr);
  align-items: start;
  gap: 18px;
}

.stock-form-card,
.syntax-card {
  border: 1px solid var(--basiq-color-border-separator);
}

.stock-form-card h2,
.syntax-card h2,
.saved-heading h2 {
  font-size: 17px;
}

.card-kicker {
  margin-bottom: 3px;
  color: var(--basiq-color-content-accent);
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.08em;
}

.form-stack,
.stock-side {
  display: grid;
  gap: 16px;
}

.native-field {
  display: grid;
  gap: 6px;
  font-weight: 500;
}

.native-field > span {
  font-size: 12px;
}

.native-field select {
  min-height: 40px;
  padding: 8px 11px;
  border: 1px solid var(--basiq-color-border-control);
  border-radius: var(--basiq-radius-sm);
  color: inherit;
  background: var(--basiq-color-surface-base);
}

.listing {
  display: grid;
  gap: 5px;
  padding: 12px;
  border-radius: var(--basiq-radius-sm);
  background: var(--basiq-color-surface-muted);
}

.listing small {
  color: var(--basiq-color-content-subtle);
}

.stock-form-card :deep([class*="footer"]),
.form-actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
}

.syntax-list {
  display: grid;
}

.syntax-list p {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 9px 0;
  border-bottom: 1px solid var(--basiq-color-border-separator);
}

.syntax-list p:last-child {
  border-bottom: 0;
}

.syntax-list code {
  font-size: 11px;
}

.syntax-list span {
  color: var(--basiq-color-content-subtle);
  font-size: 11px;
}

.saved-heading {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: 10px;
}

.saved-heading span {
  color: var(--basiq-color-content-subtle);
  font-size: 12px;
}

.saved-list {
  display: grid;
  gap: 8px;
}

.saved-list > button {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 12px;
  border: 1px solid var(--basiq-color-border-separator);
  border-radius: var(--basiq-radius-sm);
  color: inherit;
  background: var(--basiq-color-surface-base);
  text-align: left;
  cursor: pointer;
}

.saved-list > button:hover,
.saved-list > button.active {
  border-color: var(--basiq-color-accent-default);
  background: var(--app-accent-soft);
}

.saved-list > button > span:first-child {
  min-width: 0;
  display: grid;
  gap: 3px;
}

.saved-list small {
  color: var(--basiq-color-content-subtle);
}

.tag-column {
  display: grid;
  justify-items: end;
  gap: 4px;
}

.tag-column b,
.tag-column em {
  padding: 2px 7px;
  border-radius: 999px;
  color: var(--basiq-color-content-accent);
  background: var(--app-accent-soft);
  font-size: 10px;
  font-style: normal;
}

.tag-column em {
  color: var(--basiq-color-content-subtle);
  background: var(--basiq-color-surface-muted);
}

@media (width <= 860px) {
  .stock-layout {
    grid-template-columns: 1fr;
  }

  .stock-side {
    grid-row: 1;
  }

  .syntax-card {
    display: none;
  }
}
</style>
