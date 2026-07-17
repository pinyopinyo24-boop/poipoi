CREATE TABLE `history` (
	`id` varchar(36) NOT NULL,
	`userId` int NOT NULL,
	`type` varchar(50) NOT NULL,
	`title` text NOT NULL,
	`content` text,
	`metadata` json,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `history_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `long_term_memory` (
	`id` varchar(36) NOT NULL,
	`userId` int NOT NULL,
	`memoryType` enum('preference','context','learning','relationship','skill') NOT NULL,
	`key` varchar(255) NOT NULL,
	`value` text NOT NULL,
	`importance` int NOT NULL DEFAULT 1,
	`metadata` json,
	`lastAccessed` timestamp NOT NULL DEFAULT (now()),
	`accessCount` int NOT NULL DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `long_term_memory_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE INDEX `history_userId_idx` ON `history` (`userId`);--> statement-breakpoint
CREATE INDEX `history_type_idx` ON `history` (`type`);--> statement-breakpoint
CREATE INDEX `long_term_memory_userId_idx` ON `long_term_memory` (`userId`);--> statement-breakpoint
CREATE INDEX `long_term_memory_memoryType_idx` ON `long_term_memory` (`memoryType`);--> statement-breakpoint
CREATE INDEX `long_term_memory_key_idx` ON `long_term_memory` (`key`);