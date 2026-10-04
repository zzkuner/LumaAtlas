ALTER TABLE `photos` ADD `is_visible` integer DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE `photos` ADD `is_featured` integer DEFAULT false NOT NULL;