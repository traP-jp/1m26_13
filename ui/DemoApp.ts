import {
  BasiqAvatar,
  BasiqButton,
  BasiqCard,
  BasiqCheckbox,
  BasiqFormField,
  BasiqIcon,
  BasiqInput,
  BasiqRadioGroup,
  BasiqSwitch,
  BasiqTabsList,
  BasiqTabsRoot,
  BasiqTabsTrigger,
  BasiqTag,
  BasiqTextarea,
  BasiqThemeProvider,
} from "basiq-ui";
import {
  computed,
  defineComponent,
  h,
  nextTick,
  onBeforeUnmount,
  onMounted,
  ref,
  watch,
} from "vue/dist/vue.esm-bundler.js";
import {
  cloneSeedWorkshops,
  inheritWorkshop,
  makeBlankWorkshop,
  normalizeWorkshop,
  type Occurrence,
  type ResourceType,
  type Workshop,
  type WorkshopOperator,
  type WorkshopRelationRef,
} from "./data";

type Route =
  | { name: "home" }
  | { name: "search" }
  | { name: "detail"; id: string }
  | { name: "create" }
  | { name: "edit"; id: string }
  | { name: "drafts" }
  | { name: "me" }
  | { name: "share"; id: string }
  | { name: "not-found" };

type SearchFilter = "all" | "learnable" | "material" | "video" | "record";
type RelationKind = "previous" | "prerequisite" | "recommended";

type TraqDirectoryCandidate = {
  kind: "user" | "group";
  id: string;
  name: string;
  label: string;
  detail: string;
};

type RelationEntryView = {
  key: string;
  kind: "workshop" | "text";
  workshopId?: string;
  text?: string;
  label: string;
  meta: string;
};

const WORKSHOP_STORAGE_KEY = "trap-workshop-demo:workshops-v3";
const COMPLETION_STORAGE_KEY = "trap-workshop-demo:completions-v3";
const VISIBILITY_STORAGE_KEY = "trap-workshop-demo:profile-visible-v3";
const TRAQ_USER_ICON_URL = "https://q.trap.jp/api/v3/public/icon/rurun";

const TRAP_TEAMS = [
  "アルゴリズム班",
  "CTF班",
  "ゲーム班",
  "グラフィック班",
  "Kaggle班",
  "サウンド班",
  "SysAd班",
] as const;

const ORGANIZER_SOURCES = [...TRAP_TEAMS, "unders", "個人・有志"] as const;

// traQ APIから読み取った候補の安全なスナップショット。認証情報は含めない。
const TRAQ_DIRECTORY: TraqDirectoryCandidate[] = [
  { kind: "user", id: "01961950-5a89-7ae8-8532-48b2d017c5a7", name: "rurun", label: "@rurun", detail: "rurun" },
  { kind: "user", id: "0020f05d-82f5-4bfd-b5b2-3cde3c2c290c", name: "kyomu", label: "@kyomu", detail: "きょむ" },
  { kind: "user", id: "01919d25-3e1d-753d-82a7-2e6ba120857c", name: "otima", label: "@otima", detail: "Elmer" },
  { kind: "user", id: "01928684-4cbb-7edc-bed1-e7683e80c40c", name: "taroo", label: "@taroo", detail: "taroo" },
  { kind: "user", id: "01960ef0-f70c-7d18-a0c0-8455043510bc", name: "NAYU19", label: "@NAYU19", detail: "NAYU19" },
  { kind: "user", id: "01960ef2-8286-7d2d-ae56-659c2ae9358a", name: "Mimi_year", label: "@Mimi_year", detail: "ド進ちゃん" },
  { kind: "group", id: "019db124-aa8d-7e63-bba6-11ff2257129d", name: "git-lecture26_staff", label: "git-lecture26_staff", detail: "unders26 Git講習会担当" },
  { kind: "group", id: "019b5ed5-391b-7a3c-995c-ee40cc3c8021", name: "unders26", label: "unders26", detail: "2026年度の新入生グループ" },
  { kind: "group", id: "280bf56d-fa22-46bc-8dcc-6367d600d873", name: "algorithm", label: "algorithm", detail: "アルゴリズム班" },
  { kind: "group", id: "c5670065-75d4-4851-bfba-9ff05201fc44", name: "CTF", label: "CTF", detail: "CTF班" },
  { kind: "group", id: "af240e80-8526-4f21-925e-b20eded06284", name: "Game", label: "Game", detail: "ゲーム班" },
  { kind: "group", id: "867b3529-696f-4bd1-af53-1947eba92e77", name: "graphics", label: "graphics", detail: "グラフィック班" },
  { kind: "group", id: "ec54d385-e5e7-4554-8aa2-878ebedc9db0", name: "kaggle", label: "kaggle", detail: "Kaggle班" },
  { kind: "group", id: "cb977ab2-85fa-4953-ac4d-809eaef427e6", name: "sound", label: "sound", detail: "サウンド班" },
  { kind: "group", id: "f86db5ec-dc02-4885-aa0a-732bb229a1b5", name: "SysAd", label: "SysAd", detail: "SysAd班" },
];

const RELATION_SECTIONS: Array<{ kind: RelationKind; label: string }> = [
  { kind: "previous", label: "昨年度までの対応する講習会" },
  { kind: "prerequisite", label: "前提とする講習会" },
  { kind: "recommended", label: "次におすすめの講習会" },
];

