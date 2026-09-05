<script setup lang="ts">
import {
  BasiqButton,
  BasiqCard,
  BasiqFormField,
  BasiqInput,
  BasiqRadioGroup,
  BasiqSwitch,
  BasiqTextarea,
} from "basiq-ui";
import { computed, nextTick, onBeforeUnmount, onMounted, reactive, ref } from "vue";
import { useRoute, useRouter } from "vue-router";

import {
  createRoadmap,
  getRoadmap,
  listAllLectures,
  updateRoadmap,
  type Lecture,
  type Roadmap,
  type RoadmapWrite,
} from "@/api/resources";
import AppIcon from "@/components/AppIcon.vue";

type Item = RoadmapWrite["items"][number];
type TargetType = Item["targetType"];
const route = useRoute();
const router = useRouter();
const roadmapId = computed(() => String(route.params.id ?? ""));
const isNew = computed(() => !roadmapId.value);
const lectures = ref<Lecture[]>([]);
const current = ref<Roadmap>();
const loading = ref(true);
const saving = ref(false);
const error = ref("");
const notice = ref("");
const pickerDialog = ref<HTMLDialogElement>();
const pickerType = ref<TargetType>("lecture");
const pickerItemId = ref("");
const pickerQuery = ref("");
const draggingId = ref("");
const dragOverId = ref("");
const form = reactive({
  title: "",
  description: "",
  audience: "",
  published: false,
  items: [] as Item[],
});

const pickerItem = computed(() => form.items.find((item) => item.id === pickerItemId.value));
const usedTargets = computed(
  () => new Set(form.items.map((item) => `${item.targetType}:${item.targetId}`)),
);
const sessions = computed(() =>
  lectures.value.flatMap((lecture) =>
    lecture.sessions
      .filter((session) => !session.isReplay)
      .map((session) => ({ lecture, session })),
  ),
);
const pickerOptions = computed(() => {
  const query = pickerQuery.value.trim().toLocaleLowerCase("ja");
  const currentKey = pickerItem.value
    ? `${pickerItem.value.targetType}:${pickerItem.value.targetId}`
    : "";
  const values =
    pickerType.value === "lecture"
      ? lectures.value.map((lecture) => ({
          value: lecture.id,
          label: lecture.name,
          description: `${lectureTeam(lecture)} · ${lecture.academicYearStart}年度`,
          disabled:
            usedTargets.value.has(`lecture:${lecture.id}`) &&
            currentKey !== `lecture:${lecture.id}`,
        }))
      : sessions.value.map(({ lecture, session }) => ({
          value: session.id,
          label: `${lecture.name} ${roundLabel(session)}`,
          description: `${session.date ?? "日付未設定"} · ${lectureTeam(lecture)}`,
          disabled:
            usedTargets.value.has(`session:${session.id}`) &&
            currentKey !== `session:${session.id}`,
        }));
  return query
    ? values.filter((item) =>
        `${item.label} ${item.description}`.toLocaleLowerCase("ja").includes(query),
      )
    : values;
});

