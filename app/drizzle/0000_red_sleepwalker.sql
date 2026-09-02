CREATE TABLE `badges` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`description` text NOT NULL,
	`required_completion_count` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `completions` (
	`user_id` text NOT NULL,
	`workshop_id` text NOT NULL,
	`completed_at` text NOT NULL,
	PRIMARY KEY(`user_id`, `workshop_id`),
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`workshop_id`) REFERENCES `workshops`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `user_badges` (
	`user_id` text NOT NULL,
	`badge_id` text NOT NULL,
	`awarded_at` text NOT NULL,
	PRIMARY KEY(`user_id`, `badge_id`),
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`badge_id`) REFERENCES `badges`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `users` (
	`id` text PRIMARY KEY NOT NULL,
	`display_name` text NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `workshop_relations` (
	`prerequisite_id` text NOT NULL,
	`successor_id` text NOT NULL,
	`created_at` text NOT NULL,
	PRIMARY KEY(`prerequisite_id`, `successor_id`),
	FOREIGN KEY (`prerequisite_id`) REFERENCES `workshops`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`successor_id`) REFERENCES `workshops`(`id`) ON UPDATE no action ON DELETE cascade,
	CONSTRAINT "chk_workshop_relations_not_self" CHECK("workshop_relations"."prerequisite_id" <> "workshop_relations"."successor_id")
);
--> statement-breakpoint
CREATE INDEX `idx_workshop_relations_successor` ON `workshop_relations` (`successor_id`);--> statement-breakpoint
CREATE TABLE `workshops` (
	`id` text PRIMARY KEY NOT NULL,
	`title` text NOT NULL,
	`summary` text NOT NULL,
	`description` text NOT NULL,
	`category` text NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_workshops_category` ON `workshops` (`category`);