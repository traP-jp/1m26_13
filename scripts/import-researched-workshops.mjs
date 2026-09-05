#!/usr/bin/env node

import { createHash } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const catalogPath = resolve(repositoryRoot, "workshop-research/data/workshops.jsonl");
const candidatesPath = resolve(repositoryRoot, "workshop-research/research/candidates.jsonl");
const outputPath = resolve(repositoryRoot, "ui/researchedWorkshops.json");

const QUARANTINED_RESOURCE_KEYS = new Set([
  "res_b3ed0261897d",
  "res_67d655cf1b05",
  "res_829e0c7f9b14",
  "res_84321feae44f",
  "res_212c44fbd72d",
]);

const parseJsonl = (text) => text
  .split(/\r?\n/u)
  .filter((line) => line.trim())
  .map((line) => JSON.parse(line));

const digest = (value) => createHash("sha256").update(value).digest("hex");
const stableSuffix = (value) => digest(value).slice(0, 12);
const recordKey = (year, title) => `${year}\u0000${title}`;

const normalizeSeriesTitle = (title) => title
  .normalize("NFKC")
  .replace(/^(?:19|20)\d{2}(?:年度)?\s*/u, "")
  .replace(/\s+/gu, " ")
  .trim()
  .toLocaleLowerCase("ja");

const displayTitle = (title) => title.replace(/\*([^*]+)\*/gu, "$1");

const actor = (value) => ({
  kind: value.kind,
  id: value.id ?? `unresolved-${value.kind}-${stableSuffix(value.name)}`,
  name: value.name,
});

const relationReference = (value, workshopIdByExternalKey) => {
  if (value.kind === "external") {
    const workshopId = workshopIdByExternalKey.get(value.targetExternalWorkshopKey);
    return workshopId ? { kind: "workshop", workshopId } : { kind: "text", text: value.title };
  }
  return { kind: "text", text: value.text };
};

const resourceType = (kind) => ({
  material: "material",
  exercise: "practice",
  liveStream: "live",
  archiveVideo: "video",
  repository: "repository",
})[kind];

const catalogText = await readFile(catalogPath, "utf8");
const candidateText = await readFile(candidatesPath, "utf8");
const catalog = parseJsonl(catalogText);
const includedCandidates = parseJsonl(candidateText).filter((candidate) => candidate.includedInCanonical === true);

if (catalog.length !== 356 || includedCandidates.length !== 356) {
  throw new Error(`Expected 356 canonical and included candidate rows; got ${catalog.length} and ${includedCandidates.length}.`);
}

const candidatesByRecord = new Map();
for (const candidate of includedCandidates) {
  const key = recordKey(candidate.academicYear, candidate.title);
  if (candidatesByRecord.has(key)) throw new Error(`Duplicate included candidate: ${key}`);
  candidatesByRecord.set(key, candidate);
}

const catalogWithKeys = catalog.map((workshop) => {
  const candidate = candidatesByRecord.get(recordKey(workshop.academicYear, workshop.title));
  if (!candidate) throw new Error(`No included candidate for ${workshop.academicYear} ${workshop.title}`);
  return { workshop, candidate };
});

const externalKeys = new Set(catalogWithKeys.map(({ candidate }) => candidate.externalWorkshopKey));
if (externalKeys.size !== catalog.length) throw new Error("External workshop keys are not unique.");

const workshopIdByExternalKey = new Map(catalogWithKeys.map(({ candidate }) => [
  candidate.externalWorkshopKey,
  `research-${candidate.externalWorkshopKey}`,
]));

const seriesGroups = new Map();
for (const item of catalogWithKeys) {
  const key = normalizeSeriesTitle(item.workshop.title);
  const group = seriesGroups.get(key) ?? [];
  group.push(item);
  seriesGroups.set(key, group);
}

const seriesInfoByExternalKey = new Map();
for (const [normalizedTitle, items] of seriesGroups) {
  const ordered = [...items].sort((a, b) => (
    a.workshop.academicYear - b.workshop.academicYear
    || a.candidate.externalWorkshopKey.localeCompare(b.candidate.externalWorkshopKey)
  ));
  const repeatedAcrossYears = new Set(ordered.map(({ workshop }) => workshop.academicYear)).size > 1;
  for (const [index, item] of ordered.entries()) {
    seriesInfoByExternalKey.set(item.candidate.externalWorkshopKey, {
      lineageId: repeatedAcrossYears
        ? `research-series-${stableSuffix(normalizedTitle)}`
        : `research-series-${item.candidate.externalWorkshopKey}`,
      lineageBasis: repeatedAcrossYears ? "exact-title" : null,
      inferredPreviousId: repeatedAcrossYears && index > 0
        ? workshopIdByExternalKey.get(ordered[index - 1].candidate.externalWorkshopKey)
        : null,
    });
  }
}

