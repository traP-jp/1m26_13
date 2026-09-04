export type PublicationStatus = 'draft' | 'published';
export type FlowCategory = 'lecture_pre' | 'session_main' | 'lecture_post';
export type Flow = {
  id: number;
  name: string;
  description: string;
  category: FlowCategory;
  lectureId: number | null;
  sessionId: number | null;
  createdAt: string;
  updatedAt: string;
};
export type FlowInput = Pick<Flow, 'name' | 'description' | 'category' | 'lectureId' | 'sessionId'>;

// UI compatibility aliases. The canonical product model is Lecture -> Session.
export type Resource = { title?: string; url: string };
export type LectureRelationType = 'prerequisite' | 'previous_year' | 'recommended_next';
export type Lecture = {
  id: string; name: string; description?: string; academicYearStart: number; academicYearEnd: number;
  fieldId?: string; organizerGroupIds: string[]; organizerUserIds: string[];
  contactGroupIds: string[]; contactUserIds: string[]; targetAudience?: string;
  isIntroductory: boolean; traqChannelId?: string; resources: Resource[];
};
export type Session = {
  id: string; lectureId: string; name: string; description?: string; order: number;
  date?: Date; startTime?: string; location?: string; knoqUrl?: string;
  instructorIds: string[]; resources: Resource[]; replayOfSessionIds: string[]; status: PublicationStatus;
};
export type LectureRelation = { fromLectureId: string; toLectureId: string; type: LectureRelationType };
export type OccurrenceKind = 'standard' | 'rebroadcast' | 'digest';

export type WorkshopOccurrence = {
  id: number;
  sequenceNumber: number;
  kind: OccurrenceKind;
  copiedFromOccurrenceId: number | null;
  title: string | null;
  description: string;
  team: string;
  year: number;
  scheduledAt: string | null;
  location: string;
  instructor: string;
  audience: string;
  prerequisites: string;
  materialUrl: string | null;
  materialLabel: string;
  status: PublicationStatus;
};

export type WorkshopSummary = {
  type: 'workshop';
  id: number;
  title: string;
  summary: string;
  published: boolean;
  teams: string[];
  years: number[];
  occurrenceCount: number;
  latestScheduledAt: string | null;
};

export type RelatedWorkshop = Pick<WorkshopSummary, 'id' | 'title' | 'summary'>;
export type RoadmapSummary = { type: 'roadmap'; id: number; title: string; summary: string; audience: string; workshopCount: number; completedCount: number };
export type RoadmapInputItem = { workshopId: number; note: string };
export type RoadmapInputStage = { items: RoadmapInputItem[] };
export type RoadmapInput = { title: string; summary: string; audience: string; published: boolean; stages: RoadmapInputStage[] };
export type RoadmapManageStage = RoadmapInputStage & { id: number; position: number };
export type RoadmapManage = Omit<RoadmapInput, 'stages'> & { id: number; createdAt: string; updatedAt: string; stages: RoadmapManageStage[] };
export type WorkshopDetail = WorkshopSummary & { createdAt: string; updatedAt: string; occurrences: WorkshopOccurrence[]; prerequisites: RelatedWorkshop[]; successors: RelatedWorkshop[]; roadmaps: RoadmapSummary[]; completed: boolean; canManage: boolean };
export type DiscoveryResponse = { workshops: WorkshopSummary[]; roadmaps: RoadmapSummary[]; teams: string[]; years: number[] };
export type OccurrenceInput = Omit<WorkshopOccurrence, 'id' | 'copiedFromOccurrenceId'> & { id?: number; copiedFromOccurrenceId?: number | null };
export type WorkshopInput = { title: string; summary: string; prerequisiteIds: number[]; successorIds: number[]; occurrences: OccurrenceInput[] };
export type CompletionRecord = { workshopId: number; title: string; team: string; year: number; completedAt: string };
export type BadgeRecord = { workshopId: number; title: string; year: number; completedAt: string };
export type RoadmapProgress = RoadmapSummary & { nextWorkshopId: number | null };
export type UserProfile = { id: string; displayName: string; createdAt: string; completions: CompletionRecord[]; badges: BadgeRecord[]; roadmaps: RoadmapProgress[] };
export type RoadmapItem = { workshopId: number; title: string; summary: string; note: string; completed: boolean };
export type RoadmapStage = { id: number; position: number; items: RoadmapItem[] };
export type RoadmapDetail = RoadmapSummary & { stages: RoadmapStage[]; nextWorkshopId: number | null };
export type ApiErrorBody = { error: { code: string; message: string; fields?: Record<string, string> } };