const parseRoute = (hash: string): Route => {
  const path = hash.replace(/^#/, "") || "/";
  const segments = path.split("?")[0].split("/").filter(Boolean).map(decodeURIComponent);
  if (!segments.length) return { name: "home" };
  if (segments.length === 1 && segments[0] === "search") return { name: "search" };
  if (segments.length === 1 && segments[0] === "new") return { name: "create" };
  if (segments.length === 1 && segments[0] === "drafts") return { name: "drafts" };
  if (segments.length === 1 && segments[0] === "me") return { name: "me" };
  if (segments[0] === "workshops" && segments.length === 2) return { name: "detail", id: segments[1] };
  if (segments[0] === "edit" && segments.length === 2) return { name: "edit", id: segments[1] };
  if (segments[0] === "share" && segments.length === 2) return { name: "share", id: segments[1] };
  return { name: "not-found" };
};

const cloneWorkshop = (workshop: Workshop): Workshop => JSON.parse(JSON.stringify(workshop));

const routeTitle = (route: Route, workshop?: Workshop | null) => {
  if (route.name === "home") return "ホーム";
  if (route.name === "search") return "講習会を探す";
  if (route.name === "create") return "講習会を作る";
  if (route.name === "drafts") return "自分の下書き";
  if (route.name === "me") return "マイページ";
  if (route.name === "share") return "バッジを共有";
  if (route.name === "edit") return "講習会を編集";
  if (route.name === "detail") return workshop?.title ?? "講習会";
  return "ページが見つかりません";
};

const typeLabel: Record<ResourceType, string> = {
  material: "資料",
  video: "動画",
  practice: "実習",
  source: "記録",
  repository: "リポジトリ",
};

const makeIcon = (name: string, path: string) => defineComponent({
  name,
  inheritAttrs: false,
  setup(_, { attrs }) {
    return () => h("svg", {
      viewBox: "0 0 24 24",
      fill: "currentColor",
      xmlns: "http://www.w3.org/2000/svg",
      ...attrs,
    }, [h("path", { d: path })]);
  },
});

const HomeIcon = makeIcon("HomeIcon", "M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8h5Z");
const SearchIcon = makeIcon("SearchIcon", "M9.5 3a6.5 6.5 0 1 0 4.02 11.61L18.91 20l1.42-1.41-5.39-5.38A6.5 6.5 0 0 0 9.5 3Zm0 2a4.5 4.5 0 1 1 0 9 4.5 4.5 0 0 1 0-9Z");
const DraftIcon = makeIcon("DraftIcon", "M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6Zm0 2.5L17.5 8H14V4.5ZM8 12h8v2H8v-2Zm0 4h8v2H8v-2Z");
const PlusIcon = makeIcon("PlusIcon", "M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2Z");

export default defineComponent({
  name: "DemoApp",
  components: {
    BasiqAvatar,
    BasiqButton,
    BasiqCard,
    BasiqCheckbox,
    BasiqFormField,
    BasiqIcon,
    BasiqInput,
    BasiqRadioGroup,
    BasiqSwitch,
    BasiqTabsList,
    BasiqTabsRoot,
    BasiqTabsTrigger,
    BasiqTag,
    BasiqTextarea,
    BasiqThemeProvider,
  },
  setup() {
    const route = ref<Route>({ name: "home" });
    const workshops = ref<Workshop[]>(cloneSeedWorkshops());
    const completedAt = ref<Record<string, string>>({});
    const profileVisible = ref(false);
    const hydrated = ref(false);
    const query = ref("");
    const creationQuery = ref("");
    const activeFilter = ref<SearchFilter>("all");
    const activeTeam = ref("all");
    const showAllYears = ref(false);
    const randomWorkshopIds = ref<string[]>([]);
    const detailReturnPath = ref("/search");
    const editorDraft = ref<Workshop>(makeBlankWorkshop());
    const editorStep = ref(0);
    const activeBasicInfoSection = ref("basic-name");
    const operatorQuery = ref("");
    const relationQuery = ref<Record<RelationKind, string>>({ previous: "", prerequisite: "", recommended: "" });
    const noticeKind = ref<"traq" | "knoq">("traq");
    const toast = ref("");
    let toastTimer: ReturnType<typeof setTimeout> | undefined;
    let hasUpdatedRoute = false;

    const selectedWorkshop = computed(() => {
      const currentRoute = route.value;
      if (currentRoute.name !== "detail" && currentRoute.name !== "share") return null;
      return workshops.value.find((workshop) => workshop.id === currentRoute.id) ?? null;
    });

    const sourceWorkshop = computed(() => {
      const previousId = editorDraft.value.previousIds[0];
      return previousId ? workshops.value.find((workshop) => workshop.id === previousId) ?? null : null;
    });

    const previousWorkshops = computed(() => {
      const workshop = selectedWorkshop.value;
      if (!workshop) return [];
      return workshop.previousIds
        .map((id) => workshops.value.find((candidate) => candidate.id === id))
        .filter((candidate): candidate is Workshop => Boolean(candidate));
    });

    const nextWorkshops = computed(() => {
      const workshop = selectedWorkshop.value;
      if (!workshop) return [];
      return workshops.value.filter((candidate) => candidate.previousIds.includes(workshop.id));
    });

    const teams = computed(() => Array.from(new Set(
      workshops.value.filter((workshop) => workshop.status === "public" && workshop.team).map((workshop) => workshop.team),
    )).sort());

    const latestPublicWorkshops = computed(() => {
      const newestByLineage = new Map<string, Workshop>();
      const publicWorkshops = workshops.value
        .filter((workshop) => workshop.status === "public")
        .sort((a, b) => b.year - a.year || a.title.localeCompare(b.title, "ja"));
      for (const workshop of publicWorkshops) {
        if (!newestByLineage.has(workshop.lineageId)) newestByLineage.set(workshop.lineageId, workshop);
      }
      return Array.from(newestByLineage.values());
    });

    const teamSummaries = computed(() => teams.value.map((name) => ({
      name,
      count: new Set(workshops.value
        .filter((workshop) => workshop.status === "public" && workshop.team === name)
        .map((workshop) => workshop.lineageId)).size,
    })));

    const workshopLatestDate = (workshop: Workshop) => workshop.occurrences
      .map((occurrence) => occurrence.date)
      .filter(Boolean)
      .sort((a, b) => b.localeCompare(a))[0] ?? "";

    const recentWorkshops = computed(() => latestPublicWorkshops.value
      .filter((workshop) => workshopLatestDate(workshop))
      .sort((a, b) => workshopLatestDate(b).localeCompare(workshopLatestDate(a)))
      .slice(0, 3));

    const randomWorkshops = computed(() => randomWorkshopIds.value
      .map((id) => latestPublicWorkshops.value.find((workshop) => workshop.id === id))
      .filter((workshop): workshop is Workshop => Boolean(workshop)));

    const hasResource = (workshop: Workshop, type: ResourceType) => workshop.resources.some(
      (resource) => resource.type === type && Boolean(resource.url?.trim()),
    );
    const hasLearningResource = (workshop: Workshop) => workshop.resources.some(
      (resource) => ["material", "video", "practice"].includes(resource.type) && Boolean(resource.url?.trim()),
    );

    const availability = (workshop: Workshop) => {
      const material = hasResource(workshop, "material") || hasResource(workshop, "practice");
      const video = hasResource(workshop, "video");
      if (material && video) return "資料・動画あり";
      if (video) return "動画あり";
      if (material) return "資料あり";
      return "記録のみ";
    };

    const relationReferenceText = (reference: WorkshopRelationRef) => {
      if (reference.kind === "text") return reference.text;
      return workshops.value.find((candidate) => candidate.id === reference.workshopId)?.title ?? "";
    };

    const workshopMatches = (workshop: Workshop, needle: string, filter: SearchFilter, teamFilter = activeTeam.value) => {
      const haystack = [
        workshop.title,
        workshop.summary,
        workshop.outcome,
        workshop.audience,
        workshop.prerequisites,
        workshop.team,
        ...workshop.previousTextRefs.map(relationReferenceText),
        ...workshop.prerequisiteRefs.map(relationReferenceText),
        ...workshop.recommendedRefs.map(relationReferenceText),
        ...workshop.tags,
      ].join(" ").toLowerCase();
      const queryMatches = !needle || haystack.includes(needle);
      const teamMatches = teamFilter === "all" || workshop.team === teamFilter;
      const filterMatches = filter === "all"
        || (filter === "learnable" && hasLearningResource(workshop))
        || (filter === "material" && (hasResource(workshop, "material") || hasResource(workshop, "practice")))
        || (filter === "video" && hasResource(workshop, "video"))
        || (filter === "record" && !hasLearningResource(workshop));
      return queryMatches && teamMatches && filterMatches;
    };

    const searchResults = computed(() => {
      const needle = query.value.trim().toLowerCase();
      const matches = workshops.value
        .filter((workshop) => workshop.status === "public")
        .filter((workshop) => workshopMatches(workshop, needle, activeFilter.value))
        .sort((a, b) => b.year - a.year || a.title.localeCompare(b.title, "ja"));
      if (showAllYears.value) return matches;
      const newestByLineage = new Map<string, Workshop>();
      for (const workshop of matches) {
        if (!newestByLineage.has(workshop.lineageId)) newestByLineage.set(workshop.lineageId, workshop);
      }
      return Array.from(newestByLineage.values());
    });

    const creationResults = computed(() => {
      const needle = creationQuery.value.trim().toLowerCase();
      const matches = workshops.value
        .filter((workshop) => workshop.status === "public")
        .filter((workshop) => workshopMatches(workshop, needle, "all", "all"))
        .sort((a, b) => b.year - a.year);
      const newestByLineage = new Map<string, Workshop>();
      for (const workshop of matches) {
        if (!newestByLineage.has(workshop.lineageId)) newestByLineage.set(workshop.lineageId, workshop);
      }
      return Array.from(newestByLineage.values());
    });

    const drafts = computed(() => workshops.value.filter((workshop) => workshop.status === "draft"));
    const completedWorkshops = computed(() => Object.keys(completedAt.value)
      .map((id) => workshops.value.find((workshop) => workshop.id === id))
      .filter((workshop): workshop is Workshop => Boolean(workshop))
      .sort((a, b) => completedAt.value[b.id].localeCompare(completedAt.value[a.id])));

    const editorSections = computed(() => {
      const draft = editorDraft.value;
      const firstOccurrence = draft.occurrences[0];
      return [
        { label: "基本情報", done: Boolean(draft.title && draft.summary && draft.audience) },
        { label: "", done: Boolean(firstOccurrence?.title && firstOccurrence?.date && firstOccurrence?.mode !== "undecided") },
        { label: "", done: Boolean(draft.preparation && draft.howToLearn && draft.contact) },
        { label: "", done: hasLearningResource(draft) },
        { label: "", done: false },
      ];
    });

    const basicInfoSections = computed(() => {
      const draft = editorDraft.value;
      return [
        { id: "basic-name", label: "講習会名", done: Boolean(draft.title.trim()) },
        { id: "basic-overview", label: "概要", done: Boolean(draft.year && draft.summary.trim()) },
        { id: "basic-operations", label: "運営", done: Boolean(draft.team && draft.operators.length) },
        { id: "basic-target", label: "対象", done: Boolean(draft.audience.trim() || draft.targetTeams.length) },
        { id: "basic-attributes", label: "属性", done: draft.isZeroToOne !== null },
        {
          id: "basic-relations",
          label: "関連する講習会",
          done: Boolean(
            draft.previousIds.length
            || draft.previousTextRefs.length
            || draft.prerequisiteRefs.length
            || draft.recommendedRefs.length,
          ),
        },
      ];
    });

    const operatorSuggestions = computed(() => {
      const needle = operatorQuery.value.trim().toLowerCase().replace(/^@/, "");
      if (!needle) return [];
      const selectedIds = new Set(editorDraft.value.operators.map((operator) => operator.id));
      return TRAQ_DIRECTORY
        .filter((candidate) => !selectedIds.has(candidate.id))
        .filter((candidate) => [candidate.name, candidate.label, candidate.detail]
          .join(" ")
          .toLowerCase()
          .includes(needle))
        .sort((left, right) => Number(left.kind === "group") - Number(right.kind === "group"))
        .slice(0, 8);
    });

    const zeroToOneValue = computed<string | null>({
      get: () => editorDraft.value.isZeroToOne === null ? null : String(editorDraft.value.isZeroToOne),
      set: (value) => {
        editorDraft.value.isZeroToOne = value === null ? null : value === "true";
      },
    });

    const editorProgress = computed(() => {
      const draft = editorDraft.value;
      const checks = [
        draft.title,
        draft.summary,
        draft.outcome,
        draft.audience,
        draft.team,
        draft.operators.length ? "yes" : "",
        draft.targetTeams.length ? "yes" : "",
        draft.isZeroToOne !== null ? "yes" : "",
        draft.occurrences[0]?.title,
        draft.occurrences[0]?.date,
        draft.occurrences[0]?.mode !== "undecided" ? "yes" : "",
        draft.preparation,
        draft.howToLearn,
        draft.contact,
        hasLearningResource(draft) ? "yes" : "",
      ];
      return Math.round((checks.filter(Boolean).length / checks.length) * 100);
    });

    const tagText = computed({
      get: () => editorDraft.value.tags.join("、"),
      set: (value: string) => {
        editorDraft.value.tags = value.split(/[、,]/).map((tag) => tag.trim()).filter(Boolean);
      },
    });

    const collaboratorText = computed({
      get: () => editorDraft.value.creators.filter((name) => name !== "rurun").join("、"),
      set: (value: string) => {
        const collaborators = value.split(/[、,]/).map((name) => name.trim()).filter(Boolean);
        editorDraft.value.creators = Array.from(new Set(["rurun", ...collaborators]));
      },
    });

    const resourceUrl = (type: ResourceType, occurrenceId?: string) => editorDraft.value.resources.find(
      (resource) => resource.type === type && resource.occurrenceId === occurrenceId,
    )?.url ?? "";
    const setResourceUrl = (type: ResourceType, value: string, occurrenceId?: string) => {
      const existingIndex = editorDraft.value.resources.findIndex(
        (resource) => resource.type === type && resource.occurrenceId === occurrenceId,
      );
      const normalized = value.trim();
      if (!normalized) {
        if (existingIndex >= 0) editorDraft.value.resources.splice(existingIndex, 1);
        return;
      }
      const existing = editorDraft.value.resources[existingIndex];
      if (existing) {
        existing.url = normalized;
        return;
      }
      editorDraft.value.resources.push({
        id: `${type}-${Date.now()}`,
        type,
        title: type === "video" ? "動画" : "資料",
        url: normalized,
        occurrenceId,
      });
    };

    const materialUrl = computed({ get: () => resourceUrl("material"), set: (value: string) => setResourceUrl("material", value) });
    const videoUrl = computed({ get: () => resourceUrl("video"), set: (value: string) => setResourceUrl("video", value) });

    const occurrenceRelation = computed({
      get: () => editorDraft.value.occurrences.find((occurrence) => occurrence.relation !== "single")?.relation
        ?? editorDraft.value.occurrences[0]?.relation
        ?? "single",
      set: (relation: Occurrence["relation"]) => {
        editorDraft.value.occurrences.forEach((occurrence) => { occurrence.relation = relation; });
      },
    });

    const occurrenceResourceUrl = (occurrenceId: string, type: "material" | "video") => resourceUrl(type, occurrenceId);
    const setOccurrenceResourceUrl = (occurrenceId: string, type: "material" | "video", value: string) => {
      setResourceUrl(type, value, occurrenceId);
    };

    const occurrenceTitle = (occurrenceId?: string) => {
      if (!occurrenceId) return "講習会共通";
      return editorDraft.value.occurrences.find((occurrence) => occurrence.id === occurrenceId)?.title
        ?? selectedWorkshop.value?.occurrences.find((occurrence) => occurrence.id === occurrenceId)?.title
        ?? "開催ごとの資料";
    };

    const occurrenceModes = (workshop: Workshop) => {
      const labels = Array.from(new Set(workshop.occurrences
        .map((occurrence) => modeLabel(occurrence.mode))
        .filter((label) => label !== "未定")));
      return labels.join("・") || "未登録";
    };

    const formatOccurrenceForNotice = (occurrence: Occurrence) => {
      const when = [formatDate(occurrence.date), occurrence.time].filter((value) => value && value !== "未登録").join(" ");
      const where = occurrence.place || (occurrence.mode === "undecided" ? "" : modeLabel(occurrence.mode));
      return `・${occurrence.title}${when ? `：${when}` : "：日時未定"}${where ? ` / ${where}` : ""}`;
    };

    const generatedTraq = computed(() => {
      const draft = editorDraft.value;
      const lines = [
        `## ${draft.title || "講習会名未定"}`,
        draft.summary || "概要は準備中です。",
        "",
        `対象：${draft.audience || "未定"}`,
        "",
        "### 開催",
        ...draft.occurrences.map(formatOccurrenceForNotice),
      ];
      if (draft.preparation) lines.push("", `事前準備：${draft.preparation}`);
      const knoqOccurrences = draft.occurrences.filter((occurrence) => occurrence.knoqUrl);
      for (const occurrence of knoqOccurrences) {
        const label = draft.occurrences.length > 1 ? `knoQ（${occurrence.title}）` : "knoQ";
        lines.push(`${label}：${occurrence.knoqUrl}`);
      }
      if (draft.contact) lines.push(`質問・連絡先：${draft.contact}`);
      return lines.join("\n");
    });

    const generatedKnoq = computed(() => {
      const draft = editorDraft.value;
      return [
        draft.summary,
        draft.audience ? `対象：${draft.audience}` : "",
        draft.preparation ? `事前準備：${draft.preparation}` : "",
        draft.contact ? `質問・連絡先：${draft.contact}` : "",
      ].filter(Boolean).join("\n\n") || "入力した情報から説明文を生成します。";
    });

    const activeNotice = computed(() => noticeKind.value === "traq" ? generatedTraq.value : generatedKnoq.value);

    function formatDate(value: string) {
      if (!value) return "未登録";
      const date = new Date(`${value}T00:00:00`);
      if (Number.isNaN(date.getTime())) return value;
      return new Intl.DateTimeFormat("ja-JP", { year: "numeric", month: "long", day: "numeric", weekday: "short" }).format(date);
    }

    function modeLabel(mode: Occurrence["mode"]) {
      if (mode === "offline") return "対面";
      if (mode === "online") return "オンライン";
      if (mode === "hybrid") return "対面・オンライン";
      return "未定";
    }

    function relationLabel(occurrences: Occurrence[]) {
      if (occurrences.length <= 1) return "1回完結";
      const relations = new Set(occurrences.map((occurrence) => occurrence.relation));
      if (relations.size === 1 && relations.has("alternative")) return "同じ内容です。いずれか1回を選びます";
      if (relations.size === 1 && relations.has("rebroadcast")) return "本編と再放送です。いずれか1回を選びます";
      if (!relations.has("sequence") && (relations.has("alternative") || relations.has("rebroadcast"))) return "同じ内容の別日程・再放送です。いずれかを選びます";
      if (relations.has("sequence") && relations.has("alternative") && relations.has("rebroadcast")) return "複数回の内容があります。再放送・1日完結の日程も選べます";
      if (relations.has("sequence") && relations.has("rebroadcast")) return "複数回の内容があります。再放送も選べます";
      return "内容が異なります。上から順に受講します";
    }

    function occurrenceStatusLabel(status: Occurrence["status"]) {
      if (status === "held") return "開催済み";
      if (status === "cancelled") return "中止";
      if (status === "postponed") return "延期";
      return "開催予定";
    }

    function showToast(message: string) {
      toast.value = message;
      if (toastTimer) clearTimeout(toastTimer);
      toastTimer = setTimeout(() => { toast.value = ""; }, 2600);
    }

    function navigate(path: string) {
      if (location.hash === `#${path}`) {
        route.value = parseRoute(location.hash);
        return;
      }
      location.hash = path;
    }

    function searchByTeam(team: string) {
      query.value = "";
      activeTeam.value = team;
      activeFilter.value = "all";
      showAllYears.value = false;
      navigate("/search");
    }

    function showAllWorkshops() {
      query.value = "";
      activeTeam.value = "all";
      activeFilter.value = "all";
      showAllYears.value = false;
      navigate("/search");
    }

    function refreshRandomWorkshops() {
      const pool = [...latestPublicWorkshops.value];
      for (let index = pool.length - 1; index > 0; index -= 1) {
        const swapIndex = Math.floor(Math.random() * (index + 1));
        [pool[index], pool[swapIndex]] = [pool[swapIndex], pool[index]];
      }
      const count = Math.min(3, pool.length);
      const next = pool.slice(0, count);
      const previousIds = new Set(randomWorkshopIds.value);
      if (pool.length > count && next.length && next.every((workshop) => previousIds.has(workshop.id))) {
        const replacement = pool.find((workshop) => !previousIds.has(workshop.id));
        if (replacement) next[next.length - 1] = replacement;
      }
      randomWorkshopIds.value = next.map((workshop) => workshop.id);
    }

    function scrollToSection(id: string) {
      document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
    }

    async function setEditorStep(index: number) {
      editorStep.value = index;
      await nextTick();
      document.querySelector<HTMLElement>(".editor-form")?.scrollIntoView({ behavior: "smooth", block: "start" });
    }

    async function scrollToEditorSection(id: string) {
      activeBasicInfoSection.value = id;
      await nextTick();
      document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
    }

    function setTargetTeam(team: string, selected: boolean) {
      const index = editorDraft.value.targetTeams.indexOf(team);
      if (selected && index < 0) editorDraft.value.targetTeams.push(team);
      if (!selected && index >= 0) editorDraft.value.targetTeams.splice(index, 1);
    }

    function addOperator(candidate: TraqDirectoryCandidate) {
      if (editorDraft.value.operators.some((operator) => operator.id === candidate.id)) return;
      editorDraft.value.operators.push({ kind: candidate.kind, id: candidate.id, name: candidate.name });
      operatorQuery.value = "";
    }

    function removeOperator(id: string) {
      editorDraft.value.operators = editorDraft.value.operators.filter((operator) => operator.id !== id);
    }

    function operatorDirectoryEntry(operator: WorkshopOperator) {
      return TRAQ_DIRECTORY.find((candidate) => candidate.id === operator.id);
    }

    function operatorLabel(operator: WorkshopOperator) {
      return operatorDirectoryEntry(operator)?.label ?? (operator.kind === "user" ? `@${operator.name}` : operator.name);
    }

    function operatorDetail(operator: WorkshopOperator) {
      return operatorDirectoryEntry(operator)?.detail ?? (operator.kind === "user" ? "traQユーザー" : "traQグループ");
    }

    function operatorAvatar(candidate: TraqDirectoryCandidate) {
      return candidate.kind === "user" ? `https://q.trap.jp/api/v3/public/icon/${encodeURIComponent(candidate.name)}` : "";
    }

    function setRelationQuery(kind: RelationKind, value: string) {
      relationQuery.value[kind] = value;
    }

    function relationRefs(kind: RelationKind): WorkshopRelationRef[] {
      if (kind === "previous") return editorDraft.value.previousTextRefs;
      return kind === "prerequisite" ? editorDraft.value.prerequisiteRefs : editorDraft.value.recommendedRefs;
    }

    function relationCandidates(kind: RelationKind) {
      const needle = relationQuery.value[kind].trim().toLowerCase();
      if (!needle) return [];
      return workshops.value
        .filter((workshop) => workshop.status === "public" && workshop.id !== editorDraft.value.id)
        .filter((workshop) => workshopMatches(workshop, needle, "all", "all"))
        .filter((workshop) => kind !== "previous" || workshop.year < editorDraft.value.year)
        .sort((left, right) => right.year - left.year || left.title.localeCompare(right.title, "ja"))
        .slice(0, 6);
    }

    function addRelationWorkshop(kind: RelationKind, workshop: Workshop) {
      if (kind === "previous") {
        if (!editorDraft.value.previousIds.includes(workshop.id)) editorDraft.value.previousIds.push(workshop.id);
      } else {
        const references = relationRefs(kind);
        if (!references.some((reference) => reference.kind === "workshop" && reference.workshopId === workshop.id)) {
          references.push({ kind: "workshop", workshopId: workshop.id });
        }
      }
      relationQuery.value[kind] = "";
    }

    function addRelationText(kind: RelationKind) {
      const text = relationQuery.value[kind].trim();
      if (!text) return;
      const references = relationRefs(kind);
      if (!references.some((reference) => reference.kind === "text" && reference.text === text)) {
        references.push({ kind: "text", text });
      }
      relationQuery.value[kind] = "";
    }

    function relationEntries(kind: RelationKind): RelationEntryView[] {
      const linked = kind === "previous"
        ? editorDraft.value.previousIds
          .map((id) => workshops.value.find((workshop) => workshop.id === id))
          .filter((workshop): workshop is Workshop => Boolean(workshop))
          .map((workshop) => ({
            key: `workshop:${workshop.id}`,
            kind: "workshop" as const,
            workshopId: workshop.id,
            label: workshop.title,
            meta: `${workshop.year}年度・${workshop.team || "運営元未登録"}`,
          }))
        : [];
      const references = relationRefs(kind).map((reference): RelationEntryView => {
        if (reference.kind === "text") {
          return {
            key: `text:${reference.text}`,
            kind: "text",
            text: reference.text,
            label: reference.text,
            meta: "自由テキスト",
          };
        }
        const workshop = workshops.value.find((candidate) => candidate.id === reference.workshopId);
        return {
          key: `workshop:${reference.workshopId}`,
          kind: "workshop",
          workshopId: reference.workshopId,
          label: workshop?.title ?? "削除された講習会",
          meta: workshop ? `${workshop.year}年度・${workshop.team || "運営元未登録"}` : "リンク切れ",
        };
      });
      return [...linked, ...references];
    }

    function removeRelationEntry(kind: RelationKind, entry: RelationEntryView) {
      if (kind === "previous" && entry.kind === "workshop" && entry.workshopId) {
        editorDraft.value.previousIds = editorDraft.value.previousIds.filter((id) => id !== entry.workshopId);
        return;
      }
      const references = relationRefs(kind);
      const index = references.findIndex((reference) => (
        entry.kind === "text"
          ? reference.kind === "text" && reference.text === entry.text
          : reference.kind === "workshop" && reference.workshopId === entry.workshopId
      ));
      if (index >= 0) references.splice(index, 1);
    }

    function searchRelationText(kind: RelationKind, text: string) {
      relationQuery.value[kind] = text;
    }

    async function updateRoute() {
      const previousRoute = route.value;
      const currentRoute = parseRoute(location.hash);
      if (hasUpdatedRoute && currentRoute.name === "detail") {
        if (previousRoute.name === "home") detailReturnPath.value = "/";
        if (previousRoute.name === "search") detailReturnPath.value = "/search";
      }
      route.value = currentRoute;
      hasUpdatedRoute = true;
      if (currentRoute.name === "edit") {
        const existing = workshops.value.find((workshop) => workshop.id === currentRoute.id);
        if (existing) editorDraft.value = cloneWorkshop(normalizeWorkshop(existing));
      }
      await nextTick();
      document.title = `${routeTitle(route.value, selectedWorkshop.value)} | LeQtures`;
      document.querySelector<HTMLElement>("main")?.focus({ preventScroll: true });
      window.scrollTo({ top: 0, behavior: "auto" });
    }

    function openWorkshop(id: string) {
      navigate(`/workshops/${encodeURIComponent(id)}`);
    }

    function returnFromDetail() {
      navigate(detailReturnPath.value);
    }

    function persistWorkshops() {
      if (!hydrated.value) return;
      localStorage.setItem(WORKSHOP_STORAGE_KEY, JSON.stringify(workshops.value));
    }

    function persistCompletions() {
      if (!hydrated.value) return;
      localStorage.setItem(COMPLETION_STORAGE_KEY, JSON.stringify(completedAt.value));
    }

    function upsertDraft(draft: Workshop) {
      const index = workshops.value.findIndex((workshop) => workshop.id === draft.id);
      const snapshot = cloneWorkshop(draft);
      if (index >= 0) workshops.value[index] = snapshot;
      else workshops.value.push(snapshot);
      persistWorkshops();
    }

    function startFromWorkshop(source: Workshop) {
      const draft = inheritWorkshop(source);
      editorDraft.value = draft;
      upsertDraft(draft);
      editorStep.value = 0;
      navigate(`/edit/${draft.id}`);
    }

    function startBlank() {
      const draft = makeBlankWorkshop();
      editorDraft.value = draft;
      upsertDraft(draft);
      editorStep.value = 0;
      navigate(`/edit/${draft.id}`);
    }

    function editWorkshop(workshop: Workshop) {
      editorDraft.value = cloneWorkshop(normalizeWorkshop(workshop));
      editorStep.value = 0;
      navigate(`/edit/${workshop.id}`);
    }

    async function focusRequiredName() {
      editorStep.value = 0;
      await nextTick();
      await scrollToEditorSection("basic-name");
      document.querySelector<HTMLInputElement>("#basic-name input")?.focus({ preventScroll: true });
      showToast("講習会名を入力してください");
    }

    function saveDraft() {
      const isPublic = editorDraft.value.status === "public";
      if (isPublic && !editorDraft.value.title.trim()) {
        void focusRequiredName();
        return;
      }
      editorDraft.value.revisions.push({ at: "たった今", by: "rurun", summary: isPublic ? "公開情報を更新" : "下書きを保存" });
      upsertDraft(editorDraft.value);
      showToast(isPublic ? "変更を保存しました" : "下書きを保存しました");
      if (isPublic) openWorkshop(editorDraft.value.id);
    }

    async function publishDraft() {
      if (!editorDraft.value.title.trim()) {
        await focusRequiredName();
        return;
      }
      const wasPublic = editorDraft.value.status === "public";
      editorDraft.value.status = "public";
      editorDraft.value.revisions.push({ at: "たった今", by: "rurun", summary: wasPublic ? "公開情報を更新" : "講習会を公開" });
      upsertDraft(editorDraft.value);
      showToast(wasPublic ? "変更を保存しました" : "講習会を公開しました");
      openWorkshop(editorDraft.value.id);
    }

    function addOccurrence() {
      const index = editorDraft.value.occurrences.length + 1;
      const relation = editorDraft.value.occurrences.length === 1 && occurrenceRelation.value === "single"
        ? "sequence"
        : occurrenceRelation.value;
      editorDraft.value.occurrences.forEach((occurrence) => { occurrence.relation = relation; });
      editorDraft.value.occurrences.push({
        id: `occurrence-${Date.now()}`,
        title: `第${index}回`,
        description: "",
        date: "",
        time: "",
        mode: "undecided",
        place: "",
        instructor: "",
        relation,
        status: "planned",
        knoqUrl: "",
      });
    }

    function removeOccurrence(index: number) {
      if (editorDraft.value.occurrences.length <= 1) return;
      const [removed] = editorDraft.value.occurrences.splice(index, 1);
      editorDraft.value.resources = editorDraft.value.resources.filter((resource) => resource.occurrenceId !== removed.id);
      if (editorDraft.value.occurrences.length === 1) editorDraft.value.occurrences[0].relation = "single";
    }

    function toggleCompletion(workshop: Workshop) {
      if (completedAt.value[workshop.id]) {
        const next = { ...completedAt.value };
        delete next[workshop.id];
        completedAt.value = next;
        showToast("受講完了を取り消しました");
      } else {
        completedAt.value = { ...completedAt.value, [workshop.id]: new Date().toISOString() };
        showToast("受講完了を記録し、バッジを獲得しました");
      }
      persistCompletions();
    }

    function completionDate(id: string) {
      const value = completedAt.value[id];
      if (!value) return "";
      return new Intl.DateTimeFormat("ja-JP", { year: "numeric", month: "long", day: "numeric" }).format(new Date(value));
    }

    function badgeLabel(workshop: Workshop) {
      const preferred = workshop.tags.find((tag) => !["0→1", "新入生向け", "実習", "基礎"].includes(tag));
      return (preferred || workshop.title.replace(/[0-9]{4}|年度|講習会/g, "").trim()).slice(0, 8);
    }

    async function copyText(value: string, message: string) {
      try {
        await navigator.clipboard.writeText(value);
        showToast(message);
      } catch {
        showToast("コピーできませんでした。文章を選択してコピーしてください");
      }
    }

    function shareBadge(workshop: Workshop) {
      navigate(`/share/${workshop.id}`);
    }

    function shareText(workshop: Workshop) {
      return `${workshop.title}を受講しました。 #traP講習会`;
    }

    function resetDemo() {
      if (!window.confirm("入力したデモ内容を消して、初期状態に戻しますか？")) return;
      workshops.value = cloneSeedWorkshops();
      completedAt.value = {};
      profileVisible.value = false;
      localStorage.removeItem(WORKSHOP_STORAGE_KEY);
      localStorage.removeItem(COMPLETION_STORAGE_KEY);
      localStorage.removeItem(VISIBILITY_STORAGE_KEY);
      refreshRandomWorkshops();
      showToast("デモを初期状態に戻しました");
      navigate("/");
    }

    onMounted(() => {
      const savedWorkshops = localStorage.getItem(WORKSHOP_STORAGE_KEY);
      const savedCompletions = localStorage.getItem(COMPLETION_STORAGE_KEY);
      const savedVisibility = localStorage.getItem(VISIBILITY_STORAGE_KEY);
      if (savedWorkshops) {
        try {
          const parsed = JSON.parse(savedWorkshops);
          workshops.value = Array.isArray(parsed) && parsed.every((item) => item && typeof item.id === "string" && Array.isArray(item.occurrences) && Array.isArray(item.resources))
            ? parsed.map((item) => normalizeWorkshop(item as Workshop))
            : cloneSeedWorkshops();
        } catch { workshops.value = cloneSeedWorkshops(); }
      }
      if (savedCompletions) {
        try { completedAt.value = JSON.parse(savedCompletions); } catch { completedAt.value = {}; }
      }
      profileVisible.value = savedVisibility === "true";
      refreshRandomWorkshops();
      hydrated.value = true;
      window.addEventListener("hashchange", updateRoute);
      void updateRoute();
    });

    onBeforeUnmount(() => {
      window.removeEventListener("hashchange", updateRoute);
      if (toastTimer) clearTimeout(toastTimer);
    });

    watch(editorDraft, (draft) => {
      if (!hydrated.value || route.value.name !== "edit" || draft.status !== "draft") return;
      upsertDraft(draft);
    }, { deep: true });

    watch(profileVisible, (value) => {
      if (!hydrated.value) return;
      localStorage.setItem(VISIBILITY_STORAGE_KEY, String(value));
    });

    return {
      activeBasicInfoSection,
      activeFilter,
      activeNotice,
      activeTeam,
      availability,
      badgeLabel,
      basicInfoSections,
      completedAt,
      completedWorkshops,
      collaboratorText,
      completionDate,
      copyText,
      creationQuery,
      creationResults,
      drafts,
      editorDraft,
      editorProgress,
      editorSections,
      editorStep,
      editWorkshop,
      formatDate,
      HomeIcon,
      generatedKnoq,
      generatedTraq,
      hasResource,
      materialUrl,
      modeLabel,
      navigate,
      nextWorkshops,
      noticeKind,
      occurrenceModes,
      occurrenceRelation,
      PlusIcon,
      occurrenceResourceUrl,
      occurrenceTitle,
      occurrenceStatusLabel,
      openWorkshop,
      operatorAvatar,
      operatorDetail,
      operatorLabel,
      operatorQuery,
      operatorSuggestions,
      organizerSources: ORGANIZER_SOURCES,
      previousWorkshops,
      profileVisible,
      publishDraft,
      query,
      randomWorkshops,
      recentWorkshops,
      refreshRandomWorkshops,
      relationCandidates,
      relationEntries,
      relationLabel,
      relationQuery,
      relationSections: RELATION_SECTIONS,
      removeOperator,
      removeRelationEntry,
      removeOccurrence,
      resetDemo,
      returnFromDetail,
      route,
      saveDraft,
      searchResults,
      searchByTeam,
      SearchIcon,
      selectedWorkshop,
      scrollToSection,
      scrollToEditorSection,
      searchRelationText,
      setEditorStep,
      setRelationQuery,
      shareBadge,
      shareText,
      setOccurrenceResourceUrl,
      showAllYears,
      showAllWorkshops,
      sourceWorkshop,
      startBlank,
      startFromWorkshop,
      DraftIcon,
      tagText,
      setTargetTeam,
      trapTeams: TRAP_TEAMS,
      teams,
      teamSummaries,
      traqUserIconUrl: TRAQ_USER_ICON_URL,
      toast,
      toggleCompletion,
      typeLabel,
      videoUrl,
      workshopLatestDate,
      zeroToOneValue,
      addOccurrence,
      addOperator,
      addRelationText,
      addRelationWorkshop,
      workshops,
    };
  },
  template: `
    <BasiqThemeProvider mode="light" class="theme-root">
      <a class="skip-link" href="#main-content">本文へ移動</a>
      <div class="app-shell">
        <aside class="sidebar">
          <a class="brand" href="#/" aria-label="LeQtures ホーム">
            <svg class="brand-mark" viewBox="0 0 24 24" aria-hidden="true">
              <rect x="1" y="1" width="22" height="22" rx="5" fill="currentColor" />
              <circle cx="11.5" cy="11" r="5" fill="none" stroke="white" stroke-width="2.5" />
              <path d="M15 14.5 19 18.5" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round" />
            </svg>
            <span><strong>LeQtures</strong><small>traP 講習会</small></span>
          </a>
          <nav aria-label="メインナビゲーション">
            <p>受講する</p>
            <a class="nav-item" :class="{ active: route.name === 'home' }" :aria-current="route.name === 'home' ? 'page' : undefined" href="#/"><BasiqIcon class="nav-icon" :icon="HomeIcon" />ホーム</a>
            <a class="nav-item" :class="{ active: route.name === 'search' || route.name === 'detail' }" :aria-current="route.name === 'search' || route.name === 'detail' ? 'page' : undefined" href="#/search"><BasiqIcon class="nav-icon" :icon="SearchIcon" />講習会を探す</a>
            <p>運営する</p>
            <a class="nav-item" :class="{ active: route.name === 'drafts' }" :aria-current="route.name === 'drafts' ? 'page' : undefined" href="#/drafts"><BasiqIcon class="nav-icon" :icon="DraftIcon" />自分の下書き <em v-if="drafts.length">{{ drafts.length }}</em></a>
          </nav>
          <div class="sidebar-footer">
            <div class="sidebar-note"><strong>デモ版</strong><span>操作内容はこの端末だけに保存されます。</span></div>
            <button class="reset-button" type="button" @click="resetDemo">初期状態に戻す</button>
            <BasiqButton class="sidebar-create" type="button" :icon="PlusIcon" icon-placement="leading" @click="navigate('/new')">講習会を作る</BasiqButton>
            <a class="account-row" :class="{ active: route.name === 'me' || route.name === 'share' }" :aria-current="route.name === 'me' || route.name === 'share' ? 'page' : undefined" href="#/me">
              <BasiqAvatar class="account-avatar" :src="traqUserIconUrl" name="rurun" alt="" size="sm" />
              <span><strong>rurun</strong><small>マイページ</small></span>
              <span aria-hidden="true">›</span>
            </a>
          </div>
        </aside>

        <div class="workspace">
          <header class="mobile-header">
            <a class="mobile-brand" href="#/" aria-label="LeQtures ホーム"><svg class="brand-mark" viewBox="0 0 24 24" aria-hidden="true"><rect x="1" y="1" width="22" height="22" rx="5" fill="currentColor" /><circle cx="11.5" cy="11" r="5" fill="none" stroke="white" stroke-width="2.5" /><path d="M15 14.5 19 18.5" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round" /></svg><strong>LeQtures</strong></a>
          </header>
          <nav class="mobile-nav" aria-label="モバイルナビゲーション">
            <a :class="{ active: route.name === 'home' }" :aria-current="route.name === 'home' ? 'page' : undefined" href="#/"><BasiqIcon class="mobile-nav-icon" :icon="HomeIcon" /><small>ホーム</small></a>
            <a :class="{ active: route.name === 'search' || route.name === 'detail' }" :aria-current="route.name === 'search' || route.name === 'detail' ? 'page' : undefined" href="#/search"><BasiqIcon class="mobile-nav-icon" :icon="SearchIcon" /><small>探す</small></a>
            <a :class="{ active: route.name === 'create' || route.name === 'edit' }" :aria-current="route.name === 'create' || route.name === 'edit' ? 'page' : undefined" href="#/new"><BasiqIcon class="mobile-nav-icon" :icon="PlusIcon" /><small>作る</small></a>
            <a :class="{ active: route.name === 'drafts' }" :aria-current="route.name === 'drafts' ? 'page' : undefined" href="#/drafts"><BasiqIcon class="mobile-nav-icon" :icon="DraftIcon" /><small>下書き</small></a>
            <a :class="{ active: route.name === 'me' || route.name === 'share' }" :aria-current="route.name === 'me' || route.name === 'share' ? 'page' : undefined" href="#/me"><BasiqAvatar class="mobile-avatar" :src="traqUserIconUrl" name="rurun" alt="" :size="22" /><small>rurun</small></a>
          </nav>

          <main id="main-content" tabindex="-1">
            <template v-if="route.name === 'home'">
              <header class="page-header home-header home-welcome">
                <div><h1>ホーム</h1><p>気になる分野や最近の開催から、受けたい講習会を見つけられます。</p></div>
                <BasiqButton type="button" tone="neutral" variant="outline" @click="showAllWorkshops">講習会を探す</BasiqButton>
              </header>
              <div class="home-content">
                <section class="home-section" aria-labelledby="teams-title">
                  <div class="home-section-heading"><div><h2 id="teams-title">班から探す</h2><p>興味のある班・分野に絞って一覧を開きます。</p></div><button type="button" @click="showAllWorkshops">すべて見る →</button></div>
                  <div class="team-grid">
                    <button v-for="team in teamSummaries" :key="team.name" type="button" class="team-card" @click="searchByTeam(team.name)"><strong>{{ team.name }}</strong><span>{{ team.count }}件の講習会</span><span aria-hidden="true">→</span></button>
                  </div>
                </section>

                <div class="home-feed-grid">
                  <section class="home-section" aria-labelledby="recent-title">
                    <div class="home-section-heading"><div><h2 id="recent-title">直近の講習会</h2><p>開催日の新しいものから表示しています。</p></div></div>
                    <div class="home-workshop-list">
                      <BasiqCard v-for="workshop in recentWorkshops" :key="workshop.id" class="home-workshop-card">
                        <a class="home-workshop-link" :href="'#/workshops/' + workshop.id" :aria-label="workshop.title + 'の詳細を見る'">
                          <article><div class="card-meta"><span>{{ workshop.year }}年度</span><span v-if="workshop.team">{{ workshop.team }}</span></div><h3>{{ workshop.title }}</h3><p>{{ workshop.summary }}</p><footer><span>{{ formatDate(workshopLatestDate(workshop)) }}</span><strong>{{ availability(workshop) }}</strong></footer></article>
                        </a>
                      </BasiqCard>
                    </div>
                  </section>

                  <section class="home-section" aria-labelledby="random-title">
                    <div class="home-section-heading"><div><h2 id="random-title">ランダムに表示</h2><p>登録済みの講習会から3件を表示します。</p></div><button type="button" @click="refreshRandomWorkshops">入れ替える</button></div>
                    <div class="home-workshop-list">
                      <BasiqCard v-for="workshop in randomWorkshops" :key="workshop.id" class="home-workshop-card">
                        <a class="home-workshop-link" :href="'#/workshops/' + workshop.id" :aria-label="workshop.title + 'の詳細を見る'">
                          <article><div class="card-meta"><span>{{ workshop.year }}年度</span><span v-if="workshop.team">{{ workshop.team }}</span></div><h3>{{ workshop.title }}</h3><p>{{ workshop.summary }}</p><footer><span>{{ relationLabel(workshop.occurrences) }}</span><strong>{{ availability(workshop) }}</strong></footer></article>
                        </a>
                      </BasiqCard>
                    </div>
                  </section>
                </div>
              </div>
            </template>

            <template v-else-if="route.name === 'search'">
              <header class="page-header home-header">
                <div><h1>講習会を探す</h1><p>これから参加する講習会も、過去の資料から受講する講習会も同じ場所で探せます。</p></div>
              </header>
              <div class="home-browser">
                <aside class="search-area" aria-labelledby="search-filter-title">
                  <h2 id="search-filter-title">絞り込み</h2>
                  <BasiqFormField label="キーワード" control-id="workshop-search">
                    <BasiqInput id="workshop-search" v-model="query" size="lg" type="search" placeholder="名前、分野、対象者" />
                  </BasiqFormField>
                  <div class="search-options">
                    <label>班・分野<select v-model="activeTeam"><option value="all">すべて</option><option v-for="team in teams" :key="team" :value="team">{{ team }}</option></select></label>
                    <label class="year-toggle"><input v-model="showAllYears" type="checkbox">過去年度もすべて表示</label>
                  </div>
                  <div class="quick-filters">
                    <strong>教材の状態</strong>
                    <div class="quick-filter-buttons" aria-label="教材の状態で絞り込む">
                      <button :class="{ active: activeFilter === 'all' }" :aria-pressed="activeFilter === 'all'" type="button" @click="activeFilter = 'all'">すべて</button>
                      <button :class="{ active: activeFilter === 'learnable' }" :aria-pressed="activeFilter === 'learnable'" type="button" @click="activeFilter = 'learnable'">今から受講できる</button>
                      <button :class="{ active: activeFilter === 'material' }" :aria-pressed="activeFilter === 'material'" type="button" @click="activeFilter = 'material'">資料あり</button>
                      <button :class="{ active: activeFilter === 'video' }" :aria-pressed="activeFilter === 'video'" type="button" @click="activeFilter = 'video'">動画あり</button>
                      <button :class="{ active: activeFilter === 'record' }" :aria-pressed="activeFilter === 'record'" type="button" @click="activeFilter = 'record'">記録のみ</button>
                    </div>
                  </div>
                </aside>
                <section class="catalog" aria-labelledby="catalog-title">
                  <div class="section-heading"><div><h2 id="catalog-title">検索結果</h2><p v-if="!showAllYears">対応する過去年度がある場合は、条件に合う最新のものを表示しています。</p></div><span aria-live="polite">{{ searchResults.length }}件</span></div>
                  <div v-if="searchResults.length" class="workshop-list-head" aria-hidden="true"><span>講習会</span><span>年度・班</span><span>開催・形式</span><span>教材</span><span></span></div>
                  <div v-if="searchResults.length" class="workshop-grid">
                    <BasiqCard v-for="workshop in searchResults" :key="workshop.id" class="workshop-card">
                      <a class="workshop-card-link" :href="'#/workshops/' + workshop.id" :aria-label="workshop.title + 'の詳細を見る'">
                        <article>
                          <div class="card-meta"><span>{{ workshop.year }}年度</span><span v-if="workshop.team">{{ workshop.team }}</span></div>
                          <div class="card-copy"><h3>{{ workshop.title }}</h3><p>{{ workshop.summary || '概要はまだ登録されていません。' }}</p></div>
                          <dl><div><dt>対象</dt><dd>{{ workshop.audience || '未登録' }}</dd></div><div><dt>開催</dt><dd>{{ relationLabel(workshop.occurrences) }}</dd></div><div><dt>形式</dt><dd>{{ occurrenceModes(workshop) }}</dd></div></dl>
                          <div class="resource-tags">
                            <BasiqTag v-if="hasResource(workshop, 'material') || hasResource(workshop, 'practice')" label="資料あり" />
                            <BasiqTag v-if="hasResource(workshop, 'video')" label="動画あり" />
                            <BasiqTag v-if="!hasResource(workshop, 'material') && !hasResource(workshop, 'practice') && !hasResource(workshop, 'video')" label="記録のみ" />
                          </div>
                          <footer><strong>{{ availability(workshop) }}</strong><span class="card-detail"><span>詳細を見る</span><span aria-hidden="true"> →</span></span></footer>
                        </article>
                      </a>
                    </BasiqCard>
                  </div>
                  <div v-else class="empty-state"><strong>該当する講習会がありません</strong><p>キーワードや絞り込みを変えてください。</p><BasiqButton type="button" tone="neutral" variant="outline" @click="query = ''; activeTeam = 'all'; activeFilter = 'all'; showAllYears = false">条件をクリア</BasiqButton></div>
                </section>
              </div>
            </template>

            <template v-else-if="route.name === 'detail' && selectedWorkshop">
              <header class="page-header detail-heading">
                <div>
                  <button class="back-button" type="button" @click="returnFromDetail">← 戻る</button>
                  <div class="heading-tags"><BasiqTag :label="selectedWorkshop.year + '年度'" /><BasiqTag :label="selectedWorkshop.status === 'draft' ? '下書き' : '公開中'" /></div>
                  <h1>{{ selectedWorkshop.title || '名称未定の講習会' }}</h1>
                  <p>{{ selectedWorkshop.summary || '概要はまだ登録されていません。' }}</p>
                </div>
                <div class="header-actions">
                  <BasiqButton type="button" tone="neutral" variant="outline" @click="startFromWorkshop(selectedWorkshop)">この講習会を引き継ぐ</BasiqButton>
                  <BasiqButton type="button" tone="neutral" variant="outline" @click="editWorkshop(selectedWorkshop)">編集する</BasiqButton>
                </div>
              </header>
              <div v-if="selectedWorkshop.status === 'draft'" class="draft-notice"><strong>下書き</strong><span>作成者と共同編集者だけが閲覧できます。情報が揃っていなくても公開できます。</span></div>
              <div class="detail-layout">
                <article class="detail-content">
                  <section id="overview" class="detail-section"><h2>基本情報</h2><dl class="facts"><div><dt>年度</dt><dd>{{ selectedWorkshop.year }}年度</dd></div><div><dt>分野・班</dt><dd>{{ selectedWorkshop.team || '未登録' }}</dd></div><div><dt>タグ</dt><dd>{{ selectedWorkshop.tags.join('、') || '未登録' }}</dd></div></dl></section>
                  <section id="audience" class="detail-section"><h2>学べること・対象者</h2><dl class="stacked-facts"><div><dt>学べること</dt><dd>{{ selectedWorkshop.outcome || '未登録' }}</dd></div><div><dt>対象者</dt><dd>{{ selectedWorkshop.audience || '未登録' }}</dd></div><div><dt>前提知識</dt><dd>{{ selectedWorkshop.prerequisites || '未登録' }}</dd></div></dl></section>
                  <section id="occurrences" class="detail-section">
                    <div class="section-title-row"><h2>開催</h2><span>{{ selectedWorkshop.occurrences.length }}件</span></div>
                    <p v-if="selectedWorkshop.occurrences.length" class="section-note">{{ relationLabel(selectedWorkshop.occurrences) }}</p>
                    <div v-if="selectedWorkshop.occurrences.length" class="occurrence-list">
                      <article v-for="(occurrence, index) in selectedWorkshop.occurrences" :key="occurrence.id" class="occurrence-card">
                        <header><span>{{ index + 1 }}</span><div><h3>{{ occurrence.title }}</h3><p>{{ occurrence.description || '内容は未登録です。' }}</p></div><BasiqTag :label="occurrenceStatusLabel(occurrence.status)" /></header>
                        <dl><div><dt>日時</dt><dd>{{ formatDate(occurrence.date) }}<span v-if="occurrence.time"> {{ occurrence.time }}</span></dd></div><div><dt>形式・場所</dt><dd>{{ modeLabel(occurrence.mode) }}<span v-if="occurrence.place">・{{ occurrence.place }}</span></dd></div><div><dt>講師</dt><dd>{{ occurrence.instructor || '未登録' }}</dd></div><div><dt>knoQ</dt><dd><a v-if="occurrence.knoqUrl" :href="occurrence.knoqUrl" target="_blank" rel="noreferrer">参加ページを開く</a><span v-else>未登録</span></dd></div></dl>
                      </article>
                    </div>
                    <p v-else class="empty-inline">開催情報はまだ登録されていません。</p>
                  </section>
                  <section id="how-to" class="detail-section"><h2>参加・受講方法</h2><dl class="stacked-facts"><div><dt>事前準備</dt><dd>{{ selectedWorkshop.preparation || '未登録' }}</dd></div><div><dt>後から受講する場合</dt><dd>{{ selectedWorkshop.howToLearn || '未登録' }}</dd></div><div><dt>質問・連絡先</dt><dd>{{ selectedWorkshop.contact || '未登録' }}</dd></div></dl></section>
                  <section id="resources" class="detail-section">
                    <div class="section-title-row"><h2>資料・動画・関連情報</h2><span>{{ selectedWorkshop.resources.length }}件</span></div>
                    <div v-if="selectedWorkshop.resources.length" class="resource-list">
                      <article v-for="resource in selectedWorkshop.resources" :key="resource.id"><span class="resource-type">{{ typeLabel[resource.type] }}</span><div><h3>{{ resource.title }}</h3><small v-if="resource.occurrenceId">{{ occurrenceTitle(resource.occurrenceId) }}</small><p v-if="resource.note">{{ resource.note }}</p></div><a v-if="resource.url" :href="resource.url" target="_blank" rel="noreferrer">開く ↗</a><span v-else class="unavailable">URL未登録</span></article>
                    </div>
                    <p v-else class="empty-inline">資料・動画はまだ登録されていません。この講習会は記録として検索できます。</p>
                  </section>
                  <section id="lineage" class="detail-section">
                    <h2>引き継ぎのつながり</h2>
                    <p class="section-note">各年度は別の講習会です。矢印をたどって前後の講習会を開けます。</p>
                    <div class="lineage-map" v-if="previousWorkshops.length || nextWorkshops.length">
                      <div class="lineage-side"><small>引き継ぎ元</small><button v-for="workshop in previousWorkshops" :key="workshop.id" type="button" @click="openWorkshop(workshop.id)"><span>{{ workshop.year }}年度</span><strong>{{ workshop.title }}</strong></button><span v-if="!previousWorkshops.length">なし</span></div>
                      <span class="lineage-arrow" aria-hidden="true">→</span>
                      <div class="lineage-current"><small>現在</small><strong>{{ selectedWorkshop.title }}</strong></div>
                      <span class="lineage-arrow" aria-hidden="true">→</span>
                      <div class="lineage-side"><small>この講習会を引き継いだもの</small><button v-for="workshop in nextWorkshops" :key="workshop.id" type="button" @click="openWorkshop(workshop.id)"><span>{{ workshop.year }}年度</span><strong>{{ workshop.title }}</strong></button><span v-if="!nextWorkshops.length">まだありません</span></div>
                    </div>
                    <div v-else class="empty-inline">引き継ぎ関係はまだ登録されていません。</div>
                  </section>
                  <section id="management" class="detail-section"><h2>運営・更新情報</h2><dl class="stacked-facts"><div><dt>作成・編集</dt><dd>{{ selectedWorkshop.creators.join('、') || '移行元では未確認' }}</dd></div><div><dt>情報源</dt><dd><a v-if="selectedWorkshop.sourceUrl" :href="selectedWorkshop.sourceUrl" target="_blank" rel="noreferrer">{{ selectedWorkshop.sourceLabel || '元のページを開く' }} ↗</a><span v-else>このサービスで新規作成</span></dd></div></dl><details v-if="selectedWorkshop.revisions.length" class="history"><summary>編集履歴（{{ selectedWorkshop.revisions.length }}件）</summary><ol><li v-for="revision in selectedWorkshop.revisions" :key="revision.at + revision.summary"><span>{{ revision.at }}</span><strong>{{ revision.summary }}</strong><small>{{ revision.by }}</small></li></ol></details><p v-else class="empty-inline">このサービス上での編集履歴はまだありません。</p></section>
                  <section class="completion-panel"><div><h2>受講記録</h2><p>資料や動画を確認し終えたら、講習会全体を受講完了として記録します。</p></div><BasiqButton v-if="!completedAt[selectedWorkshop.id]" type="button" @click="toggleCompletion(selectedWorkshop)">この講習会を受講完了</BasiqButton><div v-else class="completed-action"><strong>✓ {{ completionDate(selectedWorkshop.id) }}に完了</strong><button type="button" @click="toggleCompletion(selectedWorkshop)">取り消す</button></div></section>
                </article>
                <aside class="detail-index"><strong>このページの項目</strong><button type="button" @click="scrollToSection('overview')">基本情報</button><button type="button" @click="scrollToSection('audience')">学べること・対象者</button><button type="button" @click="scrollToSection('occurrences')">開催</button><button type="button" @click="scrollToSection('how-to')">参加・受講方法</button><button type="button" @click="scrollToSection('resources')">資料・動画</button><button type="button" @click="scrollToSection('lineage')">引き継ぎ</button><button type="button" @click="scrollToSection('management')">運営・更新情報</button><span>{{ availability(selectedWorkshop) }}</span></aside>
              </div>
            </template>

            <template v-else-if="route.name === 'create'">
              <header class="page-header"><div><h1>講習会を作る</h1><p>過去の講習会を引き継ぐと、共通する情報や資料を参考にしながら準備できます。</p></div><BasiqButton type="button" tone="neutral" variant="outline" @click="startBlank">白紙から作る</BasiqButton></header>
              <section class="create-search"><BasiqFormField label="引き継ぐ講習会を探す" control-id="creation-search"><BasiqInput id="creation-search" v-model="creationQuery" type="search" size="lg" placeholder="講習会名、分野" /></BasiqFormField></section>
              <section class="create-list"><h2>過去の講習会から作る</h2><p>概要、対象者、前提知識、開催構成を引き継ぎます。日時・場所・knoQ・受講方法・資料URLは空になります。</p><div class="inherit-list"><article v-for="workshop in creationResults" :key="workshop.id"><div class="card-meta"><span>{{ workshop.year }}年度</span><span>{{ workshop.team }}</span></div><div><h3>{{ workshop.title }}</h3><p>{{ workshop.summary }}</p></div><div class="inherit-resources"><span>{{ availability(workshop) }}</span><small>対応する過去版 {{ workshops.filter(w => w.lineageId === workshop.lineageId).length }}件</small></div><BasiqButton type="button" tone="neutral" variant="outline" @click="startFromWorkshop(workshop)">引き継いで作る</BasiqButton></article></div></section>
            </template>

            <template v-else-if="route.name === 'edit'">
              <header class="editor-header"><div><button class="back-button" type="button" @click="navigate(editorDraft.status === 'public' ? '/workshops/' + editorDraft.id : '/drafts')">← {{ editorDraft.status === 'public' ? '講習会へ' : '下書きへ' }}</button><div class="heading-tags"><BasiqTag :label="editorDraft.status === 'draft' ? '下書き' : '公開中'" /></div><h1>{{ editorDraft.title || '名称未定の講習会' }}</h1></div><div class="header-actions"><BasiqButton type="button" tone="neutral" variant="outline" @click="saveDraft">{{ editorDraft.status === 'public' ? '変更を保存' : '下書きを保存' }}</BasiqButton><BasiqButton v-if="editorDraft.status === 'draft'" type="button" @click="publishDraft">今の内容で公開</BasiqButton></div></header>
              <div class="editor-step-tabs-wrap">
                <BasiqTabsRoot class="editor-step-tabs" :model-value="String(editorStep)" orientation="horizontal" @update:model-value="setEditorStep(Number($event))">
                  <BasiqTabsList aria-label="Step" width="100%">
                    <BasiqTabsTrigger v-for="(section, index) in editorSections" :key="index" :value="String(index)">
                      <span>Step {{ index + 1 }}</span>
                      <strong v-if="section.label">{{ section.label }}</strong>
                    </BasiqTabsTrigger>
                  </BasiqTabsList>
                </BasiqTabsRoot>
              </div>
              <div class="editor-layout">
                <aside class="editor-navigation">
                  <nav class="editor-toc" aria-label="目次">
                    <p>目次</p>
                    <template v-if="editorStep === 0">
                      <button v-for="(section, index) in basicInfoSections" :key="section.id" type="button" :class="{ active: activeBasicInfoSection === section.id }" @click="scrollToEditorSection(section.id)">
                        <span>{{ index + 1 }}</span>
                        <strong>{{ section.label }}</strong>
                        <em v-if="section.done" aria-label="入力済み">✓</em>
                      </button>
                    </template>
                  </nav>
                </aside>
                <section class="editor-form">
                  <template v-if="editorStep === 0">
                    <section id="basic-name" class="editor-subsection">
                      <div class="subsection-heading"><h3>① 講習会の名称を決めよう</h3></div>
                      <BasiqFormField class="full" label="講習会名" required>
                        <BasiqInput id="workshop-title" v-model="editorDraft.title" />
                      </BasiqFormField>
                    </section>

                    <section id="basic-overview" class="editor-subsection">
                      <div class="subsection-heading"><h3>② 講習会の概要を決めよう</h3></div>
                      <div class="form-grid">
                        <BasiqFormField label="年度" description="年ではなく年度" control-id="workshop-year"><input id="workshop-year" v-model.number="editorDraft.year" type="number" min="2000" max="2100"></BasiqFormField>
                        <BasiqFormField class="full" label="説明" description="この講習会は何について学べる講習会ですか？"><BasiqTextarea v-model="editorDraft.summary" :rows="4" /></BasiqFormField>
                      </div>
                    </section>

                    <section id="basic-operations" class="editor-subsection">
                      <div class="subsection-heading"><h3>③ 運営を決めよう</h3></div>
                      <BasiqFormField class="full" label="運営元">
                        <BasiqRadioGroup v-model="editorDraft.team" class="compact-radio-group" name="organizer-source" orientation="horizontal" :items="organizerSources" />
                      </BasiqFormField>
                      <BasiqFormField class="full" label="運営" description="traQ ID・グループから複数選択">
                        <div class="operator-picker">
                          <BasiqInput v-model="operatorQuery" type="search" placeholder="traQ ID・グループ" />
                          <div v-if="operatorQuery.trim()" class="suggestion-list" role="listbox" aria-label="運営候補">
                            <button v-for="candidate in operatorSuggestions" :key="candidate.kind + candidate.id" type="button" role="option" @click="addOperator(candidate)">
                              <img v-if="candidate.kind === 'user'" :src="operatorAvatar(candidate)" alt="">
                              <span v-else class="group-avatar" aria-hidden="true">G</span>
                              <span><strong>{{ candidate.label }}</strong><small>{{ candidate.detail }}・{{ candidate.kind === 'user' ? 'ユーザー' : 'グループ' }}</small></span>
                              <em>追加</em>
                            </button>
                            <p v-if="!operatorSuggestions.length">一致する候補がありません。</p>
                          </div>
                        </div>
                        <div v-if="editorDraft.operators.length" class="selected-tags">
                          <BasiqTag v-for="operator in editorDraft.operators" :key="operator.kind + operator.id" :label="operatorLabel(operator) + ' · ' + operatorDetail(operator)" :removable="true" :remove-label="operatorLabel(operator) + 'を削除'" @remove="removeOperator(operator.id)" />
                        </div>
                      </BasiqFormField>
                    </section>

                    <section id="basic-target" class="editor-subsection">
                      <div class="subsection-heading"><h3>④ 対象を決めよう</h3></div>
                      <div class="form-grid">
                        <BasiqFormField class="full" label="対象者" description="例：プログラミング未経験者・初心者 / ゲームの作り方を学びたい人"><BasiqInput v-model="editorDraft.audience" /></BasiqFormField>
                        <fieldset class="compact-checkbox-field">
                          <legend>対象班</legend>
                          <div class="basiq-check-grid"><BasiqCheckbox v-for="(team, index) in trapTeams" :id="'target-team-' + index" :key="team" :model-value="editorDraft.targetTeams.includes(team)" name="target-teams" @update:model-value="setTargetTeam(team, $event)">{{ team }}</BasiqCheckbox></div>
                        </fieldset>
                      </div>
                    </section>

                    <section id="basic-attributes" class="editor-subsection">
                      <div class="subsection-heading"><h3>⑤ 属性を決めよう</h3></div>
                      <BasiqFormField class="full" label="0→1講習会ですか？">
                        <BasiqRadioGroup v-model="zeroToOneValue" name="zero-to-one" orientation="horizontal" :items="[{ label: 'はい', value: 'true' }, { label: 'いいえ', value: 'false' }]" />
                      </BasiqFormField>
                    </section>

                    <section id="basic-relations" class="editor-subsection">
                      <div class="subsection-heading"><h3>⑥ 関連する講習会を登録しよう</h3></div>
                      <div class="relation-editors">
                        <section v-for="relation in relationSections" :key="relation.kind" class="relation-editor">
                          <header><h4>{{ relation.label }}</h4></header>
                          <div class="relation-picker">
                            <BasiqInput :model-value="relationQuery[relation.kind]" type="search" placeholder="講習会名を入力" @update:model-value="setRelationQuery(relation.kind, $event)" />
                            <div v-if="relationQuery[relation.kind].trim()" class="suggestion-list relation-suggestions">
                              <button v-for="candidate in relationCandidates(relation.kind)" :key="candidate.id" type="button" @click="addRelationWorkshop(relation.kind, candidate)"><span class="workshop-suggestion-year">{{ candidate.year }}</span><span><strong>{{ candidate.title }}</strong><small>{{ candidate.team || '運営元未登録' }}</small></span><em>選択</em></button>
                              <button class="free-text-suggestion" type="button" @click="addRelationText(relation.kind)"><span class="text-avatar" aria-hidden="true">文</span><span><strong>「{{ relationQuery[relation.kind].trim() }}」をそのまま追加</strong><small>自由テキストとして保存し、あとから候補を検索できます</small></span><em>追加</em></button>
                            </div>
                          </div>
                          <div v-if="relationEntries(relation.kind).length" class="relation-selections">
                            <article v-for="entry in relationEntries(relation.kind)" :key="entry.key"><span class="relation-entry-type">{{ entry.kind === 'workshop' ? '講習会' : '自由入力' }}</span><span><strong>{{ entry.label }}</strong><small>{{ entry.meta }}</small></span><button v-if="entry.kind === 'text' && entry.text" type="button" @click="searchRelationText(relation.kind, entry.text)">候補を検索</button><button type="button" :aria-label="entry.label + 'を削除'" @click="removeRelationEntry(relation.kind, entry)">×</button></article>
                          </div>
                        </section>
                      </div>
                    </section>
                  </template>
                  <template v-else-if="editorStep === 1"><header><span>2 / 5</span><h2>いつ、どのような構成で開催しますか</h2><p>同内容の別日程も、内容の異なる第1回・第2回も、開催として分けて登録します。</p></header><BasiqFormField class="relation-field" label="開催どうしの関係" description="講習会全体でひとつ選びます" control-id="occurrence-relation"><select id="occurrence-relation" v-model="occurrenceRelation"><option value="single">1回完結</option><option value="sequence">内容が異なる・順番に受講</option><option value="alternative">同じ内容・どれかを選ぶ</option><option value="rebroadcast">本編と再放送</option></select></BasiqFormField><div class="occurrence-editor" v-for="(occurrence, index) in editorDraft.occurrences" :key="occurrence.id"><div class="occurrence-editor-title"><h3>開催 {{ index + 1 }}</h3><button v-if="editorDraft.occurrences.length > 1" type="button" @click="removeOccurrence(index)">削除</button></div><div class="form-grid"><BasiqFormField label="表示名"><BasiqInput v-model="occurrence.title" placeholder="第1回、日程2 など" /></BasiqFormField><BasiqFormField class="full" label="この回の内容"><BasiqInput v-model="occurrence.description" placeholder="この回で扱う内容" /></BasiqFormField><BasiqFormField label="日付" :control-id="'occurrence-date-' + occurrence.id"><input :id="'occurrence-date-' + occurrence.id" v-model="occurrence.date" type="date"></BasiqFormField><BasiqFormField label="時刻"><BasiqInput v-model="occurrence.time" placeholder="18:00–20:00" /></BasiqFormField><BasiqFormField label="開催形式" :control-id="'occurrence-mode-' + occurrence.id"><select :id="'occurrence-mode-' + occurrence.id" v-model="occurrence.mode"><option value="undecided">未定</option><option value="offline">対面</option><option value="online">オンライン</option><option value="hybrid">対面・オンライン</option></select></BasiqFormField><BasiqFormField label="場所・参加先"><BasiqInput v-model="occurrence.place" :placeholder="occurrence.mode === 'online' ? '配信場所・URL' : '教室・建物'" /></BasiqFormField><BasiqFormField label="講師"><BasiqInput v-model="occurrence.instructor" /></BasiqFormField><BasiqFormField label="knoQ URL"><BasiqInput v-model="occurrence.knoqUrl" type="url" placeholder="https://knoq.trap.jp/..." /></BasiqFormField></div></div><BasiqButton type="button" tone="neutral" variant="outline" @click="addOccurrence">＋ 開催を追加</BasiqButton></template>
                  <template v-else-if="editorStep === 2"><header><span>3 / 5</span><h2>参加する人・後から受講する人に何を伝えますか</h2><p>開催前後で同じ項目を同じ順番で表示します。</p></header><div class="form-grid"><BasiqFormField class="full" label="事前準備" description="必要なアプリ、アカウント、持ち物など"><BasiqTextarea v-model="editorDraft.preparation" :rows="4" /></BasiqFormField><BasiqFormField class="full" label="後から受講する方法" description="資料や動画をどの順番で使うか"><BasiqTextarea v-model="editorDraft.howToLearn" :rows="4" /></BasiqFormField><BasiqFormField class="full" label="質問・連絡先" description="traQチャンネルや担当者"><BasiqInput v-model="editorDraft.contact" placeholder="#event/workshop、@担当者 など" /></BasiqFormField></div></template>
                  <template v-else-if="editorStep === 3"><header><span>4 / 5</span><h2>資料・動画を登録します</h2><p>まだできていなければ空のまま進められます。開催後に追加しても同じ場所へ表示されます。</p></header><div v-if="sourceWorkshop" class="reference-resources"><strong>前年度の参考資料</strong><p>今回の資料としては登録されません。必要なら内容を確認して新しいURLを入力してください。</p><a v-for="resource in sourceWorkshop.resources.filter(resource => resource.url)" :key="resource.id" :href="resource.url" target="_blank" rel="noreferrer"><span>{{ typeLabel[resource.type] }}</span>{{ resource.title }} ↗</a></div><div class="form-grid"><BasiqFormField class="full" label="全開催で共通の資料URL"><BasiqInput v-model="materialUrl" type="url" placeholder="https://..." /></BasiqFormField><BasiqFormField class="full" label="全開催で共通の動画URL"><BasiqInput v-model="videoUrl" type="url" placeholder="https://..." /></BasiqFormField></div><div v-if="editorDraft.occurrences.length > 1" class="occurrence-resources"><h3>開催ごとの資料・動画</h3><p>回ごとに内容が違う場合だけ入力します。</p><details v-for="occurrence in editorDraft.occurrences" :key="occurrence.id"><summary>{{ occurrence.title }}</summary><div class="form-grid"><BasiqFormField label="資料URL"><BasiqInput :model-value="occurrenceResourceUrl(occurrence.id, 'material')" type="url" placeholder="https://..." @update:model-value="setOccurrenceResourceUrl(occurrence.id, 'material', $event)" /></BasiqFormField><BasiqFormField label="動画URL"><BasiqInput :model-value="occurrenceResourceUrl(occurrence.id, 'video')" type="url" placeholder="https://..." @update:model-value="setOccurrenceResourceUrl(occurrence.id, 'video', $event)" /></BasiqFormField></div></details></div></template>
                  <template v-else><header><span>5 / 5</span><h2>告知文を確認して公開します</h2><p>入力済みの情報を再利用します。knoQやtraQへの投稿は自動では行いません。</p></header><BasiqFormField class="collaborator-field" label="共同編集者" description="下書きを見られるtraQ IDを、読点で区切って入力します"><BasiqInput v-model="collaboratorText" placeholder="例：alice、bob" /></BasiqFormField><div class="notice-tabs" aria-label="生成する文章"><button type="button" :class="{ active: noticeKind === 'traq' }" :aria-pressed="noticeKind === 'traq'" @click="noticeKind = 'traq'">traQ告知文</button><button type="button" :class="{ active: noticeKind === 'knoq' }" :aria-pressed="noticeKind === 'knoq'" @click="noticeKind = 'knoq'">knoQ説明文</button></div><BasiqTextarea aria-label="生成された告知文" :model-value="activeNotice" :rows="12" readonly /><div class="notice-actions"><BasiqButton type="button" tone="neutral" variant="outline" @click="copyText(activeNotice, '告知文をコピーしました')">文章をコピー</BasiqButton><BasiqButton v-if="editorDraft.status === 'draft'" type="button" @click="publishDraft">今の内容で公開</BasiqButton><BasiqButton v-else type="button" @click="saveDraft">変更を保存</BasiqButton></div></template>
                </section>
              </div>
            </template>

            <template v-else-if="route.name === 'drafts'">
              <header class="page-header"><div><h1>自分の下書き</h1><p>下書きは作成者と共同編集者だけが閲覧できます。</p></div><BasiqButton type="button" @click="navigate('/new')">講習会を作る</BasiqButton></header>
              <section class="draft-list" v-if="drafts.length"><article v-for="draft in drafts" :key="draft.id"><div><div class="card-meta"><span>下書き</span><span>{{ draft.year }}年度</span></div><h2>{{ draft.title || '名称未定の講習会' }}</h2><p>{{ draft.summary || '概要はまだ入力されていません。' }}</p></div><BasiqButton type="button" tone="neutral" variant="outline" @click="editWorkshop(draft)">続きを編集</BasiqButton></article></section>
              <section v-else class="empty-state"><strong>下書きはありません</strong><p>過去の講習会を引き継ぐか、白紙から作成できます。</p><BasiqButton type="button" @click="navigate('/new')">講習会を作る</BasiqButton></section>
            </template>

            <template v-else-if="route.name === 'me'">
              <header class="page-header profile-heading"><div><BasiqAvatar class="profile-avatar" :src="traqUserIconUrl" name="rurun" alt="" size="lg" /><div><h1>rurun のマイページ</h1><p>受講履歴と、獲得したバッジを確認できます。</p></div></div></header>
              <section class="privacy-setting"><div><h2>traP内プロフィールでバッジを公開</h2><p>初期状態は非公開です。公開しても、共有するバッジは自分で選べます。</p></div><BasiqSwitch v-model="profileVisible" aria-label="バッジをtraP内プロフィールで公開" /></section>
              <section class="badge-section"><div class="section-heading"><div><h2>獲得したバッジ</h2><p>講習会を受講完了すると追加されます。</p></div><span>{{ completedWorkshops.length }}個</span></div><div v-if="completedWorkshops.length" class="badge-grid"><article v-for="workshop in completedWorkshops" :key="workshop.id"><div class="badge-medal"><span>{{ badgeLabel(workshop) }}</span><small>{{ workshop.year }}</small></div><div><h3>{{ workshop.title }}</h3><p>{{ completionDate(workshop.id) }}に受講完了</p></div><BasiqButton type="button" tone="neutral" variant="outline" @click="shareBadge(workshop)">このバッジを共有</BasiqButton></article></div><div v-else class="empty-state"><strong>まだバッジはありません</strong><p>講習会ページから受講完了を記録してください。</p><BasiqButton type="button" tone="neutral" variant="outline" @click="navigate('/search')">講習会を探す</BasiqButton></div></section>
            </template>

            <template v-else-if="route.name === 'share' && selectedWorkshop && completedAt[selectedWorkshop.id]">
              <header class="page-header"><div><button class="back-button" type="button" @click="navigate('/me')">← マイページ</button><h1>バッジを共有</h1><p>他の受講履歴は含めず、このバッジだけを共有します。</p></div></header>
              <section class="share-card-wrap"><article class="share-card"><p>LeQtures</p><div class="badge-medal large"><span>{{ badgeLabel(selectedWorkshop) }}</span><small>{{ selectedWorkshop.year }}</small></div><h2>{{ selectedWorkshop.title }}</h2><p>{{ completionDate(selectedWorkshop.id) }}に受講しました</p><small>@rurun</small></article><div class="share-controls"><h2>共有する内容</h2><BasiqTextarea aria-label="バッジの共有文" :model-value="shareText(selectedWorkshop)" :rows="3" readonly /><BasiqButton type="button" @click="copyText(shareText(selectedWorkshop), '共有文をコピーしました')">共有文をコピー</BasiqButton><p>traQやSNSへの投稿は自動では行いません。</p></div></section>
            </template>

            <section v-else class="empty-state not-found"><strong>ページが見つかりません</strong><BasiqButton type="button" @click="navigate('/')">ホームへ戻る</BasiqButton></section>
          </main>
        </div>
      </div>
      <div v-if="toast" class="toast" role="status">{{ toast }}</div>
    </BasiqThemeProvider>
  `,
});
