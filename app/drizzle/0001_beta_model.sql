CREATE TABLE `beta_workshops` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`title` text NOT NULL,
	`summary` text NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `beta_occurrences` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`workshop_id` integer NOT NULL,
	`sequence_number` integer NOT NULL,
	`kind` text NOT NULL,
	`copied_from_occurrence_id` integer,
	`title` text,
	`description` text NOT NULL,
	`team` text NOT NULL,
	`year` integer NOT NULL,
	`scheduled_at` text,
	`location` text NOT NULL,
	`instructor` text NOT NULL,
	`audience` text NOT NULL,
	`prerequisites` text NOT NULL,
	`material_url` text,
	`material_label` text NOT NULL,
	`status` text NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`workshop_id`) REFERENCES `beta_workshops`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`copied_from_occurrence_id`) REFERENCES `beta_occurrences`(`id`) ON UPDATE no action ON DELETE set null,
	CONSTRAINT `chk_beta_occurrence_kind` CHECK (`kind` IN ('standard', 'rebroadcast', 'digest')),
	CONSTRAINT `chk_beta_occurrence_status` CHECK (`status` IN ('draft', 'published')),
	CONSTRAINT `chk_beta_occurrence_sequence` CHECK (`sequence_number` > 0)
);
--> statement-breakpoint
CREATE INDEX `idx_beta_occurrences_workshop` ON `beta_occurrences` (`workshop_id`,`sequence_number`);
--> statement-breakpoint
CREATE INDEX `idx_beta_occurrences_discovery` ON `beta_occurrences` (`status`,`team`,`year`);
--> statement-breakpoint
CREATE TABLE `beta_workshop_relations` (
	`prerequisite_id` integer NOT NULL,
	`successor_id` integer NOT NULL,
	`created_at` text NOT NULL,
	PRIMARY KEY(`prerequisite_id`, `successor_id`),
	FOREIGN KEY (`prerequisite_id`) REFERENCES `beta_workshops`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`successor_id`) REFERENCES `beta_workshops`(`id`) ON UPDATE no action ON DELETE cascade,
	CONSTRAINT `chk_beta_relations_not_self` CHECK (`prerequisite_id` <> `successor_id`)
);
--> statement-breakpoint
CREATE TABLE `beta_completions` (
	`user_id` text NOT NULL,
	`workshop_id` integer NOT NULL,
	`completed_at` text NOT NULL,
	PRIMARY KEY(`user_id`, `workshop_id`),
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`workshop_id`) REFERENCES `beta_workshops`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `beta_roadmaps` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`title` text NOT NULL,
	`summary` text NOT NULL,
	`audience` text NOT NULL,
	`status` text NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	CONSTRAINT `chk_beta_roadmap_status` CHECK (`status` IN ('draft', 'published'))
);
--> statement-breakpoint
CREATE TABLE `beta_roadmap_stages` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`roadmap_id` integer NOT NULL,
	`position` integer NOT NULL,
	`title` text NOT NULL,
	`description` text NOT NULL,
	FOREIGN KEY (`roadmap_id`) REFERENCES `beta_roadmaps`(`id`) ON UPDATE no action ON DELETE cascade,
	UNIQUE(`roadmap_id`,`position`)
);
--> statement-breakpoint
CREATE TABLE `beta_roadmap_items` (
	`stage_id` integer NOT NULL,
	`workshop_id` integer NOT NULL,
	`position` integer NOT NULL,
	`note` text NOT NULL,
	PRIMARY KEY(`stage_id`, `workshop_id`),
	FOREIGN KEY (`stage_id`) REFERENCES `beta_roadmap_stages`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`workshop_id`) REFERENCES `beta_workshops`(`id`) ON UPDATE no action ON DELETE cascade
);
