CREATE TABLE `credential_documents` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`credential_id` integer NOT NULL,
	`name` text NOT NULL,
	`type` text NOT NULL,
	`file_type` text,
	`url` text NOT NULL,
	`size` integer,
	`created_at` integer,
	FOREIGN KEY (`credential_id`) REFERENCES `credentials`(`id`) ON UPDATE no action ON DELETE no action
);