function lectureTeam(lecture: Lecture) {
  return lecture.organizer?.kind === "group"
    ? (lecture.organizer.groupName ?? lecture.organizer.id)
    : (lecture.organizer?.id ?? "班未設定");
}
function roundLabel(session: Lecture["sessions"][number]) {
  return `第${session.order + 1}回`;
}
function resolveItem(item: Item) {
  if (item.targetType === "lecture") {
    const lecture = lectures.value.find((entry) => entry.id === item.targetId);
    return {
      title: lecture?.name ?? `講習会 ${item.targetId}`,
      meta: lecture
        ? `講習会 · ${lectureTeam(lecture)} · ${lecture.academicYearStart}年度`
        : "講習会",
    };
  }
  const value = sessions.value.find(({ session }) => session.id === item.targetId);
  return {
    title: value ? `${value.lecture.name} ${roundLabel(value.session)}` : `開催 ${item.targetId}`,
    meta: value
      ? `開催 · ${value.session.date ?? "日付未設定"} · ${lectureTeam(value.lecture)}`
      : "開催",
  };
}
function canAdd(type: TargetType) {
  const ids =
    type === "lecture"
      ? lectures.value.map((lecture) => lecture.id)
      : sessions.value.map(({ session }) => session.id);
  return ids.some((id) => !usedTargets.value.has(`${type}:${id}`));
}
function fill(roadmap: Roadmap) {
  current.value = roadmap;
  Object.assign(form, {
    title: roadmap.title,
    description: roadmap.description,
    audience: roadmap.audience,
    published: roadmap.published,
    items: roadmap.items.map((item) => ({ ...item })),
  });
}
async function openPicker(type: TargetType, itemId = "") {
  pickerType.value = type;
  pickerItemId.value = itemId;
  pickerQuery.value = "";
  await nextTick();
  pickerDialog.value?.showModal();
  pickerDialog.value?.querySelector<HTMLInputElement>("input")?.focus();
}
function closePicker() {
  pickerDialog.value?.close();
  pickerItemId.value = "";
  pickerQuery.value = "";
}
function selectTarget(targetId: string | null) {
  if (!targetId) return;
  if (pickerItem.value) pickerItem.value.targetId = targetId;
  else form.items.push({ id: crypto.randomUUID(), targetType: pickerType.value, targetId });
  closePicker();
}
function removeItem(id: string) {
  form.items = form.items.filter((item) => item.id !== id);
}
function moveItem(index: number, offset: -1 | 1) {
  const destination = index + offset;
  if (destination < 0 || destination >= form.items.length) return;
  const [item] = form.items.splice(index, 1);
  if (item) form.items.splice(destination, 0, item);
}
function onHandleKeydown(event: KeyboardEvent, index: number) {
  if (!event.altKey) return;
  if (event.key === "ArrowUp") {
    event.preventDefault();
    moveItem(index, -1);
  } else if (event.key === "ArrowDown") {
    event.preventDefault();
    moveItem(index, 1);
  }
}
function updatePointerTarget(event: PointerEvent) {
  if (!draggingId.value) return;
  const row = (
    document.elementFromPoint(event.clientX, event.clientY) as HTMLElement | null
  )?.closest<HTMLElement>("[data-roadmap-item-id]");
  dragOverId.value = row?.dataset.roadmapItemId ?? "";
}
function finishDrag() {
  draggingId.value = "";
  dragOverId.value = "";
  window.removeEventListener("pointermove", updatePointerTarget);
  window.removeEventListener("pointerup", finishPointerDrag);
  window.removeEventListener("pointercancel", finishDrag);
}
function finishPointerDrag(event: PointerEvent) {
  updatePointerTarget(event);
  const sourceIndex = form.items.findIndex((item) => item.id === draggingId.value);
  const destination = form.items.findIndex((item) => item.id === dragOverId.value);
  if (sourceIndex >= 0 && destination >= 0 && sourceIndex !== destination) {
    const [item] = form.items.splice(sourceIndex, 1);
    if (item) form.items.splice(destination, 0, item);
  }
  finishDrag();
}
function startDrag(id: string, event: PointerEvent) {
  event.preventDefault();
  finishDrag();
  draggingId.value = id;
  dragOverId.value = id;
  window.addEventListener("pointermove", updatePointerTarget);
  window.addEventListener("pointerup", finishPointerDrag);
  window.addEventListener("pointercancel", finishDrag);
}
function onDialogClick(event: MouseEvent) {
  if (event.target === pickerDialog.value) closePicker();
}
async function load() {
  loading.value = true;
  error.value = "";
  try {
    if (isNew.value) lectures.value = await listAllLectures({ includeDraft: true });
    else {
      const [lectureValues, roadmap] = await Promise.all([
        listAllLectures({ includeDraft: true }),
        getRoadmap(roadmapId.value, true),
      ]);
      lectures.value = lectureValues;
      fill(roadmap);
    }
  } catch (reason) {
    error.value = reason instanceof Error ? reason.message : "読み込めませんでした";
  } finally {
    loading.value = false;
  }
}
async function save() {
  saving.value = true;
  error.value = "";
  notice.value = "";
  try {
    const body: RoadmapWrite = {
      title: form.title,
      description: form.description,
      audience: form.audience,
      published: form.published,
      items: form.items.map((item) => ({ ...item })),
      expectedRevision: current.value?.revision ?? 0,
    };
    const saved = isNew.value
      ? await createRoadmap(body)
      : await updateRoadmap(roadmapId.value, body);
    if (isNew.value) await router.replace(`/admin/roadmaps/${saved.id}`);
    fill(saved);
    notice.value = "ロードマップを保存しました。";
  } catch (reason) {
    error.value = reason instanceof Error ? reason.message : "保存できませんでした";
  } finally {
    saving.value = false;
  }
}
onMounted(load);
onBeforeUnmount(finishDrag);
</script>