const imported = catalogWithKeys.map(({ workshop, candidate }) => {
  const id = workshopIdByExternalKey.get(candidate.externalWorkshopKey);
  const series = seriesInfoByExternalKey.get(candidate.externalWorkshopKey);
  const occurrenceIds = new Map((workshop.occurrences ?? []).map((occurrence) => [
    occurrence.entityKey,
    `${id}-${occurrence.entityKey}`,
  ]));
  const relations = workshop.relations;
  const explicitPrevious = relations.previous?.map((value) => relationReference(value, workshopIdByExternalKey)) ?? [];
  const explicitPreviousIds = explicitPrevious
    .filter((value) => value.kind === "workshop")
    .map((value) => value.workshopId);
  const inferredPreviousIds = explicitPreviousIds.length === 0 && series.inferredPreviousId
    ? [series.inferredPreviousId]
    : [];
  const previousTextRefs = explicitPrevious.filter((value) => value.kind === "text");

  const resources = (workshop.resources ?? [])
    .filter((resource) => !QUARANTINED_RESOURCE_KEYS.has(resource.entityKey))
    .map((resource) => ({
      id: `${id}-${resource.entityKey}`,
      type: resourceType(resource.kind),
      title: resource.title,
      url: resource.url,
      ...(resource.note ? { note: resource.note } : {}),
      ...(resource.occurrenceEntityKey && occurrenceIds.has(resource.occurrenceEntityKey)
        ? { occurrenceId: occurrenceIds.get(resource.occurrenceEntityKey) }
        : {}),
    }));

  const sources = workshop.sources.map((source) => ({
    id: `${id}-${source.entityKey}`,
    title: source.title,
    url: source.url,
    supportCount: source.supports.length,
  }));

  return {
    id,
    importKey: candidate.externalWorkshopKey,
    origin: "research",
    lineageId: series.lineageId,
    lineageBasis: explicitPreviousIds.length ? "explicit" : series.lineageBasis,
    title: displayTitle(workshop.title),
    year: workshop.academicYear,
    status: "public",
    summary: workshop.description ?? "",
    outcome: "",
    audience: workshop.audience ?? "",
    prerequisites: "",
    preparation: "",
    howToLearn: "",
    team: workshop.organizerSource ?? "",
    operators: (workshop.organizers ?? []).map(actor),
    workshopChannel: workshop.workshopChannel ? {
      id: workshop.workshopChannel.id ?? `unresolved-channel-${stableSuffix(workshop.workshopChannel.path)}`,
      name: workshop.workshopChannel.path.split("/").filter(Boolean).at(-1) ?? workshop.workshopChannel.path,
      path: workshop.workshopChannel.path,
    } : null,
    targetTeams: workshop.targetTeams ?? [],
    isZeroToOne: workshop.isZeroToOne,
    previousTextRefs,
    prerequisiteRefs: relations.prerequisites?.map((value) => relationReference(value, workshopIdByExternalKey)) ?? [],
    recommendedRefs: relations.recommendations?.map((value) => relationReference(value, workshopIdByExternalKey)) ?? [],
    requestSetup: false,
    reflectionUrl: workshop.retrospectiveUrl ?? "",
    contact: "",
    tags: [],
    creators: [],
    previousIds: [...explicitPreviousIds, ...inferredPreviousIds],
    occurrences: (workshop.occurrences ?? []).map((occurrence) => ({
      id: occurrenceIds.get(occurrence.entityKey),
      title: occurrence.title ?? "",
      description: occurrence.description ?? "",
      date: occurrence.date ?? "",
      time: "",
      startTime: occurrence.startTime ?? "",
      endTime: occurrence.endTime ?? "",
      mode: occurrence.mode,
      place: occurrence.offlineVenue?.value ?? occurrence.onlineVenue?.value ?? "",
      onlinePlatform: occurrence.onlineVenue?.platform ?? "",
      onlineLocation: occurrence.onlineVenue?.value ?? "",
      offlineLocation: occurrence.offlineVenue?.value ?? "",
      instructor: (occurrence.instructors ?? []).map((value) => value.name).join("、"),
      instructors: (occurrence.instructors ?? []).map(actor),
      instructorsKnown: occurrence.instructors !== null,
      relation: occurrence.relation,
      status: occurrence.status,
      knoqUrl: occurrence.knoqUrl ?? "",
    })),
    resources,
    sources,
    sourceUrl: sources[0]?.url ?? "",
    sourceLabel: sources[0]?.title ?? "",
    collectionState: {
      operators: workshop.organizers === null ? "unknown" : "known",
      targetTeams: workshop.targetTeams === null ? "unknown" : "known",
      occurrences: workshop.occurrences === null ? "unknown" : "known",
      resources: workshop.resources === null ? "unknown" : "known",
      previous: relations.previous === null ? "unknown" : "known",
      prerequisites: relations.prerequisites === null ? "unknown" : "known",
      recommendations: relations.recommendations === null ? "unknown" : "known",
    },
    revisions: [{
      at: "2026-09-05",
      by: "データ移行",
      summary: "過去の講習会調査から取り込み",
    }],
  };
});

const totals = imported.reduce((result, workshop) => ({
  workshops: result.workshops + 1,
  occurrences: result.occurrences + workshop.occurrences.length,
  resources: result.resources + workshop.resources.length,
  sources: result.sources + workshop.sources.length,
}), { workshops: 0, occurrences: 0, resources: 0, sources: 0 });

if (totals.workshops !== 356 || totals.occurrences !== 642 || totals.resources !== 1043 || totals.sources !== 1713) {
  throw new Error(`Unexpected imported totals: ${JSON.stringify(totals)}`);
}

await writeFile(outputPath, `${JSON.stringify(imported)}\n`, "utf8");
console.log(JSON.stringify({
  output: outputPath,
  canonicalSha256: digest(catalogText),
  quarantinedResources: QUARANTINED_RESOURCE_KEYS.size,
  ...totals,
}, null, 2));
