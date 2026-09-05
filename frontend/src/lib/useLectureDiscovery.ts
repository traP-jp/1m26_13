import { onBeforeUnmount, onMounted, ref } from "vue";

import {
  getDirectory,
  listFields,
  listLectures,
  type Directory,
  type Field,
  type Lecture,
} from "@/api/resources";
import { loadOptional } from "@/lib/optionalLoad";

export function useLectureDiscovery() {
  const lectures = ref<Lecture[]>([]);
  const directory = ref<Directory>({ users: [], groups: [] });
  const fields = ref<Field[]>([]);
  const loading = ref(true);
  const error = ref("");
  const metadataError = ref("");
  const now = ref(Date.now());
  let timer: ReturnType<typeof setInterval> | undefined;

  async function load() {
    loading.value = true;
    error.value = "";
    try {
      const [items, directoryResult, fieldResult] = await Promise.all([
        listLectures(),
        loadOptional(getDirectory(), { users: [], groups: [] } as Directory),
        loadOptional(listFields(), [] as Field[]),
      ]);
      lectures.value = items;
      directory.value = directoryResult.value;
      fields.value = fieldResult.value;
      metadataError.value = [directoryResult.error, fieldResult.error].filter(Boolean).join(" / ");
      now.value = Date.now();
    } catch (reason) {
      error.value = reason instanceof Error ? reason.message : "講習会を読み込めませんでした";
    } finally {
      loading.value = false;
    }
  }
  onMounted(() => {
    void load();
    timer = setInterval(() => {
      now.value = Date.now();
    }, 60_000);
  });
  onBeforeUnmount(() => clearInterval(timer));
  return { lectures, directory, fields, loading, error, metadataError, now, load };
}
