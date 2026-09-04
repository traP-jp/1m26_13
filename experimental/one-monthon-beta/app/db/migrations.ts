import initialSchema from '../drizzle/0000_red_sleepwalker.sql?raw';
import betaSchema from '../drizzle/0001_beta_model.sql?raw';
import roadmapPublishedBoolean from '../drizzle/0002_roadmap_published_boolean.sql?raw';
import betaSeedState from '../drizzle/0003_beta_seed_state.sql?raw';
import extendedBetaCatalog from '../drizzle/0004_extended_beta_catalog.sql?raw';
import flows from '../drizzle/0005_flows.sql?raw';

type LocalMigration = {
  id: string;
  statements: string[];
};

function parseInitialMigration(source: string): string[] {
  return source
    .split('--> statement-breakpoint')
    .map((statement) => statement.trim())
    .filter(Boolean)
    .map((statement) =>
      statement
        .replace(/^CREATE TABLE\s+/i, 'CREATE TABLE IF NOT EXISTS ')
        .replace(/^CREATE INDEX\s+/i, 'CREATE INDEX IF NOT EXISTS '),
    );
}

// The checked-in Drizzle migration is also the schema applied by local startup.
// `IF NOT EXISTS` lets existing pre-migration alpha databases adopt the migration ledger safely.
export const localMigrations: LocalMigration[] = [
  {
    id: '0000_red_sleepwalker',
    statements: parseInitialMigration(initialSchema),
  },
  {
    id: '0001_beta_model',
    statements: parseInitialMigration(betaSchema),
  },
  {
    id: '0002_roadmap_published_boolean',
    statements: parseInitialMigration(roadmapPublishedBoolean),
  },
  {
    id: '0003_beta_seed_state',
    statements: parseInitialMigration(betaSeedState),
  },
  {
    id: '0004_extended_beta_catalog',
    statements: parseInitialMigration(extendedBetaCatalog),
  },
  { id: '0005_flows', statements: parseInitialMigration(flows) },
];