<template>
  <div class="page roadmap-editor-page">
    <nav class="breadcrumb" aria-label="パンくずリスト">
      <RouterLink to="/admin">運営向けページ</RouterLink><AppIcon name="chevron" :size="14" />
      <span>ロードマップ管理</span><AppIcon name="chevron" :size="14" /><span>{{
        isNew ? "新規作成" : "編集"
      }}</span>
    </nav>
    <header class="page-heading">
      <div>
        <h1>{{ isNew ? "ロードマップを作成" : "ロードマップを編集" }}</h1>
        <p>ロードマップの内容と、講習会や開催の順番を編集します。</p>
      </div>
    </header>
    <div v-if="loading" class="loading-state">編集データを読み込んでいます</div>
    <form v-else class="editor-form" @submit.prevent="save">
      <p v-if="notice" class="notice" role="status">{{ notice }}</p>
      <p v-if="error" class="notice error" role="alert">{{ error }}</p>
      <BasiqCard title="基本情報"
        ><div class="basic-grid">
          <BasiqFormField class="span-two" label="ロードマップ名" required
            ><BasiqInput v-model="form.title" required maxlength="200"
          /></BasiqFormField>
          <BasiqFormField class="span-two" label="概要" required
            ><BasiqTextarea
              v-model="form.description"
              required
              :rows="3"
              resize="vertical"
              maxlength="10000"
          /></BasiqFormField>
          <BasiqFormField label="対象者" required
            ><BasiqInput v-model="form.audience" required maxlength="2000" placeholder="例：新入生"
          /></BasiqFormField>
          <div class="publication-field">
            <strong>公開状態</strong
            ><BasiqSwitch v-model="form.published"
              ><span>{{ form.published ? "公開中" : "下書き" }}</span></BasiqSwitch
            >
          </div>
        </div></BasiqCard
      >
      <section class="sequence-section" aria-labelledby="sequence-title">
        <div class="section-heading">
          <div>
            <h2 id="sequence-title">学ぶ順番</h2>
            <p id="reorder-help">
              グリップをドラッグ、またはフォーカスしてAlt＋↑ / ↓で並べ替えます。
            </p>
          </div>
          <div class="section-actions">
            <BasiqButton
              type="button"
              tone="neutral"
              variant="outline"
              :disabled="!canAdd('lecture')"
              @click="openPicker('lecture')"
              ><AppIcon name="plus" :size="18" />講習会を追加</BasiqButton
            ><BasiqButton
              type="button"
              tone="neutral"
              variant="outline"
              :disabled="!canAdd('session')"
              @click="openPicker('session')"
              ><AppIcon name="plus" :size="18" />開催を追加</BasiqButton
            >
          </div>
        </div>
        <div v-if="!form.items.length" class="empty-sequence">
          まだ項目はありません。講習会または開催を追加してください。
        </div>
        <ol v-else class="workshop-sequence">
          <li
            v-for="(item, index) in form.items"
            :key="item.id"
            :data-roadmap-item-id="item.id"
            :class="{
              'is-dragging': draggingId === item.id,
              'is-drop-target': dragOverId === item.id,
            }"
          >
            <BasiqCard
              ><div class="sequence-item">
                <button
                  class="drag-handle"
                  type="button"
                  :aria-label="`${resolveItem(item).title}を並べ替え。Altと上下矢印でも移動できます`"
                  aria-describedby="reorder-help"
                  @pointerdown="startDrag(item.id, $event)"
                  @keydown="onHandleKeydown($event, index)"
                >
                  <AppIcon name="grip" :size="22" />
                </button>
                <span class="sequence-number">{{ index + 1 }}</span
                ><AppIcon :name="item.targetType === 'lecture' ? 'map' : 'calendar'" />
                <span class="workshop-copy"
                  ><strong>{{ resolveItem(item).title }}</strong
                  ><small>{{ resolveItem(item).meta }}</small></span
                >
                <div class="sequence-actions">
                  <BasiqButton
                    type="button"
                    tone="neutral"
                    variant="outline"
                    @click="openPicker(item.targetType, item.id)"
                    >変更</BasiqButton
                  ><BasiqButton
                    type="button"
                    tone="danger"
                    variant="outline"
                    :aria-label="`${resolveItem(item).title}を外す`"
                    @click="removeItem(item.id)"
                    ><AppIcon name="trash" :size="17"
                  /></BasiqButton>
                </div></div
            ></BasiqCard>
          </li>
        </ol>
      </section>
      <dialog
        ref="pickerDialog"
        class="picker-dialog"
        @cancel.prevent="closePicker"
        @click="onDialogClick"
      >
        <header class="picker-dialog-heading">
          <div>
            <h2>{{ pickerType === "lecture" ? "講習会を選択" : "開催を選択" }}</h2>
            <p v-if="pickerItem">{{ resolveItem(pickerItem).title }}</p>
          </div>
          <BasiqButton type="button" tone="neutral" variant="outline" @click="closePicker"
            >閉じる</BasiqButton
          >
        </header>
        <div class="picker-dialog-body">
          <BasiqFormField label="検索"
            ><BasiqInput
              v-model="pickerQuery"
              :placeholder="
                pickerType === 'lecture' ? '講習会名や班で検索' : '講習会名、回、日付、班で検索'
              "
          /></BasiqFormField>
          <BasiqRadioGroup
            v-if="pickerOptions.length"
            :model-value="pickerItem?.targetId ?? ''"
            :items="pickerOptions"
            :name="`roadmap-picker-${pickerItem?.id ?? 'new'}`"
            label="検索結果"
            orientation="vertical"
            @update:model-value="selectTarget"
          />
          <p v-else class="picker-empty">該当する候補はありません。</p>
        </div>
      </dialog>
      <div class="action-bar">
        <BasiqButton type="button" tone="neutral" variant="outline" @click="router.push('/admin')"
          >キャンセル</BasiqButton
        ><BasiqButton type="submit" :disabled="saving">{{
          saving ? "保存中…" : isNew ? "作成して保存" : "変更を保存"
        }}</BasiqButton>
      </div>
    </form>
  </div>
