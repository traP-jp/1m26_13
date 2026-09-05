import { describe, expect, it } from "vitest";

import type { Directory, Lecture, Session } from "@/api/resources";
import {
  createSearchFilters,
  currentAcademicYear,
  defaultFilters,
  selectLectures,
  upcomingSession,
} from "@/lib/lectureDiscovery";

const directory: Directory = {
  users: [
    { id: "11111111-2222-4333-8444-555555555555", traqId: "alice", displayName: "Alice 講師" },
    { id: "bob-id", traqId: "bob", displayName: "Bob" },
  ],
  groups: [{ id: "sysad-id", name: "SysAd" }],
};
const aliceId = directory.users[0]!.id;
const now = Date.parse("2026-09-05T12:00:00+09:00");
function session(id: string, overrides: Partial<Session> = {}): Session {
  return {
    id,
    lectureId: "1",
    name: "第1回",
    order: 1,
    resources: [],
    replayOfSessionIds: [],
    status: "published",
    isReplay: false,
    isCompleted: false,
    revision: 1,
    createdAt: "2026-01-01",
    updatedAt: "2026-01-01",
    ...overrides,
  };
}
function lecture(id: string, overrides: Partial<Lecture> = {}): Lecture {
  return {
    id,
    name: "Git講習会",
    description: "はじめてのGit",
    academicYearStart: 2025,
    academicYearEnd: 2026,
    isIntroductory: true,
    isPublished: true,
    resources: [],
    relations: [],
    sessions: [],
    completedSessionCount: 0,
    requiredSessionCount: 0,
    isCompleted: false,
    revision: 1,
    createdAt: "2026-01-01",
    updatedAt: "2026-01-01",
    ...overrides,
  };
}

