CREATE TABLE `beta_seed_state` (
	`id` text PRIMARY KEY NOT NULL,
	`seeded_at` text NOT NULL
);
--> statement-breakpoint
INSERT OR IGNORE INTO `beta_seed_state` (`id`, `seeded_at`)
SELECT 'beta-v1', CURRENT_TIMESTAMP
WHERE EXISTS (SELECT 1 FROM `beta_workshops`);
