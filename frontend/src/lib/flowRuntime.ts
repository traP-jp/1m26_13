export type FlowAttributeTarget = "lecture" | "session";
export type FlowFieldKind =
  | "boolean"
  | "date"
  | "number"
  | "status"
  | "text"
  | "textarea"
  | "time"
  | "url";

export function flowAttributeTarget(
  path: string,
  hasSession: boolean,
): FlowAttributeTarget | undefined {
  if (path.startsWith("lecture.")) return "lecture";
  if (path.startsWith("session.") && hasSession) return "session";
  return undefined;
}

export function flowApiAttributePath(path: string) {
  const separator = path.indexOf(".");
  return separator < 0 ? path : path.slice(separator + 1);
}

export function flowFieldKind(path: string): FlowFieldKind {
  if (path === "session.status") return "status";
  if (path === "lecture.isIntroductory") return "boolean";
  if (path === "lecture.academicYearStart" || path === "lecture.academicYearEnd") return "number";
  if (path === "session.date") return "date";
  if (path === "session.startTime") return "time";
  if (path.endsWith("description") || path === "lecture.targetAudience") return "textarea";
  if (path === "session.knoqUrl") return "url";
  return "text";
}
