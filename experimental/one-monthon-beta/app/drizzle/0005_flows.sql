CREATE TABLE `beta_flows` (
  `id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
  `name` text NOT NULL,
  `description` text NOT NULL DEFAULT '',
  `category` text NOT NULL,
  `lecture_id` integer,
  `session_id` integer,
  `created_at` text NOT NULL,
  `updated_at` text NOT NULL,
  FOREIGN KEY (`lecture_id`) REFERENCES `beta_workshops`(`id`) ON DELETE cascade,
  FOREIGN KEY (`session_id`) REFERENCES `beta_occurrences`(`id`) ON DELETE cascade,
  CONSTRAINT `chk_beta_flow_category` CHECK (`category` IN ('lecture_pre', 'session_main', 'lecture_post')),
  CONSTRAINT `chk_beta_flow_target` CHECK (
    (`category` = 'session_main' AND `lecture_id` IS NULL AND `session_id` IS NOT NULL)
    OR (`category` IN ('lecture_pre', 'lecture_post') AND `lecture_id` IS NOT NULL AND `session_id` IS NULL)
  )
);
--> statement-breakpoint
CREATE INDEX `idx_beta_flows_lecture` ON `beta_flows` (`lecture_id`,`category`);
--> statement-breakpoint
CREATE INDEX `idx_beta_flows_session` ON `beta_flows` (`session_id`,`category`);
