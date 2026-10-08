CREATE TABLE `album_shares` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`album_id` integer NOT NULL,
	`token` text NOT NULL,
	`password_hash` text,
	`expires_at` integer,
	`allow_original_download` integer DEFAULT false NOT NULL,
	`show_exif` integer DEFAULT true NOT NULL,
	`show_map` integer DEFAULT true NOT NULL,
	`is_active` integer DEFAULT true NOT NULL,
	`view_count` integer DEFAULT 0 NOT NULL,
	`last_viewed_at` integer,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`album_id`) REFERENCES `albums`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_album_shares_token` ON `album_shares` (`token`);--> statement-breakpoint
CREATE UNIQUE INDEX `idx_album_shares_album_id` ON `album_shares` (`album_id`);--> statement-breakpoint
ALTER TABLE `albums` ADD `visibility` text DEFAULT 'public' NOT NULL;--> statement-breakpoint
UPDATE `albums` SET `visibility` = 'private' WHERE `is_hidden` = 1;
