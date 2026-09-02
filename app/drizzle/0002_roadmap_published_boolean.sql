ALTER TABLE `beta_roadmaps` ADD COLUMN `published` integer NOT NULL DEFAULT 0;
--> statement-breakpoint
UPDATE `beta_roadmaps`
SET `published` = CASE WHEN `status` = 'published' THEN 1 ELSE 0 END;
