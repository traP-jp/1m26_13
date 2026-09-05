import type { Directory, Lecture, Session } from "@/api/resources";

export const teams = [
  {
    id: "sysad",
    name: "SysAd班",
    aliases: ["sysad", "sysad班"],
    color: "#14A39E",
    logo: "/brand/teams/sysad.svg",
  },
  {
    id: "game",
    name: "ゲーム班",
    aliases: ["game", "ゲーム", "ゲーム班"],
    color: "#7733AA",
    logo: "/brand/teams/game.svg",
  },
  {
    id: "graphics",
    name: "グラフィック班",
    aliases: ["graphics", "graphic", "グラフィック", "グラフィック班"],
    color: "#F47FAD",
    logo: "/brand/teams/graphics.svg",
  },
  {
    id: "sound",
    name: "サウンド班",
    aliases: ["sound", "サウンド", "サウンド班"],
    color: "#FF7B19",
    logo: "/brand/teams/sound.svg",
  },
  {
    id: "algorithm",
    name: "アルゴリズム班",
    aliases: ["algorithm", "algo", "アルゴリズム", "アルゴリズム班"],
    color: "#B02525",
    logo: "/brand/teams/algorithm.svg",
  },
  {
    id: "ctf",
    name: "CTF班",
    aliases: ["ctf", "ctf班"],
    color: "#C7F000",
    logo: "/brand/teams/ctf.svg",
  },
  {
    id: "kaggle",
    name: "Kaggle班",
    aliases: ["kaggle", "kaggle班"],
    color: "#20BEFF",
    logo: "/brand/teams/kaggle.svg",
  },
];

export function normalize(value: string) {
  return value.normalize("NFKC").toLocaleLowerCase("ja").trim();
}

export function matchesGroup(lecture: Lecture, group: string, directory: Directory) {
  if (!group) return true;
  if (lecture.organizer?.kind !== "group") return false;
  if (lecture.organizer.id === group) return true;
  const team = teams.find((item) => item.id === group);
  if (!team) return false;
  const name =
    directory.groups.find((item) => item.id === lecture.organizer?.id)?.name ??
    lecture.organizer.groupName ??
    "";
  return team.aliases.includes(normalize(name));
}

function japanDate(now: number) {
  return new Date(now + 9 * 60 * 60 * 1000).toISOString().slice(0, 10);
}

export function currentAcademicYear(now = Date.now()) {
  const date = japanDate(now);
  return Number(date.slice(0, 4)) - (date.slice(5, 7) < "04" ? 1 : 0);
}

function isUpcoming(session: Session, now: number) {
  return Boolean(
    session.date &&
    (session.startTime
      ? Date.parse(`${session.date}T${session.startTime}:00+09:00`) >= now
      : session.date >= japanDate(now)),
  );
}

function findUpcomingSession(sessions: Session[], now: number) {
  return sessions
    .filter((session) => session.status === "published" && isUpcoming(session, now))
    .sort((a, b) =>
      `${a.date}T${a.startTime ?? "23:59"}`.localeCompare(`${b.date}T${b.startTime ?? "23:59"}`),
    )[0];
}

export function upcomingSession(lecture: Lecture, now = Date.now()) {
  return findUpcomingSession(lecture.sessions, now);
}

export function academicYear(lecture: Lecture) {
  return lecture.academicYearStart === lecture.academicYearEnd
    ? `${lecture.academicYearStart}年度`
    : `${lecture.academicYearStart}–${lecture.academicYearEnd}年度`;
}

export function organizerLabel(lecture: Lecture, directory: Directory) {
  if (!lecture.organizer) return "運営未設定";
  return lecture.organizer.kind === "group"
    ? (directory.groups.find((item) => item.id === lecture.organizer?.id)?.name ??
        lecture.organizer.groupName ??
        "運営グループ")
    : (directory.users.find((item) => item.id === lecture.organizer?.id)?.displayName ??
        "運営担当者");
}

export function sessionDateLabel(session: Session) {
  if (!session.date) return "日程未定";
  const date = new Intl.DateTimeFormat("ja-JP", {
    month: "numeric",
    day: "numeric",
    weekday: "short",
    timeZone: "Asia/Tokyo",
  }).format(new Date(`${session.date}T00:00:00+09:00`));
  return `${date}${session.startTime ? ` ${session.startTime}` : "・時刻未定"}`;
}

