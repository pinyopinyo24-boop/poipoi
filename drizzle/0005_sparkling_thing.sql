CREATE TABLE `export_history` (
	`id` varchar(36) NOT NULL,
	`userId` int NOT NULL,
	`exportType` enum('analytics','model','api-config','collaboration','training-data') NOT NULL,
	`format` varchar(20) NOT NULL,
	`fileName` text NOT NULL,
	`fileUrl` text,
	`fileSize` int,
	`metadata` json,
	`status` enum('pending','processing','completed','failed') NOT NULL DEFAULT 'pending',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`completedAt` timestamp,
	CONSTRAINT `export_history_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `notifications` (
	`id` varchar(36) NOT NULL,
	`userId` int NOT NULL,
	`title` text NOT NULL,
	`message` text NOT NULL,
	`type` enum('info','success','warning','error','ai-event') NOT NULL,
	`actionUrl` text,
	`metadata` json,
	`read` boolean NOT NULL DEFAULT false,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `notifications_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `version_control` (
	`id` varchar(36) NOT NULL,
	`userId` int NOT NULL,
	`entityType` enum('model','plugin','document','config') NOT NULL,
	`entityId` varchar(255) NOT NULL,
	`entityName` text NOT NULL,
	`version` int NOT NULL,
	`versionTag` varchar(50) NOT NULL,
	`description` text,
	`content` text,
	`metadata` json,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`createdBy` int NOT NULL,
	CONSTRAINT `version_control_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE INDEX `export_history_userId_idx` ON `export_history` (`userId`);--> statement-breakpoint
CREATE INDEX `export_history_status_idx` ON `export_history` (`status`);--> statement-breakpoint
CREATE INDEX `notifications_userId_idx` ON `notifications` (`userId`);--> statement-breakpoint
CREATE INDEX `notifications_read_idx` ON `notifications` (`read`);--> statement-breakpoint
CREATE INDEX `version_control_userId_idx` ON `version_control` (`userId`);--> statement-breakpoint
CREATE INDEX `version_control_entity_idx` ON `version_control` (`entityType`,`entityId`);