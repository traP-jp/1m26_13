import { apiClient } from "@/api/client";
import type { components } from "@/api/schema";

export type Lecture = components["schemas"]["Lecture"];
export type LectureCreate = components["schemas"]["LectureCreate"];
export type LectureWorkspace = components["schemas"]["LectureWorkspace"];
export type AttributePatch = components["schemas"]["AttributePatch"];
export type Session = components["schemas"]["Session"];
export type SessionCreate = components["schemas"]["SessionCreate"];
export type FlowClass = components["schemas"]["FlowClass"];
export type FlowClassWrite = components["schemas"]["FlowClassWrite"];
export type Flow = components["schemas"]["Flow"];
export type Roadmap = components["schemas"]["Roadmap"];
export type RoadmapWrite = components["schemas"]["RoadmapWrite"];
export type Profile = components["schemas"]["Profile"];
export type Directory = components["schemas"]["Directory"];
export type Field = components["schemas"]["Field"];

function result<T>(response: Response, data: T | undefined, message: string): T {
  if (!response.ok || data === undefined) throw new Error(`${message} (${response.status})`);
  return data;
}

export async function getDirectory() {
  const { data, response } = await apiClient.GET("/directory");
  return result(response, data, "部員情報を取得できませんでした");
}
export async function listFields() {
  const { data, response } = await apiClient.GET("/fields");
  return result(response, data, "分野を取得できませんでした");
}
export async function listLectures(
  query: { q?: string; year?: number; fieldId?: string; includeDraft?: boolean } = {},
) {
  const { data, response } = await apiClient.GET("/lectures", { params: { query } });
  return result(response, data, "講習会を取得できませんでした");
}
export async function getLecture(id: string, includeDraft = false) {
  const { data, response } = await apiClient.GET("/lectures/{lectureId}", {
    params: { path: { lectureId: id }, query: { includeDraft } },
  });
  return result(response, data, "講習会を取得できませんでした");
}
export async function createLecture(body: LectureCreate) {
  const { data, response } = await apiClient.POST("/lectures", { body });
  return result(response, data, "講習会を保存できませんでした");
}
export async function getLectureWorkspace(id: string) {
  const { data, response } = await apiClient.GET("/lectures/{lectureId}/workspace", {
    params: { path: { lectureId: id } },
  });
  return result(response, data, "講習会編集情報を取得できませんでした");
}
export async function patchLectureAttribute(id: string, body: AttributePatch) {
  const { data, response } = await apiClient.PATCH("/lectures/{lectureId}/attributes", {
    params: { path: { lectureId: id } },
    body,
  });
  return result(response, data, "講習会を更新できませんでした");
}
export async function getSession(id: string, includeDraft = false) {
  const { data, response } = await apiClient.GET("/sessions/{sessionId}", {
    params: { path: { sessionId: id }, query: { includeDraft } },
  });
  return result(response, data, "開催を取得できませんでした");
}
export async function createSession(lectureId: string, body: SessionCreate) {
  const { data, response } = await apiClient.POST("/lectures/{lectureId}/sessions", {
    params: { path: { lectureId } },
    body,
  });
  return result(response, data, "開催を保存できませんでした");
}
export async function patchSessionAttribute(id: string, body: AttributePatch) {
  const { data, response } = await apiClient.PATCH("/sessions/{sessionId}/attributes", {
    params: { path: { sessionId: id } },
    body,
  });
  return result(response, data, "開催を更新できませんでした");
}
export async function setCompletion(sessionId: string, completed: boolean) {
  const request = { params: { path: { sessionId } } };
  const response = completed
    ? await apiClient.PUT("/sessions/{sessionId}/completion", request)
    : await apiClient.DELETE("/sessions/{sessionId}/completion", request);
  if (!response.response.ok)
    throw new Error(`完了記録を更新できませんでした (${response.response.status})`);
}
export async function listFlowClasses(includeUnlisted = false, type?: FlowClass["type"]) {
  const { data, response } = await apiClient.GET("/flow-classes", {
    params: { query: { includeUnlisted, type } },
  });
  return result(response, data, "Flowを取得できませんでした");
}
export async function createFlowClass(body: FlowClassWrite) {
  const { data, response } = await apiClient.POST("/flow-classes", { body });
  return result(response, data, "FlowClassを保存できませんでした");
}
export async function updateFlowClass(id: string, body: FlowClassWrite) {
  const { data, response } = await apiClient.PUT("/flow-classes/{flowClassId}", {
    params: { path: { flowClassId: id } },
    body,
  });
  return result(response, data, "FlowClassを更新できませんでした");
}
export async function listFlows(query: { targetType: "lecture" | "session"; targetId: string }) {
  const { data, response } = await apiClient.GET("/flows", { params: { query } });
  return result(response, data, "適用済みFlowを取得できませんでした");
}
export async function getFlow(id: string) {
  const { data, response } = await apiClient.GET("/flows/{flowId}", {
    params: { path: { flowId: id } },
  });
  return result(response, data, "Flowを取得できませんでした");
}
export async function replaceFlowClass(id: string, flowClassId: string) {
  const { data, response } = await apiClient.PUT("/flows/{flowId}/flow-class", {
    params: { path: { flowId: id } },
    body: { flowClassId },
  });
  return result(response, data, "使用Flowを変更できませんでした");
}
export async function patchFlowCheck(id: string, body: components["schemas"]["FlowCheckPatch"]) {
  const { data, response } = await apiClient.PATCH("/flows/{flowId}/checks", {
    params: { path: { flowId: id } },
    body,
  });
  return result(response, data, "チェックを更新できませんでした");
}
export async function updateFlowPage(id: string, currentPage: number) {
  const { data, response } = await apiClient.PATCH("/flows/{flowId}/page", {
    params: { path: { flowId: id } },
    body: { currentPage },
  });
  return result(response, data, "ページ位置を保存できませんでした");
}
export async function reorderSessions(
  lectureId: string,
  items: components["schemas"]["SessionOrderItem"][],
) {
  const { data, response } = await apiClient.PUT("/lectures/{lectureId}/session-order", {
    params: { path: { lectureId } },
    body: { items },
  });
  return result(response, data, "開催順を保存できませんでした");
}
export async function getLectureHistory(lectureId: string, category: "data" | "flow") {
  const { data, response } = await apiClient.GET("/lectures/{lectureId}/history", {
    params: { path: { lectureId }, query: { category } },
  });
  return result(response, data, "変更履歴を取得できませんでした");
}
export async function exportLecture(lectureId: string) {
  const { data, response } = await apiClient.GET("/lectures/{lectureId}/export", {
    params: { path: { lectureId } },
  });
  return result(response, data, "講習会を書き出せませんでした");
}
export async function listRoadmaps(includeDraft = false) {
  const { data, response } = await apiClient.GET("/roadmaps", {
    params: { query: { includeDraft } },
  });
  return result(response, data, "ロードマップを取得できませんでした");
}
export async function getRoadmap(id: string, includeDraft = false) {
  const { data, response } = await apiClient.GET("/roadmaps/{roadmapId}", {
    params: { path: { roadmapId: id }, query: { includeDraft } },
  });
  return result(response, data, "ロードマップを取得できませんでした");
}
export async function createRoadmap(body: RoadmapWrite) {
  const { data, response } = await apiClient.POST("/roadmaps", { body });
  return result(response, data, "ロードマップを保存できませんでした");
}
export async function updateRoadmap(id: string, body: RoadmapWrite) {
  const { data, response } = await apiClient.PUT("/roadmaps/{roadmapId}", {
    params: { path: { roadmapId: id } },
    body,
  });
  return result(response, data, "ロードマップを更新できませんでした");
}
export async function getProfile(traqId: string) {
  const { data, response } = await apiClient.GET("/profiles/{traqId}", {
    params: { path: { traqId } },
  });
  return result(response, data, "プロフィールを取得できませんでした");
}
