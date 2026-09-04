import { sql } from 'drizzle-orm';
import { check, index, integer, primaryKey, sqliteTable, text } from 'drizzle-orm/sqlite-core';

export const users = sqliteTable('users', {
  id: text('id').primaryKey(),
  displayName: text('display_name').notNull(),
  createdAt: text('created_at').notNull(),
});

export const workshops = sqliteTable(
  'workshops',
  {
    id: text('id').primaryKey(),
    title: text('title').notNull(),
    summary: text('summary').notNull(),
    description: text('description').notNull(),
    category: text('category').notNull(),
    createdAt: text('created_at').notNull(),
    updatedAt: text('updated_at').notNull(),
  },
  (table) => [index('idx_workshops_category').on(table.category)],
);

export const workshopRelations = sqliteTable(
  'workshop_relations',
  {
    prerequisiteId: text('prerequisite_id')
      .notNull()
      .references(() => workshops.id, { onDelete: 'cascade' }),
    successorId: text('successor_id')
      .notNull()
      .references(() => workshops.id, { onDelete: 'cascade' }),
    createdAt: text('created_at').notNull(),
  },
  (table) => [
    primaryKey({ columns: [table.prerequisiteId, table.successorId] }),
    index('idx_workshop_relations_successor').on(table.successorId),
    check('chk_workshop_relations_not_self', sql`${table.prerequisiteId} <> ${table.successorId}`),
  ],
);

export const completions = sqliteTable(
  'completions',
  {
    userId: text('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    workshopId: text('workshop_id')
      .notNull()
      .references(() => workshops.id, { onDelete: 'cascade' }),
    completedAt: text('completed_at').notNull(),
  },
  (table) => [primaryKey({ columns: [table.userId, table.workshopId] })],
);

export const badges = sqliteTable('badges', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  description: text('description').notNull(),
  requiredCompletionCount: integer('required_completion_count').notNull(),
});

export const userBadges = sqliteTable(
  'user_badges',
  {
    userId: text('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    badgeId: text('badge_id')
      .notNull()
      .references(() => badges.id, { onDelete: 'cascade' }),
    awardedAt: text('awarded_at').notNull(),
  },
  (table) => [primaryKey({ columns: [table.userId, table.badgeId] })],
);

// β tables are additive so existing local α data remains untouched.
export const betaWorkshops = sqliteTable('beta_workshops', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  title: text('title').notNull(),
  summary: text('summary').notNull(),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
});

export const betaOccurrences = sqliteTable(
  'beta_occurrences',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    workshopId: integer('workshop_id').notNull().references(() => betaWorkshops.id, { onDelete: 'cascade' }),
    sequenceNumber: integer('sequence_number').notNull(),
    kind: text('kind').notNull(),
    copiedFromOccurrenceId: integer('copied_from_occurrence_id'),
    title: text('title'),
    description: text('description').notNull(),
    team: text('team').notNull(),
    year: integer('year').notNull(),
    scheduledAt: text('scheduled_at'),
    location: text('location').notNull(),
    instructor: text('instructor').notNull(),
    audience: text('audience').notNull(),
    prerequisites: text('prerequisites').notNull(),
    materialUrl: text('material_url'),
    materialLabel: text('material_label').notNull(),
    status: text('status').notNull(),
    createdAt: text('created_at').notNull(),
    updatedAt: text('updated_at').notNull(),
  },
  (table) => [index('idx_beta_occurrences_workshop').on(table.workshopId, table.sequenceNumber)],
);

export const betaWorkshopRelations = sqliteTable(
  'beta_workshop_relations',
  {
    prerequisiteId: integer('prerequisite_id').notNull().references(() => betaWorkshops.id, { onDelete: 'cascade' }),
    successorId: integer('successor_id').notNull().references(() => betaWorkshops.id, { onDelete: 'cascade' }),
    createdAt: text('created_at').notNull(),
  },
  (table) => [primaryKey({ columns: [table.prerequisiteId, table.successorId] })],
);

export const betaCompletions = sqliteTable(
  'beta_completions',
  {
    userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
    workshopId: integer('workshop_id').notNull().references(() => betaWorkshops.id, { onDelete: 'cascade' }),
    completedAt: text('completed_at').notNull(),
  },
  (table) => [primaryKey({ columns: [table.userId, table.workshopId] })],
);

export const betaRoadmaps = sqliteTable('beta_roadmaps', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  title: text('title').notNull(),
  summary: text('summary').notNull(),
  audience: text('audience').notNull(),
  // 0002以降の公開状態の正本。statusは既存D1を壊さない移行互換のためだけに残す。
  published: integer('published', { mode: 'boolean' }).notNull().default(false),
  status: text('status').notNull(),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
});

export const betaRoadmapStages = sqliteTable(
  'beta_roadmap_stages',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    roadmapId: integer('roadmap_id').notNull().references(() => betaRoadmaps.id, { onDelete: 'cascade' }),
    position: integer('position').notNull(),
    title: text('title').notNull(),
    description: text('description').notNull(),
  },
  (table) => [index('idx_beta_roadmap_stages_roadmap').on(table.roadmapId, table.position)],
);

export const betaRoadmapItems = sqliteTable(
  'beta_roadmap_items',
  {
    stageId: integer('stage_id').notNull().references(() => betaRoadmapStages.id, { onDelete: 'cascade' }),
    workshopId: integer('workshop_id').notNull().references(() => betaWorkshops.id, { onDelete: 'cascade' }),
    position: integer('position').notNull(),
    note: text('note').notNull(),
  },
  (table) => [primaryKey({ columns: [table.stageId, table.workshopId] })],
);

export const betaSeedState = sqliteTable('beta_seed_state', {
  id: text('id').primaryKey(),
  seededAt: text('seeded_at').notNull(),
});

export const betaFlows = sqliteTable('beta_flows', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull(),
  description: text('description').notNull(),
  category: text('category').notNull(),
  lectureId: integer('lecture_id').references(() => betaWorkshops.id, { onDelete: 'cascade' }),
  sessionId: integer('session_id').references(() => betaOccurrences.id, { onDelete: 'cascade' }),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
});