describe("lecture discovery", () => {
  it("defaults search to the Japanese academic year at the April boundary", () => {
    const beforeApril = Date.parse("2026-03-31T23:59:59+09:00");
    const april = Date.parse("2026-04-01T00:00:00+09:00");
    expect(currentAcademicYear(beforeApril)).toBe(2025);
    expect(currentAcademicYear(april)).toBe(2026);
    expect(createSearchFilters(beforeApril).year).toBe("2025");
    expect(createSearchFilters(april).year).toBe("2026");
    expect(defaultFilters.year).toBe("");
    const changed = createSearchFilters(april);
    changed.group = "sysad";
    expect(createSearchFilters(april).group).toBe("");
  });
  it("combines keyword, organizer, year range, field, introductory and material filters", () => {
    const match = lecture("1", {
      organizer: { kind: "group", id: "sysad-id" },
      fieldId: "web",
      sessions: [session("1", { material: { url: "https://example.com/slides" } })],
    });
    const items = [
      match,
      lecture("2", { ...match, id: "2", fieldId: "game" }),
      lecture("3", { ...match, id: "3", isPublished: false }),
    ];
    expect(
      selectLectures(
        items,
        {
          ...defaultFilters,
          q: "Ｇｉｔ はじめて",
          group: "sysad",
          year: "2026",
          field: "web",
          introductory: true,
          material: true,
        },
        directory,
        now,
      ).map((item) => item.id),
    ).toEqual(["1"]);
    expect(selectLectures([match], { ...defaultFilters, year: "2027" }, directory, now)).toEqual(
      [],
    );
  });
  it("uses published dates in Japan time, including replays and today with an unknown time", () => {
    const item = lecture("1", {
      sessions: [
        session("past", { date: "2026-09-05", startTime: "11:59" }),
        session("draft", { date: "2026-09-05", startTime: "12:01", status: "draft" }),
        session("later", { date: "2026-09-06", startTime: "09:00" }),
        session("replay", { date: "2026-09-05", startTime: "13:00", isReplay: true }),
      ],
    });
    expect(upcomingSession(item, now)?.id).toBe("replay");
    expect(
      upcomingSession(lecture("2", { sessions: [session("unknown", { date: "2026-09-05" })] }), now)
        ?.id,
    ).toBe("unknown");
    expect(upcomingSession(lecture("3", { sessions: [session("undated")] }), now)).toBeUndefined();
    expect(
      upcomingSession(
        lecture("4", { sessions: [session("today", { date: "2026-09-05" })] }),
        Date.parse("2026-09-05T15:00:00Z"),
      ),
    ).toBeUndefined();
  });
  it("orders by next occurrence and excludes past-only or undated lectures from upcoming", () => {
    const items = [
      lecture("2", { sessions: [session("s2", { date: "2026-09-10" })] }),
      lecture("1", { sessions: [session("s1", { date: "2026-09-06" })] }),
      lecture("3"),
      lecture("4", { sessions: [session("s4", { date: "2025-01-01" })] }),
    ];
    expect(
      selectLectures(
        items,
        { ...defaultFilters, upcoming: true, sort: "upcoming" },
        directory,
        now,
      ).map((item) => item.id),
    ).toEqual(["1", "2"]);
  });
  it("matches the organizer rather than words in the lecture title or an unrelated group", () => {
    expect(
      selectLectures(
        [
          lecture("1", {
            name: "SysAd Git",
            organizer: { kind: "group", id: "other", groupName: "SysAd-other" },
          }),
        ],
        { ...defaultFilters, group: "sysad" },
        directory,
        now,
      ),
    ).toEqual([]);
  });
  it.each(["ＡＬＩＣＥ", "＠Ａｌｉｃｅ", "講師", "alice 講師", aliceId, "4333-8444"])(
    "finds a published instructor by normalized display name, traQ ID or UUID: %s",
    (instructor) => {
      const items = [
        lecture("published", { sessions: [session("s1", { instructorId: aliceId })] }),
        lecture("draft", {
          sessions: [session("s2", { instructorId: aliceId, status: "draft" })],
        }),
        lecture("organizer-only", { organizer: { kind: "user", id: aliceId } }),
        lecture("unassigned", { sessions: [session("s3")] }),
      ];
      expect(
        selectLectures(items, { ...defaultFilters, instructor }, directory, now).map(
          (item) => item.id,
        ),
      ).toEqual(["published"]);
    },
  );
  it("can search a recorded instructor ID while the directory is unavailable", () => {
    expect(
      selectLectures(
        [lecture("1", { sessions: [session("s1", { instructorId: aliceId })] })],
        { ...defaultFilters, instructor: aliceId },
        { users: [], groups: [] },
        now,
      ).map((item) => item.id),
    ).toEqual(["1"]);
  });
  it("includes both date boundaries and excludes undated or draft occurrences", () => {
    const items = [
      lecture("before", { sessions: [session("s1", { date: "2026-09-05" })] }),
      lecture("from", { sessions: [session("s2", { date: "2026-09-06" })] }),
      lecture("to", { sessions: [session("s3", { date: "2026-09-07" })] }),
      lecture("after", { sessions: [session("s4", { date: "2026-09-08" })] }),
      lecture("undated", { sessions: [session("s5")] }),
      lecture("draft", {
        sessions: [session("s6", { date: "2026-09-06", status: "draft" })],
      }),
    ];
    expect(
      selectLectures(
        items,
        { ...defaultFilters, dateFrom: "2026-09-06", dateTo: "2026-09-07" },
        directory,
        now,
      ).map((item) => item.id),
    ).toEqual(["from", "to"]);
    expect(
      selectLectures(
        items,
        { ...defaultFilters, dateFrom: "2026-09-08", dateTo: "2026-09-06" },
        directory,
        now,
      ),
    ).toEqual([]);
  });
  it("requires instructor, location, date and upcoming conditions on the same published occurrence", () => {
    const matching = session("match", {
      instructorId: aliceId,
      location: "西9号館 Discord",
      date: "2026-09-06",
    });
    const items = [
      lecture("match", { sessions: [matching] }),
      lecture("different-instructor", {
        sessions: [
          session("past", { ...matching, date: "2026-09-04" }),
          session("bob", { ...matching, instructorId: "bob-id" }),
        ],
      }),
      lecture("different-location", {
        sessions: [
          session("outside", { ...matching, date: "2026-09-09" }),
          session("elsewhere", { ...matching, location: "Zoom" }),
        ],
      }),
      lecture("already-started", {
        sessions: [session("started", { ...matching, date: "2026-09-05", startTime: "11:59" })],
      }),
      lecture("draft-match", { sessions: [session("draft", { ...matching, status: "draft" })] }),
    ];
    expect(
      selectLectures(
        items,
        {
          ...defaultFilters,
          instructor: "Alice",
          location: "ＤＩＳＣＯＲＤ 西９",
          dateFrom: "2026-09-05",
          dateTo: "2026-09-07",
          upcoming: true,
        },
        directory,
        now,
      ).map((item) => item.id),
    ).toEqual(["match"]);
  });
  it("sorts upcoming results by the occurrence matching the other session conditions", () => {
    const items = [
      lecture("later", {
        sessions: [
          session("unrelated", { date: "2026-09-06", instructorId: "bob-id" }),
          session("later", { date: "2026-09-08", instructorId: aliceId }),
        ],
      }),
      lecture("sooner", {
        sessions: [session("sooner", { date: "2026-09-07", instructorId: aliceId })],
      }),
    ];
    expect(
      selectLectures(
        items,
        { ...defaultFilters, instructor: "alice", upcoming: true, sort: "upcoming" },
        directory,
        now,
      ).map((item) => item.id),
    ).toEqual(["sooner", "later"]);
  });
  it("filters completion from lecture completion, including lectures without occurrences", () => {
    const items = [
      lecture("complete", { isCompleted: true }),
      lecture("partial", { sessions: [session("finished", { isCompleted: true })] }),
      lecture("empty"),
    ];
    expect(
      selectLectures(items, { ...defaultFilters, completion: "completed" }, directory, now).map(
        (item) => item.id,
      ),
    ).toEqual(["complete"]);
    expect(
      selectLectures(items, { ...defaultFilters, completion: "incomplete" }, directory, now).map(
        (item) => item.id,
      ),
    ).toEqual(["partial", "empty"]);
  });
  it("keeps a shared random seed reproducible without mutating the source or duplicating entries", () => {
    const items = Array.from({ length: 8 }, (_, i) => lecture(String(i + 1)));
    const original = items.map((item) => item.id);
    const filters = { ...defaultFilters, sort: "random", seed: 4321 };
    const result = selectLectures(items, filters, directory, now);
    expect(result).toEqual(selectLectures(items, filters, directory, now));
    expect(new Set(result.map((item) => item.id)).size).toBe(items.length);
    expect(result).not.toEqual(selectLectures(items, { ...filters, seed: 1234 }, directory, now));
    expect(items.map((item) => item.id)).toEqual(original);
  });
});
