CREATE TABLE `notificationChannels` (
	`id` varchar(36) NOT NULL,
	`userId` int NOT NULL,
	`deviceId` varchar(255) NOT NULL,
	`fcmToken` text NOT NULL,
	`platform` enum('android','ios','web') NOT NULL,
	`isActive` boolean NOT NULL DEFAULT true,
	`lastUpdatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `notificationChannels_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `notificationHistory` (
	`id` varchar(36) NOT NULL,
	`userId` int NOT NULL,
	`scheduleId` varchar(36),
	`sentAt` timestamp NOT NULL DEFAULT (now()),
	`status` enum('sent','failed','bounced') NOT NULL DEFAULT 'sent',
	`channel` enum('push','email','sms') NOT NULL,
	`response` json,
	`metadata` json,
	CONSTRAINT `notificationHistory_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `recurrenceRules` (
	`id` varchar(36) NOT NULL,
	`userId` int NOT NULL,
	`scheduleId` varchar(36) NOT NULL,
	`frequency` enum('daily','weekly','monthly','yearly') NOT NULL,
	`interval` int NOT NULL DEFAULT 1,
	`daysOfWeek` json,
	`daysOfMonth` json,
	`monthsOfYear` json,
	`startDate` date NOT NULL,
	`endDate` date,
	`occurrences` int,
	`isActive` boolean NOT NULL DEFAULT true,
	`metadata` json,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `recurrenceRules_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `reminders` (
	`id` varchar(36) NOT NULL,
	`userId` int NOT NULL,
	`scheduleId` varchar(36) NOT NULL,
	`reminderTime` varchar(5),
	`frequency` enum('once','daily','weekly','monthly') NOT NULL DEFAULT 'once',
	`isActive` boolean NOT NULL DEFAULT true,
	`lastSentAt` timestamp,
	`nextSendAt` timestamp,
	`metadata` json,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `reminders_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE INDEX `notificationChannels_userId_idx` ON `notificationChannels` (`userId`);--> statement-breakpoint
CREATE INDEX `notificationChannels_deviceId_idx` ON `notificationChannels` (`deviceId`);--> statement-breakpoint
CREATE INDEX `notificationChannels_isActive_idx` ON `notificationChannels` (`isActive`);--> statement-breakpoint
CREATE INDEX `notificationHistory_userId_idx` ON `notificationHistory` (`userId`);--> statement-breakpoint
CREATE INDEX `notificationHistory_scheduleId_idx` ON `notificationHistory` (`scheduleId`);--> statement-breakpoint
CREATE INDEX `notificationHistory_sentAt_idx` ON `notificationHistory` (`sentAt`);--> statement-breakpoint
CREATE INDEX `recurrenceRules_userId_idx` ON `recurrenceRules` (`userId`);--> statement-breakpoint
CREATE INDEX `recurrenceRules_scheduleId_idx` ON `recurrenceRules` (`scheduleId`);--> statement-breakpoint
CREATE INDEX `recurrenceRules_isActive_idx` ON `recurrenceRules` (`isActive`);--> statement-breakpoint
CREATE INDEX `reminders_userId_idx` ON `reminders` (`userId`);--> statement-breakpoint
CREATE INDEX `reminders_scheduleId_idx` ON `reminders` (`scheduleId`);--> statement-breakpoint
CREATE INDEX `reminders_isActive_idx` ON `reminders` (`isActive`);--> statement-breakpoint
CREATE INDEX `reminders_nextSendAt_idx` ON `reminders` (`nextSendAt`);