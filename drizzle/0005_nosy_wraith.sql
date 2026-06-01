CREATE TABLE `quotaTracking` (
	`id` int AUTO_INCREMENT NOT NULL,
	`quotaId` int NOT NULL,
	`cotaNumero` int NOT NULL,
	`dataEnvio` timestamp NOT NULL DEFAULT (now()),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `quotaTracking_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `quotas` ADD `cotasEnviadas` int DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `quotaTracking` ADD CONSTRAINT `quotaTracking_quotaId_quotas_id_fk` FOREIGN KEY (`quotaId`) REFERENCES `quotas`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `idx_quota_tracking_quota_id` ON `quotaTracking` (`quotaId`);