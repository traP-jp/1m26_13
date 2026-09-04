<script setup lang="ts">
import { BasiqButton } from "basiq-ui";
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
  <div class="page">
    <header class="page-heading">
      <div>
        <p class="eyebrow">FLOW STOCK</p>
        <h1>運営ノウハウを再利用する</h1>
        <p>FlowClassをLectureやSessionへ適用すると、その時点の本文がFlowへコピーされます。</p>
      </div>
    </header>
    <div class="detail-layout">
      <form class="surface panel" @submit.prevent="save">
        <h2>{{ editingId ? "FlowClassを編集" : "FlowClassを作成" }}</h2>
        <p v-if="notice" class="notice">{{ notice }}</p>
        <p v-if="error" class="notice error">{{ error }}</p>
        <div class="form-grid">
          <label class="field full"
            ><span>名前 *</span><input v-model="form.name" class="input" required /></label
          ><label class="field"
            ><span>分類 *</span
            ><select v-model="form.type" class="select">
              <option value="lecture_pre">講習会の事前</option>
              <option value="session_main">各開催のメイン</option>
              <option value="lecture_post">講習会の事後</option>
            </select></label
          ><label class="checkbox"
            ><input v-model="form.listed" type="checkbox" />Stockに掲載する</label
          ><label class="field full"
            ><span>Flow本文 *</span
            ><textarea
              v-model="form.text"
              class="textarea"
              style="min-height: 24rem"
              required
            ></textarea>
          </label>
        </div>
        <div class="form-actions">
          <button v-if="editingId" class="button secondary" type="button" @click="reset">
            新規作成へ戻る</button
          ><BasiqButton type="submit" :disabled="saving">{{
            saving ? "保存中…" : "保存"
          }}</BasiqButton>
        </div>
      </form>
      <aside>
        <div class="surface panel">
          <h2>文法</h2>
          <p><code># 見出し</code>でページを始め、<code>---</code>で区切ります。</p>
          <p>
            <code v-pre>{{ lecture.name }}</code
            >は入力、<code v-pre>[[ lecture.name ]]</code>は値の展開です。
          </p>
          <p>タスクは<code>- [ ]{#stable-key}</code>のように安定キーを付けます。</p>
        </div>
        <div class="section-heading">
          <h2>保存済み</h2>
          <span>{{ flowClasses.length }}件</span>
        </div>
        <div v-if="loading" class="loading-state">読み込んでいます</div>
        <div v-else class="editor-list">
          <button
            v-for="flowClass in flowClasses"
            :key="flowClass.id"
            class="stock-card"
            type="button"
            @click="edit(flowClass)"
          >
            <div class="card-meta">
              <span class="pill">{{ flowClass.type }}</span
              ><span v-if="!flowClass.listed" class="pill draft">非掲載</span>
            </div>
            <h2>{{ flowClass.name }}</h2>
            <p>format v{{ flowClass.formatVersion }} · revision {{ flowClass.revision }}</p>
          </button>
        </div>
      </aside>
    </div>
  </div>
</template>