</template>

<style scoped>
.roadmap-editor-page {
  width: min(1060px, 100%);
  margin: 0 auto;
  padding: 28px 36px 72px;
}

.page-heading {
  display: flex;
  justify-content: space-between;
  gap: 24px;
  margin-bottom: 20px;
  padding-bottom: 18px;
  border-bottom: 1px solid var(--basiq-color-border-separator);
}

.page-heading h1 {
  font-size: clamp(1.7rem, 3vw, 2rem);
  line-height: 1.25;
  letter-spacing: -0.02em;
}

.page-heading p {
  margin-top: 6px;
  color: var(--basiq-color-content-subtle);
}

.editor-form {
  display: grid;
  gap: 24px;
}

.basic-grid {
  display: grid;
  grid-template-columns: minmax(0, 1.35fr) minmax(260px, 0.65fr);
  gap: 16px 22px;
}

.span-two {
  grid-column: 1 / -1;
}

.publication-field {
  min-height: 90px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 18px;
  padding: 13px 15px;
  border-radius: var(--basiq-radius-sm);
  background: var(--basiq-color-surface-base);
}

.publication-field strong {
  font-size: 1rem;
}

.section-heading {
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
  gap: 18px;
  margin-bottom: 12px;
}

.section-heading h2 {
  font-size: 1.25rem;
}

.section-heading p {
  margin-top: 3px;
  color: var(--basiq-color-content-subtle);
  font-size: 0.84rem;
}

.section-actions,
.sequence-actions,
.action-bar {
  display: flex;
  gap: 8px;
}

.workshop-sequence {
  display: grid;
  gap: 10px;
  margin: 0;
  padding: 0;
  list-style: none;
}

.workshop-sequence > li {
  border-radius: var(--basiq-radius-md);
  transition:
    opacity 120ms ease,
    box-shadow 120ms ease;
}

.workshop-sequence > li.is-dragging {
  opacity: 0.48;
}

.workshop-sequence > li.is-drop-target {
  box-shadow: 0 0 0 2px var(--basiq-color-accent-default);
}

.sequence-item {
  min-width: 0;
  min-height: 62px;
  display: grid;
  grid-template-columns: 26px 32px 20px minmax(0, 1fr) auto;
  align-items: center;
  gap: 12px;
}

.drag-handle {
  width: 26px;
  height: 42px;
  display: grid;
  place-items: center;
  padding: 0;
  border: 0;
  border-radius: var(--basiq-radius-sm);
  color: var(--basiq-color-content-subtle);
  background: transparent;
  cursor: grab;
  touch-action: none;
}

.drag-handle:hover {
  color: var(--basiq-color-content-default);
  background: var(--basiq-color-surface-muted);
}

.drag-handle:focus-visible {
  outline: 2px solid var(--basiq-color-accent-default);
  outline-offset: 2px;
}

.sequence-number {
  width: 32px;
  height: 32px;
  display: grid;
  place-items: center;
  border-radius: 50%;
  color: var(--basiq-color-content-on-accent);
  background: var(--basiq-color-accent-default);
  font-weight: 800;
}

.sequence-item > .app-icon {
  color: var(--basiq-color-content-accent);
}

