CREATE TABLE `faceSwapResults` (
	`id` varchar(36) NOT NULL,
	`userId` int NOT NULL,
	`sourceFileName` varchar(255) NOT NULL,
	`targetFileName` varchar(255) NOT NULL,
	`resultImageUrl` text NOT NULL,
	`resultImageKey` varchar(255) NOT NULL,
	`quality` enum('low','medium','high') NOT NULL DEFAULT 'medium',
	`processingTime` int NOT NULL,
	`metadata` json,
	`isPublic` boolean NOT NULL DEFAULT false,
	`shareToken` varchar(64),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `faceSwapResults_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `feedback` (
	`id` varchar(36) NOT NULL,
	`type` enum('bug','feature','suggestion','other') NOT NULL,
	`title` varchar(200) NOT NULL,
	`message` text NOT NULL,
	`email` varchar(320),
	`userId` int,
	`status` enum('new','reviewing','resolved') NOT NULL DEFAULT 'new',
	`metadata` json,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `feedback_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE INDEX `faceSwapResults_userId_idx` ON `faceSwapResults` (`userId`);--> statement-breakpoint
CREATE INDEX `faceSwapResults_createdAt_idx` ON `faceSwapResults` (`createdAt`);--> statement-breakpoint
CREATE INDEX `faceSwapResults_isPublic_idx` ON `faceSwapResults` (`isPublic`);--> statement-breakpoint
CREATE INDEX `feedback_userId_idx` ON `feedback` (`userId`);--> statement-breakpoint
CREATE INDEX `feedback_type_idx` ON `feedback` (`type`);--> statement-breakpoint
CREATE INDEX `feedback_status_idx` ON `feedback` (`status`);