import {
  BasiqAvatar,
  BasiqButton,
  BasiqCard,
  BasiqCheckbox,
  BasiqDialog,
  BasiqFormField,
  BasiqIcon,
  BasiqInput,
  BasiqNavigationItem,
  BasiqNavigationList,
  BasiqRadioGroup,
  BasiqSwitch,
  BasiqTabsContent,
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
  type WorkshopChannel,
  type WorkshopOperator,
  type WorkshopRelationRef,
} from "./data";
import { makeRandomWorkshopTitle } from "./randomWorkshopWords";
import { searchTextScore } from "./search";

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

type TraqChannelCandidate = WorkshopChannel;

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

const OCCURRENCE_FORMATS = [
  { value: "online", label: "オンライン" },
  { value: "offline", label: "オフライン" },
  { value: "hybrid", label: "ハイブリッド" },
] as const;

const ONLINE_PLATFORMS = [
  { value: "qall", label: "Qall" },
  { value: "discord", label: "Discord" },
  { value: "other", label: "その他" },
] as const;

const SCIENCE_TOKYO_ROOMS = [
  "S2-201",
  "S2-202",
  "S3-201",
  "S3-202",
  "S4-201",
  "S4-202",
  "W2-301",
  "W2-401",
  "W8E-101",
  "W8E-102",
  "西9号館ディジタル多目的ホール",
  "Hisao & Hiroko Taki Plaza",
] as const;

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
    BasiqDialog,
    BasiqFormField,
    BasiqIcon,
    BasiqInput,
    BasiqNavigationItem,
    BasiqNavigationList,
    BasiqRadioGroup,
    BasiqSwitch,
    BasiqTabsContent,
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
    const activeOccurrenceId = ref("");
    const activeLecturerId = ref("");
    const activeEditorSection = ref("basic-name");
    const operatorQuery = ref("");
    const lecturerQuery = ref<Record<string, string>>({});
    const channelQuery = ref("");
    const traqDirectory = ref<TraqDirectoryCandidate[]>(TRAQ_DIRECTORY);
    const traqChannels = ref<TraqChannelCandidate[]>([]);
    const traqDirectoryRequested = ref(false);
    const relationQuery = ref<Record<RelationKind, string>>({ previous: "", prerequisite: "", recommended: "" });
    const resetDialogOpen = ref(false);
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

    const teams = computed(() => TRAP_TEAMS.filter((team) => workshops.value.some(
      (workshop) => workshop.status === "public" && workshop.team === team,
    )));

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
      const searchFields = [
        workshop.title,
        workshop.summary,
        workshop.outcome,
        workshop.audience,
        workshop.prerequisites,
        workshop.team,
        workshop.workshopChannel?.path ?? "",
        ...workshop.operators.flatMap((operator) => [operator.name, operatorLabel(operator)]),
        ...workshop.targetTeams,
        ...workshop.occurrences.flatMap((occurrence) => [
          occurrence.title,
          occurrence.description,
          occurrence.onlineLocation,
          occurrence.offlineLocation,
          ...occurrence.instructors.map((instructor) => instructor.name),
        ]),
        ...workshop.resources.flatMap((resource) => [resource.title, resource.note ?? ""]),
        ...workshop.previousTextRefs.map(relationReferenceText),
        ...workshop.prerequisiteRefs.map(relationReferenceText),
        ...workshop.recommendedRefs.map(relationReferenceText),
        ...workshop.tags,
      ];
      const queryMatches = !needle || searchTextScore(searchFields, needle) >= 0;
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

    const isOccurrenceComplete = (occurrence: Occurrence) => Boolean(
      occurrence.title.trim()
      && occurrence.description.trim()
      && occurrence.date
      && occurrence.startTime
      && occurrence.endTime
      && occurrence.instructors.length
      && occurrence.mode !== "undecided",
    );

    const occurrenceHasPlace = (occurrence: Occurrence) => {
      const needsOnline = occurrence.mode === "online" || occurrence.mode === "hybrid";
      const needsOffline = occurrence.mode === "offline" || occurrence.mode === "hybrid";
      return (!needsOnline || Boolean(occurrence.onlinePlatform && occurrence.onlineLocation.trim()))
        && (!needsOffline || Boolean(occurrence.offlineLocation.trim()));
    };

    const occurrenceHasStream = (occurrence: Occurrence) => editorDraft.value.resources.some(
      (resource) => resource.type === "video"
        && resource.occurrenceId === occurrence.id
        && Boolean(resource.url?.trim()),
    );

    const editorSections = computed(() => {
      const draft = editorDraft.value;
      const hasOccurrences = draft.occurrences.length > 0;
      return [
        {
          key: "basic",
          label: "基本情報",
          done: Boolean(draft.year && draft.team && draft.summary.trim()),
        },
        {
          key: "occurrences",
          label: "開催枠",
          done: hasOccurrences && draft.occurrences.every(isOccurrenceComplete),
        },
        {
          key: "preparation",
          label: "開催準備",
          done: hasOccurrences && draft.occurrences.every((occurrence) => (
            occurrence.mode !== "undecided" && occurrenceHasPlace(occurrence)
          )),
        },
        {
          key: "materials",
          label: "資料",
          done: hasLearningResource(draft),
        },
        {
          key: "announcements",
          label: "告知",
          done: Boolean(hasOccurrences && draft.occurrences.some((occurrence) => occurrence.date)),
        },
        {
          key: "retrospective",
          label: "振り返り",
          done: Boolean(draft.reflectionUrl.trim()),
        },
      ];
    });

    const occurrenceSections = computed(() => editorDraft.value.occurrences.map((occurrence, index) => ({
      id: occurrence.id,
      label: occurrence.title.trim() || `開催枠 ${index + 1}`,
      done: isOccurrenceComplete(occurrence),
    })));

    const basicInfoSections = computed(() => {
      const draft = editorDraft.value;
      return [
        { id: "basic-name", label: "名前", done: Boolean(draft.year) },
        { id: "basic-operations", label: "運営", done: Boolean(draft.team && draft.operators.length) },
        {
          id: "basic-introduction",
          label: "紹介",
          done: Boolean(draft.summary.trim() && (draft.audience.trim() || draft.targetTeams.length)),
        },
        {
          id: "basic-relations",
          label: "関連講習会",
          done: Boolean(
            draft.previousIds.length
            || draft.previousTextRefs.length
            || draft.prerequisiteRefs.length
            || draft.recommendedRefs.length,
          ),
        },
      ];
    });

    const preparationSections = computed(() => [
      { id: "preparation-admin", label: "庶務への連絡", done: !editorDraft.value.requestSetup || Boolean(editorDraft.value.occurrences.length) },
      { id: "preparation-place", label: "開催場所", done: editorDraft.value.occurrences.every((occurrence) => occurrence.mode !== "undecided" && occurrenceHasPlace(occurrence)) },
      { id: "preparation-stream", label: "配信", done: editorDraft.value.occurrences.some(occurrenceHasStream) },
      { id: "preparation-knoq", label: "knoQ", done: editorDraft.value.occurrences.every((occurrence) => Boolean(occurrence.knoqUrl.trim())) },
    ]);

    const materialSections = computed(() => [
      { id: "materials-common", label: "講習会全体", done: resourcesFor("material").some((resource) => Boolean(resource.url?.trim())) },
      ...editorDraft.value.occurrences.map((occurrence) => ({
        id: `materials-${occurrence.id}`,
        label: occurrence.title.trim() || "名称未定の開催枠",
        done: resourcesFor("material", occurrence.id).some((resource) => Boolean(resource.url?.trim())),
      })),
    ]);

    const announcementSections = computed(() => [
      { id: "announcement-event", label: "#event/workshop", done: true },
      { id: "announcement-channel", label: "講習会チャンネル", done: Boolean(editorDraft.value.workshopChannel) },
      { id: "announcement-reminders", label: "直前リマインド", done: editorDraft.value.occurrences.some((occurrence) => Boolean(occurrence.date)) },
    ]);

    const retrospectiveSections = computed(() => [
      { id: "retrospective-record", label: "振り返り・引き継ぎ", done: Boolean(editorDraft.value.reflectionUrl.trim()) },
    ]);

    const editorNavigationSections = computed(() => {
      if (editorStep.value === 0) return basicInfoSections.value;
      if (editorStep.value === 1) return occurrenceSections.value.map((section) => ({
        ...section,
        id: `occurrence-slot-${section.id}`,
      }));
      if (editorStep.value === 2) return preparationSections.value;
      if (editorStep.value === 3) return materialSections.value;
      if (editorStep.value === 4) return announcementSections.value;
      return retrospectiveSections.value;
    });

    const operatorSuggestions = computed(() => {
      const needle = operatorQuery.value.trim();
      if (!needle) return [];
      const selectedIds = new Set(editorDraft.value.operators.map((operator) => operator.id));
      return traqDirectory.value
        .filter((candidate) => !selectedIds.has(candidate.id))
        .map((candidate) => ({
          candidate,
          score: searchTextScore([candidate.name, candidate.label, candidate.detail], needle),
        }))
        .filter(({ score }) => score >= 0)
        .sort((left, right) => right.score - left.score
          || Number(left.candidate.kind === "group") - Number(right.candidate.kind === "group")
          || left.candidate.label.localeCompare(right.candidate.label, "ja"))
        .map(({ candidate }) => candidate)
        .slice(0, 8);
    });

    const channelSuggestions = computed(() => {
      const needle = channelQuery.value.trim().replace(/^#/, "");
      if (!needle) return [];
      return traqChannels.value
        .map((channel) => ({
          channel,
          score: searchTextScore([channel.name, channel.path], needle),
        }))
        .filter(({ score }) => score >= 0)
        .sort((left, right) => right.score - left.score || left.channel.path.localeCompare(right.channel.path, "ja"))
        .map(({ channel }) => channel)
        .slice(0, 10);
    });

    const zeroToOneEnabled = computed<boolean>({
      get: () => editorDraft.value.isZeroToOne === true,
      set: (value) => {
        editorDraft.value.isZeroToOne = value;
      },
    });

    const editorWorkshopTitle = computed(() => (
      editorDraft.value.title.trim() || makeRandomWorkshopTitle(editorDraft.value.id)
    ));

    const editorProgress = computed(() => Math.round(
      (editorSections.value.filter((section) => section.done).length / editorSections.value.length) * 100,
    ));

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

    function resourcesFor(type: ResourceType, occurrenceId?: string) {
      return editorDraft.value.resources.filter(
        (resource) => resource.type === type && resource.occurrenceId === occurrenceId,
      );
    }

    function addResource(type: ResourceType, occurrenceId?: string) {
      const resourceNumber = resourcesFor(type, occurrenceId).length + 1;
      editorDraft.value.resources.push({
        id: `${type}-${crypto.randomUUID()}`,
        type,
        title: type === "video" ? `配信・動画 ${resourceNumber}` : `資料 ${resourceNumber}`,
        url: "",
        occurrenceId,
      });
    }

    function removeResource(resourceId: string) {
      editorDraft.value.resources = editorDraft.value.resources.filter((resource) => resource.id !== resourceId);
    }

    const occurrenceRelation = computed({
      get: () => editorDraft.value.occurrences.find((occurrence) => occurrence.relation !== "single")?.relation
        ?? editorDraft.value.occurrences[0]?.relation
        ?? "single",
      set: (relation: Occurrence["relation"]) => {
        editorDraft.value.occurrences.forEach((occurrence) => { occurrence.relation = relation; });
      },
    });

    const occurrenceTitle = (occurrenceId?: string) => {
      if (!occurrenceId) return "講習会共通";
      return editorDraft.value.occurrences.find((occurrence) => occurrence.id === occurrenceId)?.title
        ?? selectedWorkshop.value?.occurrences.find((occurrence) => occurrence.id === occurrenceId)?.title
        ?? "開催枠ごとの資料";
    };

    const occurrenceModes = (workshop: Workshop) => {
      const labels = Array.from(new Set(workshop.occurrences
        .map((occurrence) => modeLabel(occurrence.mode))
        .filter((label) => label !== "未定")));
      return labels.join("・") || "未登録";
    };

    const formatOccurrenceTime = (occurrence: Occurrence) => {
      if (occurrence.startTime && occurrence.endTime) return `${occurrence.startTime}〜${occurrence.endTime}`;
      if (occurrence.startTime) return `${occurrence.startTime}〜`;
      if (occurrence.endTime) return `〜${occurrence.endTime}`;
      return occurrence.time;
    };

    const formatOccurrencePlace = (occurrence: Occurrence) => {
      const locations: string[] = [];
      if (occurrence.mode === "online" || occurrence.mode === "hybrid") {
        const platform = ONLINE_PLATFORMS.find((item) => item.value === occurrence.onlinePlatform)?.label;
        if (platform || occurrence.onlineLocation) locations.push([platform, occurrence.onlineLocation].filter(Boolean).join(" "));
      }
      if ((occurrence.mode === "offline" || occurrence.mode === "hybrid") && occurrence.offlineLocation) {
        locations.push(occurrence.offlineLocation);
      }
      return locations.join(" / ") || occurrence.place;
    };

    const formatOccurrenceForNotice = (occurrence: Occurrence) => {
      const when = [formatDate(occurrence.date), formatOccurrenceTime(occurrence)]
        .filter((value) => value && value !== "未登録")
        .join(" ");
      const place = formatOccurrencePlace(occurrence);
      const where = place || (occurrence.mode === "undecided" ? "" : modeLabel(occurrence.mode));
      return `・${occurrence.title}${when ? `：${when}` : "：日時未定"}${where ? ` / ${where}` : ""}`;
    };

    const generatedEventAnnouncement = computed(() => {
      const draft = editorDraft.value;
      const lines = [
        `## ${editorWorkshopTitle.value}`,
        draft.summary,
        "",
        draft.audience ? `対象：${draft.audience}` : "",
        "",
        "### 開催枠",
        ...draft.occurrences.map(formatOccurrenceForNotice),
      ].filter((line, index, values) => line !== "" || values[index - 1] !== "");
      const knoqOccurrences = draft.occurrences.filter((occurrence) => occurrence.knoqUrl);
      for (const occurrence of knoqOccurrences) {
        const label = draft.occurrences.length > 1 ? `knoQ（${occurrence.title}）` : "knoQ";
        lines.push(`${label}：${occurrence.knoqUrl}`);
      }
      if (draft.workshopChannel) lines.push(`質問：${draft.workshopChannel.path}`);
      return lines.join("\n");
    });

    const generatedChannelAnnouncement = computed(() => {
      const draft = editorDraft.value;
      return [
        `## ${editorWorkshopTitle.value}`,
        draft.summary,
        draft.audience ? `対象：${draft.audience}` : "",
        "### 開催枠",
        ...draft.occurrences.map(formatOccurrenceForNotice),
        draft.resources.some((resource) => resource.type === "material" && resource.url)
          ? "資料はLeQturesの講習会ページから確認できます。"
          : "",
      ].filter(Boolean).join("\n\n");
    });

    const generatedSetupRequest = computed(() => {
      const draft = editorDraft.value;
      const offline = draft.occurrences.filter((occurrence) => occurrence.mode === "offline" || occurrence.mode === "hybrid");
      const streamed = draft.occurrences.filter((occurrence) => (
        occurrence.mode === "online"
        || occurrence.mode === "hybrid"
        || occurrenceHasStream(occurrence)
      ));
      const requests = [
        offline.length ? "講義室の予約と当日の設営" : "",
        streamed.length ? "配信枠の確保" : "",
      ].filter(Boolean).join("、");
      return [
        `お疲れさまです。${editorWorkshopTitle.value}の開催について、${requests || "必要な準備"}をお願いしたいです。`,
        "",
        ...draft.occurrences.map(formatOccurrenceForNotice),
        "",
        "よろしくお願いします。",
      ].join("\n");
    });

    function generatedKnoq(occurrence: Occurrence) {
      const draft = editorDraft.value;
      return [
        `${editorWorkshopTitle.value}${draft.occurrences.length > 1 ? ` ${occurrence.title || "開催枠"}` : ""}`,
        occurrence.description || draft.summary,
        draft.audience ? `対象：${draft.audience}` : "",
        `日時：${[formatDate(occurrence.date), formatOccurrenceTime(occurrence)].filter(Boolean).join(" ")}`,
        formatOccurrencePlace(occurrence) ? `場所：${formatOccurrencePlace(occurrence)}` : "",
        draft.workshopChannel ? `質問：${draft.workshopChannel.path}` : "",
      ].filter(Boolean).join("\n\n");
    }

    function generatedReminder(occurrence: Occurrence) {
      return [
        `本日は${editorWorkshopTitle.value}${editorDraft.value.occurrences.length > 1 ? ` ${occurrence.title || "開催枠"}` : ""}です。`,
        `日時：${[formatDate(occurrence.date), formatOccurrenceTime(occurrence)].filter(Boolean).join(" ")}`,
        formatOccurrencePlace(occurrence) ? `場所：${formatOccurrencePlace(occurrence)}` : "",
        occurrence.knoqUrl ? `knoQ：${occurrence.knoqUrl}` : "",
      ].filter(Boolean).join("\n");
    }

    function formatDate(value: string) {
      if (!value) return "未登録";
      const date = new Date(`${value}T00:00:00`);
      if (Number.isNaN(date.getTime())) return value;
      return new Intl.DateTimeFormat("ja-JP", { year: "numeric", month: "long", day: "numeric", weekday: "short" }).format(date);
    }

    function modeLabel(mode: Occurrence["mode"]) {
      if (mode === "offline") return "オフライン";
      if (mode === "online") return "オンライン";
      if (mode === "hybrid") return "ハイブリッド";
      return "未定";
    }

    function relationLabel(occurrences: Occurrence[]) {
      if (occurrences.length <= 1) return "1回完結";
      const relations = new Set(occurrences.map((occurrence) => occurrence.relation));
      if (relations.has("unknown") || relations.has("single")) return "複数の開催枠があります";
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
      const scrollX = window.scrollX;
      const scrollY = window.scrollY;
      if (index === 1 && !activeOccurrenceId.value) {
        activeOccurrenceId.value = editorDraft.value.occurrences[0]?.id ?? "";
      }
      editorStep.value = index;
      await nextTick();
      activeEditorSection.value = editorNavigationSections.value[0]?.id ?? "";
      requestAnimationFrame(() => {
        const root = document.documentElement;
        const previousBehavior = root.style.scrollBehavior;
        root.style.scrollBehavior = "auto";
        window.scrollTo(scrollX, Math.min(scrollY, Math.max(0, root.scrollHeight - window.innerHeight)));
        root.style.scrollBehavior = previousBehavior;
      });
    }

    async function scrollToEditorSection(id: string) {
      activeBasicInfoSection.value = id;
      activeEditorSection.value = id;
      if (id.startsWith("occurrence-slot-")) {
        activeOccurrenceId.value = id.slice("occurrence-slot-".length);
      }
      await nextTick();
      document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
    }

    async function scrollToOccurrence(id: string) {
      activeOccurrenceId.value = id;
      activeEditorSection.value = `occurrence-slot-${id}`;
      await nextTick();
      document.getElementById(`occurrence-slot-${id}`)?.scrollIntoView({ behavior: "smooth", block: "start" });
    }

    function setTargetTeam(team: string, selected: boolean) {
      const index = editorDraft.value.targetTeams.indexOf(team);
      if (selected && index < 0) editorDraft.value.targetTeams.push(team);
      if (!selected && index >= 0) editorDraft.value.targetTeams.splice(index, 1);
    }

    function setOccurrenceMode(occurrence: Occurrence, value: string | null) {
      if (value === "online" || value === "offline" || value === "hybrid") occurrence.mode = value;
    }

    function setOnlinePlatform(occurrence: Occurrence, value: string | null) {
      if (value === "qall" || value === "discord" || value === "other") occurrence.onlinePlatform = value;
    }

    function addOperator(candidate: TraqDirectoryCandidate) {
      if (editorDraft.value.operators.some((operator) => operator.id === candidate.id)) return;
      editorDraft.value.operators.push({ kind: candidate.kind, id: candidate.id, name: candidate.name });
      operatorQuery.value = "";
    }

    function addFirstOperatorSuggestion(event: KeyboardEvent) {
      if (event.isComposing || event.keyCode === 229) return;
      const first = operatorSuggestions.value[0];
      if (!first) return;
      event.preventDefault();
      addOperator(first);
    }

    function removeOperator(id: string) {
      editorDraft.value.operators = editorDraft.value.operators.filter((operator) => operator.id !== id);
    }

    function operatorDirectoryEntry(operator: WorkshopOperator) {
      return traqDirectory.value.find((candidate) => candidate.id === operator.id);
    }

    function operatorLabel(operator: WorkshopOperator) {
      return operatorDirectoryEntry(operator)?.label ?? (operator.kind === "user" ? `@${operator.name}` : operator.name);
    }

    function operatorDetail(operator: WorkshopOperator) {
      return operatorDirectoryEntry(operator)?.detail ?? "";
    }

    function operatorTagLabel(operator: WorkshopOperator) {
      const detail = operatorDetail(operator).trim();
      return detail ? `${operatorLabel(operator)} · ${detail}` : operatorLabel(operator);
    }

    function instructorNames(occurrence: Occurrence) {
      if (occurrence.instructors.length) return occurrence.instructors.map(operatorLabel).join("、");
      return occurrence.instructor.trim() || "未登録";
    }

    function operatorAvatar(candidate: TraqDirectoryCandidate) {
      return candidate.kind === "user" ? `https://q.trap.jp/api/v3/public/icon/${encodeURIComponent(candidate.name)}` : "";
    }

    function lecturerSuggestions(occurrence: Occurrence) {
      const needle = (lecturerQuery.value[occurrence.id] ?? "").trim().replace(/^@/, "");
      if (!needle) return [];
      const selectedIds = new Set(occurrence.instructors.map((instructor) => instructor.id));
      return traqDirectory.value
        .filter((candidate) => candidate.kind === "user" && !selectedIds.has(candidate.id))
        .map((candidate) => ({
          candidate,
          score: searchTextScore([candidate.name, candidate.label, candidate.detail], needle),
        }))
        .filter(({ score }) => score >= 0)
        .sort((left, right) => right.score - left.score
          || left.candidate.label.localeCompare(right.candidate.label, "ja"))
        .map(({ candidate }) => candidate)
        .slice(0, 8);
    }

    function setLecturerQuery(occurrence: Occurrence, value: string) {
      lecturerQuery.value = { ...lecturerQuery.value, [occurrence.id]: value };
      activeLecturerId.value = occurrence.id;
    }

    function selectLecturer(occurrence: Occurrence, candidate: TraqDirectoryCandidate) {
      if (!occurrence.instructors.some((instructor) => instructor.id === candidate.id)) {
        occurrence.instructors.push({ kind: "user", id: candidate.id, name: candidate.name });
      }
      occurrence.instructor = occurrence.instructors.map((instructor) => instructor.name).join("、");
      lecturerQuery.value = { ...lecturerQuery.value, [occurrence.id]: "" };
      activeLecturerId.value = occurrence.id;
    }

    function removeLecturer(occurrence: Occurrence, lecturerId: string) {
      occurrence.instructors = occurrence.instructors.filter((instructor) => instructor.id !== lecturerId);
      occurrence.instructor = occurrence.instructors.map((instructor) => instructor.name).join("、");
    }

    function addFirstLecturerSuggestion(event: KeyboardEvent, occurrence: Occurrence) {
      if (event.isComposing || event.keyCode === 229) return;
      const first = lecturerSuggestions(occurrence)[0];
      if (!first) return;
      event.preventDefault();
      selectLecturer(occurrence, first);
    }

    function closeLecturerSuggestions(event: FocusEvent) {
      const container = event.currentTarget;
      const nextTarget = event.relatedTarget;
      if (container instanceof HTMLElement && nextTarget instanceof Node && container.contains(nextTarget)) return;
      activeLecturerId.value = "";
    }

    async function loadTraqDirectory() {
      if (traqDirectoryRequested.value) return;
      traqDirectoryRequested.value = true;
      try {
        const response = await fetch("/api/traq/directory", {
          method: "GET",
          headers: { Accept: "application/json" },
        });
        if (!response.ok) throw new Error("traQ directory request failed");
        const payload = await response.json() as {
          candidates?: unknown;
          channels?: unknown;
          sources?: unknown;
        };
        const candidates = (Array.isArray(payload.candidates) ? payload.candidates : []).filter((candidate): candidate is TraqDirectoryCandidate => {
          if (!candidate || typeof candidate !== "object") return false;
          const value = candidate as Partial<TraqDirectoryCandidate>;
          return (value.kind === "user" || value.kind === "group")
            && typeof value.id === "string"
            && typeof value.name === "string"
            && typeof value.label === "string"
            && typeof value.detail === "string";
        });
        const sources = payload.sources && typeof payload.sources === "object"
          ? payload.sources as { users?: unknown; groups?: unknown; channels?: unknown }
          : null;
        if (Array.isArray(payload.candidates)) {
          const enriched = candidates.map((candidate) => {
            const snapshot = TRAQ_DIRECTORY.find((entry) => (
              entry.kind === candidate.kind
              && (entry.id === candidate.id || entry.name.toLowerCase() === candidate.name.toLowerCase())
            ));
            return snapshot && !candidate.detail
              ? { ...candidate, detail: snapshot.detail }
              : candidate;
          });
          const currentUsers = traqDirectory.value.filter((candidate) => candidate.kind === "user");
          const currentGroups = traqDirectory.value.filter((candidate) => candidate.kind === "group");
          traqDirectory.value = [
            ...(sources && sources.users !== true
              ? currentUsers
              : enriched.filter((candidate) => candidate.kind === "user")),
            ...(sources && sources.groups !== true
              ? currentGroups
              : enriched.filter((candidate) => candidate.kind === "group")),
          ];
        }
        const channels = (Array.isArray(payload.channels) ? payload.channels : []).filter(
          (channel): channel is TraqChannelCandidate => {
            if (!channel || typeof channel !== "object") return false;
            const value = channel as Partial<TraqChannelCandidate>;
            return typeof value.id === "string"
              && typeof value.name === "string"
              && typeof value.path === "string";
          },
        );
        if (Array.isArray(payload.channels) && (!sources || sources.channels === true)) {
          traqChannels.value = channels;
        }
        if (sources && (sources.users !== true || sources.groups !== true || sources.channels !== true)) {
          traqDirectoryRequested.value = false;
        }
      } catch {
        // 読み取りに失敗した場合は、安全な同梱スナップショットを使う。
        traqDirectoryRequested.value = false;
      }
    }

    function selectWorkshopChannel(channel: TraqChannelCandidate) {
      editorDraft.value.workshopChannel = { ...channel };
      channelQuery.value = "";
    }

    function clearWorkshopChannel() {
      editorDraft.value.workshopChannel = null;
      channelQuery.value = "";
    }

    function addFirstChannelSuggestion(event: KeyboardEvent) {
      if (event.isComposing || event.keyCode === 229) return;
      const first = channelSuggestions.value[0];
      if (!first) return;
      event.preventDefault();
      selectWorkshopChannel(first);
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

    function publicRelationEntries(workshop: Workshop, kind: RelationKind): RelationEntryView[] {
      const linked = kind === "previous"
        ? workshop.previousIds.map((id) => ({ kind: "workshop" as const, workshopId: id }))
        : [];
      const references = kind === "previous"
        ? workshop.previousTextRefs
        : kind === "prerequisite"
          ? workshop.prerequisiteRefs
          : workshop.recommendedRefs;
      return [...linked, ...references].map((reference, index): RelationEntryView => {
        if (reference.kind === "text") {
          return {
            key: `${kind}:text:${index}:${reference.text}`,
            kind: "text",
            text: reference.text,
            label: reference.text,
            meta: "",
          };
        }
        const relatedWorkshop = workshops.value.find((candidate) => candidate.id === reference.workshopId);
        return {
          key: `${kind}:workshop:${reference.workshopId}`,
          kind: "workshop",
          workshopId: reference.workshopId,
          label: relatedWorkshop?.title ?? "参照先を確認できません",
          meta: relatedWorkshop ? `${relatedWorkshop.year}年度` : "",
        };
      });
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
        if (existing) {
          editorDraft.value = cloneWorkshop(normalizeWorkshop(existing));
          const requestedStep = Number(new URLSearchParams(location.hash.split("?")[1] ?? "").get("step"));
          if (Number.isInteger(requestedStep) && requestedStep >= 1 && requestedStep <= editorSections.value.length) {
            editorStep.value = requestedStep - 1;
          }
          activeOccurrenceId.value = editorDraft.value.occurrences[0]?.id ?? "";
          activeEditorSection.value = editorNavigationSections.value[0]?.id ?? "basic-name";
          lecturerQuery.value = {};
          channelQuery.value = "";
        }
        void loadTraqDirectory();
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
      activeOccurrenceId.value = draft.occurrences[0]?.id ?? "";
      navigate(`/edit/${draft.id}`);
    }

    function startBlank() {
      const draft = makeBlankWorkshop();
      editorDraft.value = draft;
      upsertDraft(draft);
      editorStep.value = 0;
      activeOccurrenceId.value = draft.occurrences[0]?.id ?? "";
      navigate(`/edit/${draft.id}`);
    }

    function editWorkshop(workshop: Workshop) {
      editorDraft.value = cloneWorkshop(normalizeWorkshop(workshop));
      editorStep.value = 0;
      activeOccurrenceId.value = editorDraft.value.occurrences[0]?.id ?? "";
      navigate(`/edit/${workshop.id}`);
    }

    function saveDraft() {
      const isPublic = editorDraft.value.status === "public";
      if (!editorDraft.value.title.trim()) editorDraft.value.title = makeRandomWorkshopTitle(editorDraft.value.id);
      editorDraft.value.revisions.push({ at: "たった今", by: "rurun", summary: isPublic ? "公開情報を更新" : "下書きを保存" });
      upsertDraft(editorDraft.value);
      showToast(isPublic ? "変更を保存しました" : "下書きを保存しました");
      if (isPublic) openWorkshop(editorDraft.value.id);
    }

    async function publishDraft() {
      if (!editorDraft.value.title.trim()) editorDraft.value.title = makeRandomWorkshopTitle(editorDraft.value.id);
      const wasPublic = editorDraft.value.status === "public";
      editorDraft.value.status = "public";
      editorDraft.value.revisions.push({ at: "たった今", by: "rurun", summary: wasPublic ? "公開情報を更新" : "講習会を公開" });
      upsertDraft(editorDraft.value);
      showToast(wasPublic ? "変更を保存しました" : "講習会を公開しました");
      openWorkshop(editorDraft.value.id);
    }

    async function addOccurrence() {
      const relation = editorDraft.value.occurrences.length === 1 && occurrenceRelation.value === "single"
        ? "unknown"
        : occurrenceRelation.value;
      editorDraft.value.occurrences.forEach((occurrence) => { occurrence.relation = relation; });
      const previousTitle = editorDraft.value.occurrences[editorDraft.value.occurrences.length - 1]?.title.trim() ?? "";
      const sequenceMatch = previousTitle.match(/^第([0-9０-９]+)回$/u);
      const sequenceNumber = sequenceMatch
        ? Number(sequenceMatch[1].replace(/[０-９]/g, (digit) => String("０１２３４５６７８９".indexOf(digit))))
        : Number.NaN;
      const occurrence: Occurrence = {
        id: `occurrence-${crypto.randomUUID()}`,
        title: Number.isFinite(sequenceNumber) ? `第${sequenceNumber + 1}回` : "",
        description: "",
        date: "",
        time: "",
        startTime: "",
        endTime: "",
        mode: "undecided",
        place: "",
        onlinePlatform: "",
        onlineLocation: "",
        offlineLocation: "",
        instructor: "",
        instructors: [],
        relation,
        status: "planned",
        knoqUrl: "",
      };
      editorDraft.value.occurrences.push(occurrence);
      activeOccurrenceId.value = occurrence.id;
      await nextTick();
      await scrollToOccurrence(occurrence.id);
      document.querySelector<HTMLInputElement>(`#occurrence-slot-${occurrence.id} input`)?.focus({ preventScroll: true });
    }

    function removeOccurrence(index: number) {
      if (editorDraft.value.occurrences.length <= 1) return;
      const [removed] = editorDraft.value.occurrences.splice(index, 1);
      editorDraft.value.resources = editorDraft.value.resources.filter((resource) => resource.occurrenceId !== removed.id);
      if (editorDraft.value.occurrences.length === 1) editorDraft.value.occurrences[0].relation = "single";
      if (activeOccurrenceId.value === removed.id) {
        activeOccurrenceId.value = editorDraft.value.occurrences[Math.max(0, index - 1)]?.id ?? "";
      }
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
      workshops.value = cloneSeedWorkshops();
      completedAt.value = {};
      profileVisible.value = false;
      localStorage.removeItem(WORKSHOP_STORAGE_KEY);
      localStorage.removeItem(COMPLETION_STORAGE_KEY);
      localStorage.removeItem(VISIBILITY_STORAGE_KEY);
      refreshRandomWorkshops();
      resetDialogOpen.value = false;
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
      activeEditorSection,
      activeOccurrenceId,
      activeLecturerId,
      activeFilter,
      activeTeam,
      addFirstChannelSuggestion,
      addFirstLecturerSuggestion,
      addFirstOperatorSuggestion,
      addOccurrence,
      addOperator,
      addRelationText,
      addRelationWorkshop,
      addResource,
      availability,
      badgeLabel,
      basicInfoSections,
      channelQuery,
      channelSuggestions,
      clearWorkshopChannel,
      closeLecturerSuggestions,
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
      editorNavigationSections,
      editorSections,
      editorStep,
      editWorkshop,
      formatDate,
      formatOccurrencePlace,
      formatOccurrenceTime,
      generatedChannelAnnouncement,
      generatedEventAnnouncement,
      HomeIcon,
      generatedKnoq,
      generatedReminder,
      generatedSetupRequest,
      hasResource,
      instructorNames,
      lecturerQuery,
      lecturerSuggestions,
      loadTraqDirectory,
      modeLabel,
      navigate,
      nextWorkshops,
      onlinePlatforms: ONLINE_PLATFORMS,
      occurrenceFormats: OCCURRENCE_FORMATS,
      occurrenceModes,
      occurrenceSections,
      occurrenceRelation,
      PlusIcon,
      publicRelationEntries,
      occurrenceTitle,
      occurrenceStatusLabel,
      openWorkshop,
      operatorAvatar,
      operatorDetail,
      operatorLabel,
      operatorTagLabel,
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
      resetDialogOpen,
      removeLecturer,
      removeOperator,
      removeRelationEntry,
      removeOccurrence,
      removeResource,
      resetDemo,
      resourcesFor,
      returnFromDetail,
      route,
      saveDraft,
      scienceTokyoRooms: SCIENCE_TOKYO_ROOMS,
      searchResults,
      searchByTeam,
      SearchIcon,
      selectLecturer,
      selectWorkshopChannel,
      selectedWorkshop,
      scrollToSection,
      scrollToEditorSection,
      scrollToOccurrence,
      searchRelationText,
      setEditorStep,
      setOnlinePlatform,
      setRelationQuery,
      shareBadge,
      shareText,
      setLecturerQuery,
      setOccurrenceMode,
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
      makeRandomWorkshopTitle,
      traqUserIconUrl: TRAQ_USER_ICON_URL,
      toast,
      toggleCompletion,
      typeLabel,
      workshopLatestDate,
      zeroToOneEnabled,
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
          <div class="sidebar-navigation">
            <p>受講する</p>
            <BasiqNavigationList aria-label="受講する">
              <BasiqNavigationItem href="#/" :current="route.name === 'home'"><span class="nav-item-content"><BasiqIcon class="nav-icon" :icon="HomeIcon" /><span>ホーム</span></span></BasiqNavigationItem>
              <BasiqNavigationItem href="#/search" :current="route.name === 'search' || route.name === 'detail'"><span class="nav-item-content"><BasiqIcon class="nav-icon" :icon="SearchIcon" /><span>講習会を探す</span></span></BasiqNavigationItem>
            </BasiqNavigationList>
            <p>運営する</p>
            <BasiqNavigationList aria-label="運営する">
              <BasiqNavigationItem href="#/drafts" :current="route.name === 'drafts'"><span class="nav-item-content"><BasiqIcon class="nav-icon" :icon="DraftIcon" /><span>自分の下書き</span><em v-if="drafts.length">{{ drafts.length }}</em></span></BasiqNavigationItem>
            </BasiqNavigationList>
          </div>
          <div class="sidebar-footer">
            <BasiqCard class="sidebar-note"><strong>デモ版</strong><span>操作内容はこの端末だけに保存されます。</span></BasiqCard>
            <BasiqDialog v-model:open="resetDialogOpen" title="初期状態に戻す" description="入力したデモ内容を消して、初期状態へ戻します。">
              <template #trigger><BasiqButton class="sidebar-reset" type="button" tone="neutral" variant="outline">初期状態に戻す</BasiqButton></template>
              <template #footer="{ close }"><BasiqButton type="button" tone="neutral" variant="outline" @click="close">キャンセル</BasiqButton><BasiqButton type="button" tone="danger" @click="resetDemo">初期状態に戻す</BasiqButton></template>
            </BasiqDialog>
            <BasiqButton class="sidebar-create" type="button" :icon="PlusIcon" icon-placement="leading" @click="navigate('/new')">講習会を作る</BasiqButton>
            <BasiqNavigationList class="account-navigation" aria-label="アカウント">
              <BasiqNavigationItem href="#/me" :current="route.name === 'me' || route.name === 'share'">
                <span class="account-row-content"><BasiqAvatar class="account-avatar" :src="traqUserIconUrl" name="rurun" alt="" size="sm" /><span><strong>rurun</strong><small>マイページ</small></span><span aria-hidden="true">›</span></span>
              </BasiqNavigationItem>
            </BasiqNavigationList>
          </div>
        </aside>

        <div class="workspace">
          <header class="mobile-header">
            <a class="mobile-brand" href="#/" aria-label="LeQtures ホーム"><svg class="brand-mark" viewBox="0 0 24 24" aria-hidden="true"><rect x="1" y="1" width="22" height="22" rx="5" fill="currentColor" /><circle cx="11.5" cy="11" r="5" fill="none" stroke="white" stroke-width="2.5" /><path d="M15 14.5 19 18.5" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round" /></svg><strong>LeQtures</strong></a>
          </header>
          <BasiqNavigationList class="mobile-nav" aria-label="モバイルナビゲーション">
            <BasiqNavigationItem href="#/" :current="route.name === 'home'"><span class="mobile-nav-content"><BasiqIcon class="mobile-nav-icon" :icon="HomeIcon" /><small>ホーム</small></span></BasiqNavigationItem>
            <BasiqNavigationItem href="#/search" :current="route.name === 'search' || route.name === 'detail'"><span class="mobile-nav-content"><BasiqIcon class="mobile-nav-icon" :icon="SearchIcon" /><small>探す</small></span></BasiqNavigationItem>
            <BasiqNavigationItem href="#/new" :current="route.name === 'create' || route.name === 'edit'"><span class="mobile-nav-content"><BasiqIcon class="mobile-nav-icon" :icon="PlusIcon" /><small>作る</small></span></BasiqNavigationItem>
            <BasiqNavigationItem href="#/drafts" :current="route.name === 'drafts'"><span class="mobile-nav-content"><BasiqIcon class="mobile-nav-icon" :icon="DraftIcon" /><small>下書き</small></span></BasiqNavigationItem>
            <BasiqNavigationItem href="#/me" :current="route.name === 'me' || route.name === 'share'"><span class="mobile-nav-content"><BasiqAvatar class="mobile-avatar" :src="traqUserIconUrl" name="rurun" alt="" :size="22" /><small>rurun</small></span></BasiqNavigationItem>
          </BasiqNavigationList>

          <main id="main-content" tabindex="-1">
            <template v-if="route.name === 'home'">
              <header class="page-header home-header home-welcome">
                <div><h1>ホーム</h1><p>気になる分野や最近の開催から、受けたい講習会を見つけられます。</p></div>
                <BasiqButton type="button" tone="neutral" variant="outline" @click="showAllWorkshops">講習会を探す</BasiqButton>
              </header>
              <div class="home-content">
                <section class="home-section" aria-labelledby="teams-title">
                  <div class="home-section-heading"><div><h2 id="teams-title">班から探す</h2><p>興味のある班・分野に絞って一覧を開きます。</p></div><BasiqButton type="button" tone="neutral" variant="outline" @click="showAllWorkshops">すべて見る</BasiqButton></div>
                  <BasiqNavigationList class="team-navigation" aria-label="班から探す">
                    <BasiqNavigationItem v-for="team in teamSummaries" :key="team.name" as-child><button type="button" class="team-option" @click="searchByTeam(team.name)"><span><strong>{{ team.name }}</strong><small>{{ team.count }}件の講習会</small></span><span aria-hidden="true">→</span></button></BasiqNavigationItem>
                  </BasiqNavigationList>
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
                    <div class="home-section-heading"><div><h2 id="random-title">ランダムに表示</h2><p>登録済みの講習会から3件を表示します。</p></div><BasiqButton type="button" tone="neutral" variant="outline" @click="refreshRandomWorkshops">入れ替える</BasiqButton></div>
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
                <aside class="search-area" aria-label="絞り込み">
                  <BasiqCard class="search-card" title="絞り込み">
                    <BasiqFormField label="キーワード" control-id="workshop-search">
                      <BasiqInput id="workshop-search" v-model="query" size="lg" type="search" placeholder="名前、分野、対象者" />
                    </BasiqFormField>
                    <div class="search-options">
                      <BasiqFormField label="班・分野" control-id="team-filter"><select id="team-filter" v-model="activeTeam"><option value="all">すべて</option><option v-for="team in teams" :key="team" :value="team">{{ team }}</option></select></BasiqFormField>
                      <BasiqCheckbox v-model="showAllYears">過去年度もすべて表示</BasiqCheckbox>
                    </div>
                    <div class="quick-filters">
                      <strong>教材の状態</strong>
                      <div class="quick-filter-buttons" aria-label="教材の状態で絞り込む">
                        <BasiqButton :tone="activeFilter === 'all' ? 'accent' : 'neutral'" :variant="activeFilter === 'all' ? 'solid' : 'outline'" :aria-pressed="activeFilter === 'all'" type="button" @click="activeFilter = 'all'">すべて</BasiqButton>
                        <BasiqButton :tone="activeFilter === 'learnable' ? 'accent' : 'neutral'" :variant="activeFilter === 'learnable' ? 'solid' : 'outline'" :aria-pressed="activeFilter === 'learnable'" type="button" @click="activeFilter = 'learnable'">今から受講できる</BasiqButton>
                        <BasiqButton :tone="activeFilter === 'material' ? 'accent' : 'neutral'" :variant="activeFilter === 'material' ? 'solid' : 'outline'" :aria-pressed="activeFilter === 'material'" type="button" @click="activeFilter = 'material'">資料あり</BasiqButton>
                        <BasiqButton :tone="activeFilter === 'video' ? 'accent' : 'neutral'" :variant="activeFilter === 'video' ? 'solid' : 'outline'" :aria-pressed="activeFilter === 'video'" type="button" @click="activeFilter = 'video'">動画あり</BasiqButton>
                        <BasiqButton :tone="activeFilter === 'record' ? 'accent' : 'neutral'" :variant="activeFilter === 'record' ? 'solid' : 'outline'" :aria-pressed="activeFilter === 'record'" type="button" @click="activeFilter = 'record'">記録のみ</BasiqButton>
                      </div>
                    </div>
                  </BasiqCard>
                </aside>
                <section class="catalog" aria-labelledby="catalog-title">
                  <div class="section-heading"><div><h2 id="catalog-title">検索結果</h2><p v-if="!showAllYears">対応する過去年度がある場合は、条件に合う最新のものを表示しています。</p></div><span aria-live="polite">{{ searchResults.length }}件</span></div>
                  <div v-if="searchResults.length" class="workshop-list-head" aria-hidden="true"><span>講習会</span><span>年度・班</span><span>開催枠・形式</span><span>教材</span><span></span></div>
                  <div v-if="searchResults.length" class="workshop-grid">
                    <div v-for="workshop in searchResults" :key="workshop.id" class="workshop-card">
                      <a class="workshop-card-link" :href="'#/workshops/' + workshop.id" :aria-label="workshop.title + 'の詳細を見る'">
                        <article>
                          <div class="card-meta"><span>{{ workshop.year }}年度</span><span v-if="workshop.team">{{ workshop.team }}</span></div>
                          <div class="card-copy"><h3>{{ workshop.title }}</h3><p>{{ workshop.summary || '概要はまだ登録されていません。' }}</p></div>
                          <dl><div><dt>対象</dt><dd>{{ workshop.audience || '未登録' }}</dd></div><div><dt>開催枠</dt><dd>{{ relationLabel(workshop.occurrences) }}</dd></div><div><dt>形式</dt><dd>{{ occurrenceModes(workshop) }}</dd></div></dl>
                          <div class="resource-tags">
                            <BasiqTag v-if="hasResource(workshop, 'material') || hasResource(workshop, 'practice')" label="資料あり" />
                            <BasiqTag v-if="hasResource(workshop, 'video')" label="動画あり" />
                            <BasiqTag v-if="!hasResource(workshop, 'material') && !hasResource(workshop, 'practice') && !hasResource(workshop, 'video')" label="記録のみ" />
                          </div>
                          <footer><strong>{{ availability(workshop) }}</strong><span class="card-detail"><span>詳細を見る</span><span aria-hidden="true"> →</span></span></footer>
                        </article>
                      </a>
                    </div>
                  </div>
                  <BasiqCard v-else class="empty-state"><strong>該当する講習会がありません</strong><p>キーワードや絞り込みを変えてください。</p><BasiqButton type="button" tone="neutral" variant="outline" @click="query = ''; activeTeam = 'all'; activeFilter = 'all'; showAllYears = false">条件をクリア</BasiqButton></BasiqCard>
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
              <BasiqCard v-if="selectedWorkshop.status === 'draft'" class="draft-notice"><strong>下書き</strong><span>作成者と共同編集者だけが閲覧できます。情報が揃っていなくても公開できます。</span></BasiqCard>
              <div class="detail-layout">
                <article class="detail-content">
                  <section id="overview" class="detail-section">
                    <h2>基本情報</h2>
                    <dl class="facts">
                      <div><dt>開催年度</dt><dd>{{ selectedWorkshop.year }}年度</dd></div>
                      <div><dt>運営元</dt><dd>{{ selectedWorkshop.team || '未登録' }}</dd></div>
                      <div><dt>運営メンバー</dt><dd>{{ selectedWorkshop.operators.length ? selectedWorkshop.operators.map(operatorLabel).join('、') : '未登録' }}</dd></div>
                      <div><dt>対象班</dt><dd>{{ selectedWorkshop.targetTeams.join('、') || '未登録' }}</dd></div>
                      <div><dt>0→1講習会</dt><dd>{{ selectedWorkshop.isZeroToOne === null ? '未登録' : selectedWorkshop.isZeroToOne ? 'はい' : 'いいえ' }}</dd></div>
                      <div><dt>講習会チャンネル</dt><dd>{{ selectedWorkshop.workshopChannel?.path || '未登録' }}</dd></div>
                    </dl>
                  </section>
                  <section id="audience" class="detail-section">
                    <h2>紹介</h2>
                    <dl class="stacked-facts">
                      <div v-if="selectedWorkshop.outcome"><dt>学べること</dt><dd>{{ selectedWorkshop.outcome }}</dd></div>
                      <div><dt>対象者</dt><dd>{{ selectedWorkshop.audience || '未登録' }}</dd></div>
                    </dl>
                  </section>
                  <section id="occurrences" class="detail-section">
                    <div class="section-title-row"><h2>開催枠</h2><span>{{ selectedWorkshop.occurrences.length }}件</span></div>
                    <p v-if="selectedWorkshop.occurrences.length" class="section-note">{{ relationLabel(selectedWorkshop.occurrences) }}</p>
                    <div v-if="selectedWorkshop.occurrences.length" class="occurrence-list">
                      <BasiqCard v-for="(occurrence, index) in selectedWorkshop.occurrences" :key="occurrence.id" class="occurrence-card">
                        <header><span class="occurrence-number">{{ index + 1 }}</span><div><h3>{{ occurrence.title || '名称未定の開催枠' }}</h3><p>{{ occurrence.description || '内容は未登録です。' }}</p></div><BasiqTag :label="occurrenceStatusLabel(occurrence.status)" /></header>
                        <dl>
                          <div><dt>日時</dt><dd>{{ formatDate(occurrence.date) }}<span v-if="formatOccurrenceTime(occurrence)"> {{ formatOccurrenceTime(occurrence) }}</span></dd></div>
                          <div><dt>開催形式</dt><dd>{{ modeLabel(occurrence.mode) }}</dd></div>
                          <div><dt>開催場所</dt><dd>{{ formatOccurrencePlace(occurrence) || '未登録' }}</dd></div>
                          <div><dt>講師</dt><dd>{{ instructorNames(occurrence) }}</dd></div>
                          <div><dt>knoQ</dt><dd><a v-if="occurrence.knoqUrl" :href="occurrence.knoqUrl" target="_blank" rel="noreferrer">knoQを開く ↗</a><span v-else>未登録</span></dd></div>
                        </dl>
                      </BasiqCard>
                    </div>
                    <BasiqCard v-else class="empty-inline">開催枠はまだ登録されていません。</BasiqCard>
                  </section>
                  <section id="resources" class="detail-section">
                    <div class="section-title-row"><h2>資料・動画・関連情報</h2><span>{{ selectedWorkshop.resources.length }}件</span></div>
                    <div v-if="selectedWorkshop.resources.length" class="resource-list">
                      <article v-for="resource in selectedWorkshop.resources" :key="resource.id"><BasiqTag :label="typeLabel[resource.type]" /><div><h3>{{ resource.title }}</h3><small v-if="resource.occurrenceId">{{ occurrenceTitle(resource.occurrenceId) }}</small><p v-if="resource.note">{{ resource.note }}</p></div><a v-if="resource.url" :href="resource.url" target="_blank" rel="noreferrer">開く ↗</a><span v-else class="unavailable">URL未登録</span></article>
                    </div>
                    <BasiqCard v-else class="empty-inline">資料・動画はまだ登録されていません。この講習会は記録として検索できます。</BasiqCard>
                  </section>
                  <section id="relations" class="detail-section">
                    <h2>関連する講習会</h2>
                    <dl class="stacked-facts public-relations">
                      <div>
                        <dt>前提とする講習会</dt>
                        <dd>
                          <span v-if="selectedWorkshop.prerequisites">{{ selectedWorkshop.prerequisites }}</span>
                          <template v-for="entry in publicRelationEntries(selectedWorkshop, 'prerequisite')" :key="entry.key">
                            <button v-if="entry.kind === 'workshop' && entry.workshopId" type="button" @click="openWorkshop(entry.workshopId)">{{ entry.label }}<small v-if="entry.meta">{{ entry.meta }}</small></button>
                            <span v-else>{{ entry.label }}</span>
                          </template>
                          <span v-if="!selectedWorkshop.prerequisites && !publicRelationEntries(selectedWorkshop, 'prerequisite').length">未登録</span>
                        </dd>
                      </div>
                      <div>
                        <dt>次におすすめの講習会</dt>
                        <dd>
                          <template v-for="entry in publicRelationEntries(selectedWorkshop, 'recommended')" :key="entry.key">
                            <button v-if="entry.kind === 'workshop' && entry.workshopId" type="button" @click="openWorkshop(entry.workshopId)">{{ entry.label }}<small v-if="entry.meta">{{ entry.meta }}</small></button>
                            <span v-else>{{ entry.label }}</span>
                          </template>
                          <span v-if="!publicRelationEntries(selectedWorkshop, 'recommended').length">未登録</span>
                        </dd>
                      </div>
                    </dl>
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
                    <BasiqCard v-else class="empty-inline">引き継ぎ関係はまだ登録されていません。</BasiqCard>
                    <dl v-if="selectedWorkshop.previousTextRefs.length" class="stacked-facts lineage-notes"><div><dt>対応関係のメモ</dt><dd><span v-for="entry in selectedWorkshop.previousTextRefs" :key="entry.kind === 'text' ? entry.text : entry.workshopId">{{ entry.kind === 'text' ? entry.text : '' }}</span></dd></div></dl>
                  </section>
                  <section id="retrospective" class="detail-section">
                    <h2>振り返り・引き継ぎ</h2>
                    <a v-if="selectedWorkshop.reflectionUrl" :href="selectedWorkshop.reflectionUrl" target="_blank" rel="noreferrer">振り返り・引き継ぎ資料を開く ↗</a>
                    <BasiqCard v-else class="empty-inline">振り返り・引き継ぎ資料はまだ登録されていません。</BasiqCard>
                  </section>
                  <section id="management" class="detail-section"><h2>更新情報</h2><dl class="stacked-facts"><div><dt>作成・編集</dt><dd>{{ selectedWorkshop.creators.join('、') || '移行元では未確認' }}</dd></div><div><dt>情報源</dt><dd><a v-if="selectedWorkshop.sourceUrl" :href="selectedWorkshop.sourceUrl" target="_blank" rel="noreferrer">{{ selectedWorkshop.sourceLabel || '元のページを開く' }} ↗</a><span v-else>このサービスで新規作成</span></dd></div></dl><details v-if="selectedWorkshop.revisions.length" class="history"><summary>編集履歴（{{ selectedWorkshop.revisions.length }}件）</summary><ol><li v-for="revision in selectedWorkshop.revisions" :key="revision.at + revision.summary"><span>{{ revision.at }}</span><strong>{{ revision.summary }}</strong><small>{{ revision.by }}</small></li></ol></details><BasiqCard v-else class="empty-inline">このサービス上での編集履歴はまだありません。</BasiqCard></section>
                  <section class="completion-panel"><div><h2>受講記録</h2><p>この講習会を受講したら、講習会全体を受講完了として記録します。</p></div><BasiqButton v-if="!completedAt[selectedWorkshop.id]" type="button" @click="toggleCompletion(selectedWorkshop)">この講習会を受講完了</BasiqButton><div v-else class="completed-action"><strong>✓ {{ completionDate(selectedWorkshop.id) }}に完了</strong><BasiqButton type="button" tone="danger" variant="outline" @click="toggleCompletion(selectedWorkshop)">取り消す</BasiqButton></div></section>
                </article>
                <aside class="detail-index">
                  <BasiqNavigationList aria-label="このページの項目">
                    <BasiqNavigationItem as-child><button type="button" @click="scrollToSection('overview')">基本情報</button></BasiqNavigationItem>
                    <BasiqNavigationItem as-child><button type="button" @click="scrollToSection('audience')">紹介</button></BasiqNavigationItem>
                    <BasiqNavigationItem as-child><button type="button" @click="scrollToSection('occurrences')">開催枠</button></BasiqNavigationItem>
                    <BasiqNavigationItem as-child><button type="button" @click="scrollToSection('resources')">資料・動画</button></BasiqNavigationItem>
                    <BasiqNavigationItem as-child><button type="button" @click="scrollToSection('relations')">関連する講習会</button></BasiqNavigationItem>
                    <BasiqNavigationItem as-child><button type="button" @click="scrollToSection('lineage')">引き継ぎ</button></BasiqNavigationItem>
                    <BasiqNavigationItem as-child><button type="button" @click="scrollToSection('retrospective')">振り返り・引き継ぎ</button></BasiqNavigationItem>
                    <BasiqNavigationItem as-child><button type="button" @click="scrollToSection('management')">更新情報</button></BasiqNavigationItem>
                  </BasiqNavigationList>
                  <BasiqTag :label="availability(selectedWorkshop)" />
                </aside>
              </div>
            </template>

            <template v-else-if="route.name === 'create'">
              <header class="page-header"><div><h1>講習会を作る</h1><p>過去の講習会を引き継ぐと、共通する情報や資料を参考にしながら準備できます。</p></div><BasiqButton type="button" tone="neutral" variant="outline" @click="startBlank">白紙から作る</BasiqButton></header>
              <BasiqCard class="create-search"><BasiqFormField label="引き継ぐ講習会を探す" control-id="creation-search"><BasiqInput id="creation-search" v-model="creationQuery" type="search" size="lg" placeholder="講習会名、分野" /></BasiqFormField></BasiqCard>
              <section class="create-list"><h2>過去の講習会から作る</h2><p>名前、紹介、対象、関連する講習会、開催枠の構成を引き継ぎます。日時・講師・場所・knoQ・資料URLは空になります。</p><div v-if="creationResults.length" class="inherit-list"><article v-for="workshop in creationResults" :key="workshop.id"><div class="card-meta"><span>{{ workshop.year }}年度</span><span v-if="workshop.team">{{ workshop.team }}</span></div><div><h3>{{ workshop.title }}</h3><p>{{ workshop.summary }}</p></div><div class="inherit-resources"><span>{{ availability(workshop) }}</span><small>対応する過去版 {{ Math.max(0, workshops.filter(w => w.lineageId === workshop.lineageId).length - 1) }}件</small></div><BasiqButton type="button" tone="neutral" variant="outline" @click="startFromWorkshop(workshop)">引き継いで作る</BasiqButton></article></div><BasiqCard v-else class="empty-state"><strong>該当する講習会がありません</strong><p>講習会名や分野を変えてください。</p></BasiqCard></section>
            </template>

            <template v-else-if="route.name === 'edit'">
              <header class="editor-header"><div><button class="back-button" type="button" @click="navigate(editorDraft.status === 'public' ? '/workshops/' + editorDraft.id : '/drafts')">← {{ editorDraft.status === 'public' ? '講習会へ' : '下書きへ' }}</button><span class="editor-status" :class="{ public: editorDraft.status === 'public' }">{{ editorDraft.status === 'draft' ? '下書き' : '公開中' }}</span><h1>{{ editorDraft.title || '名称未定の講習会' }}</h1></div><div class="header-actions"><BasiqButton type="button" tone="neutral" variant="outline" @click="saveDraft">{{ editorDraft.status === 'public' ? '変更を保存' : '下書きを保存' }}</BasiqButton><BasiqButton v-if="editorDraft.status === 'draft'" type="button" @click="publishDraft">今の内容で公開</BasiqButton></div></header>
              <BasiqTabsRoot class="editor-step-tabs" :model-value="String(editorStep)" orientation="horizontal" activation-mode="manual" @update:model-value="setEditorStep(Number($event))">
                <div class="editor-step-tabs-wrap">
                  <BasiqTabsList class="editor-step-list" aria-label="講習会作成の手順">
                    <BasiqTabsTrigger v-for="(section, index) in editorSections" :key="section.key" class="editor-step-trigger" :value="String(index)">
                      <span class="editor-step-number">Step {{ index + 1 }}</span>
                      <strong class="editor-step-label">{{ section.label }}</strong>
                    </BasiqTabsTrigger>
                  </BasiqTabsList>
                </div>
                <BasiqTabsContent v-for="(_, tabIndex) in editorSections" :key="'editor-panel-' + tabIndex" class="editor-step-content" :value="String(tabIndex)">
                  <div v-if="editorStep === tabIndex" class="editor-layout">
                <aside class="editor-navigation">
                  <div class="editor-toc">
                    <BasiqNavigationList class="editor-toc-list" :aria-label="editorSections[editorStep].label + 'の項目'">
                      <BasiqNavigationItem v-for="(section, index) in editorNavigationSections" :key="section.id" as-child :current="activeEditorSection === section.id">
                        <button type="button" @click="scrollToEditorSection(section.id)"><span class="toc-number">{{ index + 1 }}</span><strong>{{ section.label }}</strong><em v-if="section.done" aria-label="入力済み">✓</em></button>
                      </BasiqNavigationItem>
                    </BasiqNavigationList>
                    <div v-if="editorStep === 1" class="editor-toc-action"><BasiqButton type="button" tone="neutral" variant="outline" @click="addOccurrence">開催枠を追加</BasiqButton></div>
                  </div>
                </aside>
                <section class="editor-form">
                  <template v-if="editorStep === 0">
                    <header class="editor-step-heading"><h2>基本情報を設定しよう。</h2></header>
                    <section id="basic-name" class="editor-subsection">
                      <div class="subsection-heading"><span class="subsection-number" aria-hidden="true">1</span><h3>講習会の名前を決めよう</h3></div>
                      <div class="form-grid">
                        <BasiqFormField class="full" label="講習会名" control-id="workshop-title"><BasiqInput id="workshop-title" v-model="editorDraft.title" :placeholder="makeRandomWorkshopTitle(editorDraft.id)" /></BasiqFormField>
                        <BasiqFormField v-slot="{ id, describedBy, invalid, required }" label="開催年度" description="4月始まりの年度" control-id="workshop-year"><input :id="id" v-model.number="editorDraft.year" class="native-control" type="number" min="2000" max="2100" :aria-describedby="describedBy" :aria-invalid="invalid ? 'true' : undefined" :required="required"></BasiqFormField>
                      </div>
                    </section>

                    <section id="basic-operations" class="editor-subsection">
                      <div class="subsection-heading"><span class="subsection-number" aria-hidden="true">2</span><h3>講習会の運営を決めよう</h3></div>
                      <div class="field-stack">
                        <p class="field-question">この講習会を主導しているのはどのグループですか？</p>
                        <BasiqRadioGroup v-model="editorDraft.team" class="compact-radio-group" label="運営元" name="organizer-source" orientation="horizontal" :items="organizerSources" />
                        <BasiqFormField class="full" label="運営メンバー" description="traQのユーザーまたはグループを複数選択できます">
                          <div class="operator-picker">
                            <BasiqInput v-model="operatorQuery" type="search" placeholder="traQ IDまたはグループを入力" @focus="loadTraqDirectory" @keydown.enter="addFirstOperatorSuggestion" />
                            <div v-if="operatorQuery.trim()" class="suggestion-list operator-suggestions" role="listbox" aria-label="運営候補">
                              <button v-for="candidate in operatorSuggestions" :key="candidate.kind + candidate.id" type="button" role="option" @click="addOperator(candidate)">
                                <BasiqAvatar v-if="candidate.kind === 'user'" class="candidate-avatar" :src="operatorAvatar(candidate)" :name="candidate.name" alt="" shape="circle" :size="28" referrerpolicy="no-referrer" />
                                <span><strong>{{ candidate.label }}</strong><small v-if="candidate.detail">{{ candidate.detail }}</small></span>
                                <em>追加</em>
                              </button>
                              <p v-if="!operatorSuggestions.length">一致する候補がありません。</p>
                            </div>
                          </div>
                          <div v-if="editorDraft.operators.length" class="selected-tags">
                            <BasiqTag v-for="operator in editorDraft.operators" :key="operator.kind + operator.id" :label="operatorTagLabel(operator)" :removable="true" :remove-label="operatorLabel(operator) + 'を削除'" @remove="removeOperator(operator.id)" />
                          </div>
                        </BasiqFormField>
                      </div>
                    </section>

                    <section id="basic-introduction" class="editor-subsection">
                      <div class="subsection-heading"><span class="subsection-number" aria-hidden="true">3</span><h3>講習会の紹介を考えよう</h3></div>
                      <div class="form-grid">
                        <BasiqFormField class="full" label="説明" description="この講習会ではどんなことを扱いますか？ この講習会のゴールはなんですか？"><BasiqTextarea v-model="editorDraft.summary" :rows="4" /></BasiqFormField>
                        <BasiqFormField class="full" label="対象者" description="この講習会はどんな人を対象にしていますか？"><BasiqInput v-model="editorDraft.audience" /></BasiqFormField>
                        <fieldset class="compact-checkbox-field">
                          <legend>対象班</legend>
                          <p>この講習会を特に受講してほしいのはどの班の人ですか？</p>
                          <div class="basiq-check-grid"><BasiqCheckbox v-for="(team, index) in trapTeams" :id="'target-team-' + index" :key="team" :model-value="editorDraft.targetTeams.includes(team)" name="target-teams" @update:model-value="setTargetTeam(team, $event)">{{ team }}</BasiqCheckbox></div>
                        </fieldset>
                        <div class="full inline-switch"><BasiqSwitch v-model="zeroToOneEnabled">0→1講習会として設定する</BasiqSwitch></div>
                        <BasiqFormField class="full" label="講習会のチャンネル">
                          <div class="channel-picker">
                            <BasiqInput v-model="channelQuery" type="search" placeholder="traQのチャンネルを入力" @focus="loadTraqDirectory" @keydown.enter="addFirstChannelSuggestion" />
                            <div v-if="channelQuery.trim()" class="suggestion-list channel-suggestions" role="listbox" aria-label="traQチャンネル候補">
                              <button v-for="channel in channelSuggestions" :key="channel.id" type="button" role="option" @click="selectWorkshopChannel(channel)"><span><strong>{{ channel.path }}</strong></span><em>選択</em></button>
                              <p v-if="!channelSuggestions.length">一致する候補がありません。</p>
                            </div>
                          </div>
                          <div v-if="editorDraft.workshopChannel" class="selected-tags"><BasiqTag :label="editorDraft.workshopChannel.path" :removable="true" :remove-label="editorDraft.workshopChannel.path + 'を削除'" @remove="clearWorkshopChannel" /></div>
                        </BasiqFormField>
                      </div>
                    </section>

                    <section id="basic-relations" class="editor-subsection">
                      <div class="subsection-heading"><span class="subsection-number" aria-hidden="true">4</span><h3>関連する講習会を設定しよう</h3></div>
                      <div class="relation-editors">
                        <section v-for="relation in relationSections" :key="relation.kind" class="relation-editor">
                          <header><h4>{{ relation.label }}</h4><p>{{ relation.kind === 'previous' ? '内容が対応している最も直近の講習会はどれですか？' : relation.kind === 'prerequisite' ? 'この講習会の受講者に受けておいてほしい講習会はどれですか？' : 'この講習会の次に、ぜひ受けてほしい講習会はどれですか？' }}</p></header>
                          <div class="relation-picker">
                            <BasiqInput :model-value="relationQuery[relation.kind]" type="search" placeholder="講習会名を入力" @update:model-value="setRelationQuery(relation.kind, $event)" />
                            <div v-if="relationQuery[relation.kind].trim()" class="suggestion-list relation-suggestions">
                              <button v-for="candidate in relationCandidates(relation.kind)" :key="candidate.id" type="button" @click="addRelationWorkshop(relation.kind, candidate)"><span class="workshop-suggestion-year">{{ candidate.year }}</span><span><strong>{{ candidate.title }}</strong><small>{{ candidate.team || '運営元未登録' }}</small></span><em>選択</em></button>
                              <button class="free-text-suggestion" type="button" @click="addRelationText(relation.kind)"><span class="text-avatar" aria-hidden="true">文</span><span><strong>「{{ relationQuery[relation.kind].trim() }}」をそのまま追加</strong><small>自由テキストとして保存し、あとから候補を検索できます</small></span><em>追加</em></button>
                            </div>
                          </div>
                          <div v-if="relationEntries(relation.kind).length" class="relation-selections">
                            <article v-for="entry in relationEntries(relation.kind)" :key="entry.key"><span class="relation-entry-type">{{ entry.kind === 'workshop' ? '講習会' : '自由入力' }}</span><span><strong>{{ entry.label }}</strong><small>{{ entry.meta }}</small></span><BasiqButton v-if="entry.kind === 'text' && entry.text" type="button" tone="neutral" variant="outline" @click="searchRelationText(relation.kind, entry.text)">候補を検索</BasiqButton><BasiqButton type="button" tone="danger" variant="outline" :aria-label="entry.label + 'を削除'" @click="removeRelationEntry(relation.kind, entry)">×</BasiqButton></article>
                          </div>
                        </section>
                      </div>
                    </section>
                  </template>
                  <template v-else-if="editorStep === 1">
                    <header class="editor-step-heading"><h2>開催枠を設定しよう。</h2></header>
                    <section v-for="(occurrence, index) in editorDraft.occurrences" :id="'occurrence-slot-' + occurrence.id" :key="occurrence.id" class="occurrence-editor">
                      <div class="occurrence-editor-title"><h3>{{ occurrence.title.trim() || ('開催枠 ' + (index + 1)) }}</h3><BasiqButton v-if="editorDraft.occurrences.length > 1" type="button" tone="danger" variant="outline" @click="removeOccurrence(index)">削除</BasiqButton></div>
                      <div class="occurrence-fields">
                        <BasiqFormField label="タイトル" description="「第1回」「Web編」など"><BasiqInput v-model="occurrence.title" /></BasiqFormField>
                        <BasiqFormField label="内容" description="この開催枠ではどんな内容を扱いますか？ ゴールはなんですか？"><BasiqTextarea v-model="occurrence.description" :rows="4" /></BasiqFormField>
                        <BasiqFormField label="講師" description="traQ IDを複数選択できます">
                          <div class="lecturer-picker" @focusout="closeLecturerSuggestions">
                            <BasiqInput :model-value="lecturerQuery[occurrence.id] ?? ''" type="search" placeholder="traQ IDを入力" role="combobox" :aria-expanded="activeLecturerId === occurrence.id && Boolean((lecturerQuery[occurrence.id] ?? '').trim())" @focus="activeLecturerId = occurrence.id; loadTraqDirectory()" @update:model-value="setLecturerQuery(occurrence, $event)" @keydown.enter="addFirstLecturerSuggestion($event, occurrence)" @keydown.esc="activeLecturerId = ''" />
                            <div v-if="activeLecturerId === occurrence.id && (lecturerQuery[occurrence.id] ?? '').trim()" class="suggestion-list operator-suggestions" role="listbox" aria-label="講師候補">
                              <button v-for="candidate in lecturerSuggestions(occurrence)" :key="candidate.id" type="button" role="option" @click="selectLecturer(occurrence, candidate)">
                                <BasiqAvatar class="candidate-avatar" :src="operatorAvatar(candidate)" :name="candidate.name" alt="" shape="circle" :size="28" referrerpolicy="no-referrer" />
                                <span><strong>{{ candidate.label }}</strong><small v-if="candidate.detail">{{ candidate.detail }}</small></span>
                                <em>追加</em>
                              </button>
                              <p v-if="!lecturerSuggestions(occurrence).length">一致する候補がありません。</p>
                            </div>
                          </div>
                          <div v-if="occurrence.instructors.length" class="selected-tags"><BasiqTag v-for="instructor in occurrence.instructors" :key="instructor.id" :label="operatorLabel(instructor)" :removable="true" :remove-label="operatorLabel(instructor) + 'を削除'" @remove="removeLecturer(occurrence, instructor.id)" /></div>
                        </BasiqFormField>
                        <BasiqRadioGroup :model-value="occurrence.mode === 'undecided' ? null : occurrence.mode" class="compact-radio-group" label="開催形式" :name="'occurrence-mode-' + occurrence.id" orientation="horizontal" :items="occurrenceFormats" @update:model-value="setOccurrenceMode(occurrence, $event)" />
                        <div class="occurrence-time-fields">
                          <BasiqFormField v-slot="{ id, describedBy, invalid, required }" label="日付" :control-id="'occurrence-date-' + occurrence.id"><input :id="id" v-model="occurrence.date" class="native-control" type="date" :aria-describedby="describedBy" :aria-invalid="invalid ? 'true' : undefined" :required="required"></BasiqFormField>
                          <BasiqFormField v-slot="{ id, describedBy, invalid, required }" label="開始時刻" :control-id="'occurrence-start-' + occurrence.id"><input :id="id" v-model="occurrence.startTime" class="native-control" type="time" :aria-describedby="describedBy" :aria-invalid="invalid ? 'true' : undefined" :required="required"></BasiqFormField>
                          <BasiqFormField v-slot="{ id, describedBy, invalid, required }" label="終了時刻" :control-id="'occurrence-end-' + occurrence.id"><input :id="id" v-model="occurrence.endTime" class="native-control" type="time" :aria-describedby="describedBy" :aria-invalid="invalid ? 'true' : undefined" :required="required"></BasiqFormField>
                        </div>
                      </div>
                    </section>
                  </template>
                  <template v-else-if="editorStep === 2">
                    <header class="editor-step-heading"><h2>講習会を行うための準備をしよう。</h2></header>
                    <section id="preparation-admin" class="editor-subsection">
                      <div class="subsection-heading"><span class="subsection-number" aria-hidden="true">1</span><h3>庶務に連絡しよう</h3></div>
                      <div class="inline-switch"><BasiqSwitch v-model="editorDraft.requestSetup">講習会の設営を庶務に依頼する</BasiqSwitch></div>
                      <BasiqCard v-if="editorDraft.requestSetup" class="copy-panel">
                        <BasiqTextarea aria-label="庶務への依頼文" :model-value="generatedSetupRequest" :rows="8" readonly />
                        <BasiqButton type="button" tone="neutral" variant="outline" @click="copyText(generatedSetupRequest, '依頼文をコピーしました')">依頼文をコピー</BasiqButton>
                      </BasiqCard>
                    </section>

                    <section id="preparation-place" class="editor-subsection">
                      <div class="subsection-heading"><span class="subsection-number" aria-hidden="true">2</span><h3>開催場所を決めよう</h3></div>
                      <p class="section-help">講義室が必要な場合は、庶務に依頼して予約してもらおう。</p>
                      <div class="preparation-card-list">
                        <BasiqCard v-for="occurrence in editorDraft.occurrences" :key="occurrence.id" class="preparation-card">
                          <div class="preparation-card-heading"><h4>{{ occurrence.title || '名称未定の開催枠' }}</h4><BasiqTag :label="modeLabel(occurrence.mode)" /></div>
                          <div v-if="occurrence.mode === 'online' || occurrence.mode === 'hybrid'" class="venue-fields">
                            <BasiqRadioGroup :model-value="occurrence.onlinePlatform || null" class="compact-radio-group" label="オンラインの開催場所" :name="'online-platform-' + occurrence.id" orientation="horizontal" :items="onlinePlatforms" @update:model-value="setOnlinePlatform(occurrence, $event)" />
                            <BasiqFormField :label="occurrence.onlinePlatform === 'other' ? 'URLなど' : 'チャンネル名'"><BasiqInput v-model="occurrence.onlineLocation" :placeholder="occurrence.onlinePlatform === 'other' ? 'URLなどを入力' : 'チャンネル名を入力'" /></BasiqFormField>
                          </div>
                          <BasiqFormField v-if="occurrence.mode === 'offline' || occurrence.mode === 'hybrid'" label="講義室"><BasiqInput v-model="occurrence.offlineLocation" list="science-tokyo-rooms" placeholder="講義室名または自由入力" /></BasiqFormField>
                        </BasiqCard>
                      </div>
                      <datalist id="science-tokyo-rooms"><option v-for="room in scienceTokyoRooms" :key="room" :value="room"></option></datalist>
                    </section>

                    <section id="preparation-stream" class="editor-subsection">
                      <div class="subsection-heading"><span class="subsection-number" aria-hidden="true">3</span><h3>配信を観られるようにしよう</h3></div>
                      <div class="preparation-card-list">
                        <BasiqCard v-for="occurrence in editorDraft.occurrences" :key="occurrence.id" class="preparation-card">
                          <div class="preparation-card-heading"><h4>{{ occurrence.title || '名称未定の開催枠' }}</h4><BasiqButton type="button" tone="neutral" variant="outline" @click="addResource('video', occurrence.id)">配信・動画を追加</BasiqButton></div>
                          <div v-for="resource in resourcesFor('video', occurrence.id)" :key="resource.id" class="link-editor-row">
                            <BasiqFormField label="名前"><BasiqInput v-model="resource.title" /></BasiqFormField>
                            <BasiqFormField label="URL"><BasiqInput :model-value="resource.url ?? ''" type="url" placeholder="https://..." @update:model-value="resource.url = $event || null" /></BasiqFormField>
                            <BasiqButton type="button" tone="danger" variant="outline" :aria-label="resource.title + 'を削除'" @click="removeResource(resource.id)">削除</BasiqButton>
                          </div>
                        </BasiqCard>
                      </div>
                    </section>

                    <section id="preparation-knoq" class="editor-subsection">
                      <div class="subsection-heading"><span class="subsection-number" aria-hidden="true">4</span><h3>knoQに登録しよう</h3></div>
                      <div class="preparation-card-list">
                        <BasiqCard v-for="occurrence in editorDraft.occurrences" :key="occurrence.id" class="preparation-card">
                          <div class="preparation-card-heading"><h4>{{ occurrence.title || '名称未定の開催枠' }}</h4><BasiqButton type="button" tone="neutral" variant="outline" @click="copyText(generatedKnoq(occurrence), 'knoQ本文をコピーしました')">本文をコピー</BasiqButton></div>
                          <BasiqTextarea aria-label="knoQ本文" :model-value="generatedKnoq(occurrence)" :rows="7" readonly />
                          <BasiqFormField label="登録したknoQのリンク"><BasiqInput v-model="occurrence.knoqUrl" type="url" placeholder="https://knoq.trap.jp/events/..." /></BasiqFormField>
                        </BasiqCard>
                      </div>
                    </section>
                  </template>

                  <template v-else-if="editorStep === 3">
                    <header class="editor-step-heading"><h2>資料のリンクを設定しよう。</h2></header>
                    <BasiqCard v-if="sourceWorkshop" class="reference-resources"><strong>前年度の資料</strong><a v-for="resource in sourceWorkshop.resources.filter(resource => resource.url)" :key="resource.id" :href="resource.url" target="_blank" rel="noreferrer"><span>{{ typeLabel[resource.type] }}</span>{{ resource.title }} ↗</a></BasiqCard>
                    <section id="materials-common" class="editor-subsection">
                      <div class="subsection-heading"><span class="subsection-number" aria-hidden="true">1</span><h3>講習会全体の資料</h3></div>
                      <div class="material-heading-action"><BasiqButton type="button" tone="neutral" variant="outline" @click="addResource('material')">資料を追加</BasiqButton></div>
                      <div v-for="resource in resourcesFor('material')" :key="resource.id" class="link-editor-row">
                        <BasiqFormField label="名前"><BasiqInput v-model="resource.title" /></BasiqFormField>
                        <BasiqFormField label="URL"><BasiqInput :model-value="resource.url ?? ''" type="url" placeholder="https://..." @update:model-value="resource.url = $event || null" /></BasiqFormField>
                        <BasiqButton type="button" tone="danger" variant="outline" :aria-label="resource.title + 'を削除'" @click="removeResource(resource.id)">削除</BasiqButton>
                      </div>
                    </section>
                    <section v-for="(occurrence, index) in editorDraft.occurrences" :id="'materials-' + occurrence.id" :key="occurrence.id" class="editor-subsection">
                      <div class="subsection-heading"><span class="subsection-number" aria-hidden="true">{{ index + 2 }}</span><h3>{{ occurrence.title || '名称未定の開催枠' }}の資料</h3></div>
                      <div class="material-heading-action"><BasiqButton type="button" tone="neutral" variant="outline" @click="addResource('material', occurrence.id)">資料を追加</BasiqButton></div>
                      <div v-for="resource in resourcesFor('material', occurrence.id)" :key="resource.id" class="link-editor-row">
                        <BasiqFormField label="名前"><BasiqInput v-model="resource.title" /></BasiqFormField>
                        <BasiqFormField label="URL"><BasiqInput :model-value="resource.url ?? ''" type="url" placeholder="https://..." @update:model-value="resource.url = $event || null" /></BasiqFormField>
                        <BasiqButton type="button" tone="danger" variant="outline" :aria-label="resource.title + 'を削除'" @click="removeResource(resource.id)">削除</BasiqButton>
                      </div>
                    </section>
                  </template>

                  <template v-else-if="editorStep === 4">
                    <header class="editor-step-heading"><h2>講習会を告知しよう。</h2></header>
                    <section id="announcement-event" class="editor-subsection">
                      <div class="subsection-heading"><span class="subsection-number" aria-hidden="true">1</span><h3>#event/workshopチャンネルで告知しよう</h3></div>
                      <div class="copy-panel"><BasiqTextarea aria-label="#event/workshop向け告知文" :model-value="generatedEventAnnouncement" :rows="10" readonly /><BasiqButton type="button" tone="neutral" variant="outline" @click="copyText(generatedEventAnnouncement, '告知文をコピーしました')">告知文をコピー</BasiqButton></div>
                    </section>
                    <section id="announcement-channel" class="editor-subsection">
                      <div class="subsection-heading"><span class="subsection-number" aria-hidden="true">2</span><h3>{{ editorDraft.workshopChannel?.path || '講習会チャンネル' }}で告知しよう</h3></div>
                      <div class="copy-panel"><BasiqTextarea aria-label="講習会チャンネル向け告知文" :model-value="generatedChannelAnnouncement" :rows="10" readonly /><BasiqButton type="button" tone="neutral" variant="outline" @click="copyText(generatedChannelAnnouncement, '告知文をコピーしました')">告知文をコピー</BasiqButton></div>
                    </section>
                    <section id="announcement-reminders" class="editor-subsection">
                      <div class="subsection-heading"><span class="subsection-number" aria-hidden="true">3</span><h3>直前のリマインドを打とう</h3></div>
                      <div class="preparation-card-list"><BasiqCard v-for="occurrence in editorDraft.occurrences" :key="occurrence.id" class="copy-panel"><h4>{{ occurrence.title || '名称未定の開催枠' }}</h4><BasiqTextarea :aria-label="occurrence.title + 'のリマインド文'" :model-value="generatedReminder(occurrence)" :rows="6" readonly /><BasiqButton type="button" tone="neutral" variant="outline" @click="copyText(generatedReminder(occurrence), 'リマインドをコピーしました')">リマインドをコピー</BasiqButton></BasiqCard></div>
                    </section>
                  </template>

                  <template v-else>
                    <header class="editor-step-heading"><h2>振り返りを残そう。</h2></header>
                    <section id="retrospective-record" class="editor-subsection">
                      <div class="subsection-heading"><span class="subsection-number" aria-hidden="true">1</span><h3>反省点や引き継ぎ事項をWikiやMDに残しておこう</h3></div>
                      <BasiqFormField label="振り返り・引き継ぎ資料のリンク"><BasiqInput v-model="editorDraft.reflectionUrl" type="url" placeholder="https://wiki.trap.jp/... または https://md.trap.jp/..." /></BasiqFormField>
                    </section>
                  </template>
                </section>
                  </div>
                </BasiqTabsContent>
              </BasiqTabsRoot>
            </template>

            <template v-else-if="route.name === 'drafts'">
              <header class="page-header"><div><h1>自分の下書き</h1><p>下書きは作成者と共同編集者だけが閲覧できます。</p></div><BasiqButton type="button" @click="navigate('/new')">講習会を作る</BasiqButton></header>
              <section class="draft-list" v-if="drafts.length"><BasiqCard v-for="draft in drafts" :key="draft.id" class="draft-card"><div class="draft-card-content"><div><div class="card-meta"><span>下書き</span><span>{{ draft.year }}年度</span></div><h2>{{ draft.title || '名称未定の講習会' }}</h2><p>{{ draft.summary || '概要はまだ入力されていません。' }}</p></div><BasiqButton type="button" tone="neutral" variant="outline" @click="editWorkshop(draft)">続きを編集</BasiqButton></div></BasiqCard></section>
              <BasiqCard v-else class="empty-state page-empty"><strong>下書きはありません</strong><p>過去の講習会を引き継ぐか、白紙から作成できます。</p><BasiqButton type="button" @click="navigate('/new')">講習会を作る</BasiqButton></BasiqCard>
            </template>

            <template v-else-if="route.name === 'me'">
              <header class="page-header profile-heading"><div><BasiqAvatar class="profile-avatar" :src="traqUserIconUrl" name="rurun" alt="" size="lg" /><div><h1>rurun のマイページ</h1><p>受講履歴と、獲得したバッジを確認できます。</p></div></div></header>
              <BasiqCard class="privacy-setting"><div class="privacy-setting-content"><div><h2>traP内プロフィールでバッジを公開</h2><p>初期状態は非公開です。</p></div><BasiqSwitch v-model="profileVisible" aria-label="バッジをtraP内プロフィールで公開" /></div></BasiqCard>
              <section class="badge-section"><div class="section-heading"><div><h2>獲得したバッジ</h2><p>講習会を受講完了すると追加されます。</p></div><span>{{ completedWorkshops.length }}個</span></div><div v-if="completedWorkshops.length" class="badge-grid"><BasiqCard v-for="workshop in completedWorkshops" :key="workshop.id" class="badge-card"><div class="badge-card-content"><div class="badge-medal"><span>{{ badgeLabel(workshop) }}</span><small>{{ workshop.year }}</small></div><div><h3>{{ workshop.title }}</h3><p>{{ completionDate(workshop.id) }}に受講完了</p></div><BasiqButton type="button" tone="neutral" variant="outline" @click="shareBadge(workshop)">このバッジを共有</BasiqButton></div></BasiqCard></div><BasiqCard v-else class="empty-state"><strong>まだバッジはありません</strong><p>講習会ページから受講完了を記録してください。</p><BasiqButton type="button" tone="neutral" variant="outline" @click="navigate('/search')">講習会を探す</BasiqButton></BasiqCard></section>
            </template>

            <template v-else-if="route.name === 'share' && selectedWorkshop && completedAt[selectedWorkshop.id]">
              <header class="page-header"><div><button class="back-button" type="button" @click="navigate('/me')">← マイページ</button><h1>バッジを共有</h1><p>他の受講履歴は含めず、このバッジだけを共有します。</p></div></header>
              <section class="share-card-wrap"><BasiqCard class="share-card"><div class="share-card-content"><p>LeQtures</p><div class="badge-medal large"><span>{{ badgeLabel(selectedWorkshop) }}</span><small>{{ selectedWorkshop.year }}</small></div><h2>{{ selectedWorkshop.title }}</h2><p>{{ completionDate(selectedWorkshop.id) }}に受講しました</p><small>@rurun</small></div></BasiqCard><BasiqCard class="share-controls"><div class="share-controls-content"><h2>共有する内容</h2><BasiqTextarea aria-label="バッジの共有文" :model-value="shareText(selectedWorkshop)" :rows="3" readonly /><BasiqButton type="button" @click="copyText(shareText(selectedWorkshop), '共有文をコピーしました')">共有文をコピー</BasiqButton><p>traQやSNSへの投稿は自動では行いません。</p></div></BasiqCard></section>
            </template>

            <BasiqCard v-else class="empty-state not-found"><strong>ページが見つかりません</strong><BasiqButton type="button" @click="navigate('/')">ホームへ戻る</BasiqButton></BasiqCard>
          </main>
        </div>
      </div>
      <div v-if="toast" class="toast" role="status">{{ toast }}</div>
    </BasiqThemeProvider>
  `,
});