.workshop-copy {
  min-width: 0;
  display: flex;
  flex-direction: column;
}

.workshop-copy strong,
.workshop-copy small {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.workshop-copy strong {
  font-size: 0.9rem;
}

.workshop-copy small {
  color: var(--basiq-color-content-subtle);
  font-size: 0.7rem;
}

.sequence-actions {
  align-items: center;
}

.sequence-actions button:has(.app-icon) {
  min-width: 40px;
  width: 40px;
  padding-inline: 0;
  justify-content: center;
}

.empty-sequence,
.picker-empty {
  padding: 28px;
  border: 1px dashed var(--basiq-color-border-separator);
  border-radius: var(--basiq-radius-sm);
  color: var(--basiq-color-content-subtle);
  background: var(--basiq-color-surface-muted);
  text-align: center;
}

.picker-dialog {
  width: min(620px, calc(100vw - 32px));
  max-height: calc(100dvh - 32px);
  padding: 0;
  overflow: hidden;
  border: 1px solid var(--basiq-color-border-separator);
  border-radius: var(--basiq-radius-md);
  color: var(--basiq-color-content-default);
  background: var(--basiq-color-surface-base);
  box-shadow: 0 20px 52px rgb(26 39 52 / 24%);
}

.picker-dialog::backdrop {
  background: rgb(26 39 52 / 42%);
}

.picker-dialog-heading {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 18px;
  padding: 20px 22px 16px;
  border-bottom: 1px solid var(--basiq-color-border-separator);
}

.picker-dialog-heading h2 {
  font-size: 1.2rem;
}

.picker-dialog-heading p {
  margin-top: 3px;
  color: var(--basiq-color-content-subtle);
  font-size: 0.8rem;
}

.picker-dialog-body {
  display: grid;
  gap: 18px;
  max-height: calc(100dvh - 140px);
  padding: 18px 22px 22px;
  overflow-y: auto;
}

.action-bar {
  position: sticky;
  z-index: 10;
  bottom: 0;
  justify-content: flex-end;
  margin-top: -4px;
  padding: 13px 0;
  border-top: 1px solid var(--basiq-color-border-separator);
  background: color-mix(in srgb, var(--basiq-color-surface-base) 94%, transparent);
  backdrop-filter: blur(8px);
}

@media (width <= 900px) and (width >= 761px) {
  .roadmap-editor-page {
    padding-inline: 24px;
  }
}

@media (width <= 760px) {
  .roadmap-editor-page {
    width: 100%;
    padding: 18px 16px 112px;
  }

  .page-heading {
    margin-bottom: 16px;
    padding-bottom: 14px;
  }

  .page-heading h1 {
    font-size: 1.65rem;
  }

  .page-heading p {
    max-width: 290px;
    font-size: 0.82rem;
  }

  .editor-form {
    gap: 20px;
  }

  .basic-grid {
    grid-template-columns: 1fr;
    gap: 14px;
  }

  .span-two {
    grid-column: auto;
  }

  .publication-field {
    min-height: 78px;
    padding: 11px 12px;
  }

  .section-heading {
    align-items: flex-start;
    flex-wrap: wrap;
  }

  .section-actions {
    width: 100%;
  }

  .section-actions button {
    flex: 1;
    justify-content: center;
  }

  .section-actions .app-icon {
    display: none;
  }

  .sequence-item {
    grid-template-columns: 26px 32px minmax(0, 1fr) auto;
    gap: 9px;
  }

  .sequence-item > .app-icon {
    display: none;
  }

  .sequence-actions {
    align-self: center;
  }

  .picker-dialog {
    width: calc(100vw - 28px);
    max-height: calc(100dvh - 28px);
  }

  .picker-dialog-heading {
    padding: 16px 16px 14px;
  }

  .picker-dialog-body {
    max-height: calc(100dvh - 116px);
    padding: 16px;
  }

  .action-bar {
    position: fixed;
    inset: auto 0 64px;
    margin: 0;
    padding: 10px 16px;
    background: color-mix(in srgb, var(--basiq-color-surface-base) 96%, transparent);
  }
}

@media (width <= 420px) {
  .roadmap-editor-page {
    padding-inline: 14px;
  }

  .sequence-item {
    grid-template-columns: 22px 28px minmax(0, 1fr) auto;
    gap: 7px;
  }

  .sequence-number {
    width: 28px;
    height: 28px;
  }

  .sequence-actions {
    gap: 4px;
  }

  .sequence-actions button:first-child {
    min-width: 52px;
    padding-inline: 10px;
  }
}
</style>