export type LectureFilters = {
  q: string;
  group: string;
  field: string;
  year: string;
  instructor: string;
  dateFrom: string;
  dateTo: string;
  location: string;
  completion: "" | "completed" | "incomplete";
  upcoming: boolean;
  material: boolean;
  introductory: boolean;
  sort: string;
  seed: number;
};

export function selectLectures(
  lectures: Lecture[],
  filters: LectureFilters,
  directory: Directory,
  now = Date.now(),
) {
  const words = normalize(filters.q).split(/\s+/).filter(Boolean);
  const instructorWords = normalize(filters.instructor).split(/\s+/).filter(Boolean);
  const locationWords = normalize(filters.location).split(/\s+/).filter(Boolean);
  const users = new Map(directory.users.map((user) => [user.id, user]));
  const hasSessionFilter = Boolean(
    instructorWords.length ||
    locationWords.length ||
    filters.dateFrom ||
    filters.dateTo ||
    filters.upcoming,
  );
  const matchesSession = (session: Session) => {
    if (session.status !== "published") return false;
    if (filters.upcoming && !isUpcoming(session, now)) return false;
    if ((filters.dateFrom || filters.dateTo) && !session.date) return false;
    if (filters.dateFrom && session.date! < filters.dateFrom) return false;
    if (filters.dateTo && session.date! > filters.dateTo) return false;
    const user = session.instructorId ? users.get(session.instructorId) : undefined;
    const instructor = normalize(
      `${session.instructorId ?? ""} ${user?.traqId ?? ""} ${user ? `@${user.traqId}` : ""} ${user?.displayName ?? ""}`,
    );
    return (
      instructorWords.every((word) => instructor.includes(word)) &&
      locationWords.every((word) => normalize(session.location ?? "").includes(word))
    );
  };
  const year = Number(filters.year);
  const selected = lectures.filter((lecture) => {
    const text = normalize(
      `${lecture.name} ${lecture.description ?? ""} ${lecture.targetAudience ?? ""} ${organizerLabel(lecture, directory)}`,
    );
    return (
      lecture.isPublished &&
      words.every((word) => text.includes(word)) &&
      matchesGroup(lecture, filters.group, directory) &&
      (!filters.field || lecture.fieldId === filters.field) &&
      (!filters.year || (lecture.academicYearStart <= year && lecture.academicYearEnd >= year)) &&
      (!hasSessionFilter || lecture.sessions.some(matchesSession)) &&
      (filters.completion !== "completed" || lecture.isCompleted) &&
      (filters.completion !== "incomplete" || !lecture.isCompleted) &&
      (!filters.introductory || lecture.isIntroductory) &&
      (!filters.material ||
        Boolean(
          lecture.material?.url ||
          lecture.sessions.some(
            (session) => session.status === "published" && session.material?.url,
          ),
        ))
    );
  });
  if (filters.sort === "random") {
    let state = filters.seed >>> 0;
    for (let i = selected.length - 1; i > 0; i--) {
      state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
      const j = Math.floor((state / 4294967296) * (i + 1));
      [selected[i], selected[j]] = [selected[j]!, selected[i]!];
    }
    return selected;
  }
  return selected.sort((a, b) => {
    if (filters.sort === "upcoming") {
      const aSession = findUpcomingSession(a.sessions.filter(matchesSession), now);
      const bSession = findUpcomingSession(b.sessions.filter(matchesSession), now);
      const order = `${aSession?.date ?? "9999"}T${aSession?.startTime ?? "23:59"}`.localeCompare(
        `${bSession?.date ?? "9999"}T${bSession?.startTime ?? "23:59"}`,
      );
      if (order) return order;
    }
    if (filters.sort === "name") return a.name.localeCompare(b.name, "ja");
    return b.academicYearStart - a.academicYearStart || b.updatedAt.localeCompare(a.updatedAt);
  });
}

export const defaultFilters: LectureFilters = {
  q: "",
  group: "",
  field: "",
  year: "",
  instructor: "",
  dateFrom: "",
  dateTo: "",
  location: "",
  completion: "",
  upcoming: false,
  material: false,
  introductory: false,
  sort: "newest",
  seed: 1,
};

export function createSearchFilters(now = Date.now()): LectureFilters {
  return { ...defaultFilters, year: String(currentAcademicYear(now)) };
}
