CREATE TABLE `scheduleMemories` (
	`id` varchar(36) NOT NULL,
	`userId` int NOT NULL,
	`memoryType` enum('pattern','preference','insight','suggestion') NOT NULL,
	`content` text NOT NULL,
	`relatedScheduleIds` json,
	`confidence` decimal(3,2) NOT NULL DEFAULT '0.50',
	`tags` json,
	`usageCount` int NOT NULL DEFAULT 0,
	`lastUsed` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `scheduleMemories_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `schedules` (
	`id` varchar(36) NOT NULL,
	`userId` int NOT NULL,
	`title` text NOT NULL,
	`description` text,
	`scheduledDate` date NOT NULL,
	`startTime` varchar(5),
	`endTime` varchar(5),
	`priority` enum('low','medium','high','urgent') NOT NULL DEFAULT 'medium',
	`status` enum('pending','in-progress','completed','cancelled') NOT NULL DEFAULT 'pending',
	`category` varchar(100),
	`tags` json,
	`location` text,
	`metadata` json,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `schedules_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE INDEX `scheduleMemories_userId_idx` ON `scheduleMemories` (`userId`);--> statement-breakpoint
CREATE INDEX `scheduleMemories_memoryType_idx` ON `scheduleMemories` (`memoryType`);--> statement-breakpoint
CREATE INDEX `scheduleMemories_confidence_idx` ON `scheduleMemories` (`confidence`);--> statement-breakpoint
CREATE INDEX `schedules_userId_idx` ON `schedules` (`userId`);--> statement-breakpoint
CREATE INDEX `schedules_scheduledDate_idx` ON `schedules` (`scheduledDate`);--> statement-breakpoint
CREATE INDEX `schedules_status_idx` ON `schedules` (`status`);--> statement-breakpoint
CREATE INDEX `schedules_priority_idx` ON `schedules` (`priority`);--> statement-breakpoint
CREATE INDEX `schedules_userId_scheduledDate_idx` ON `schedules` (`userId`,`scheduledDate`);