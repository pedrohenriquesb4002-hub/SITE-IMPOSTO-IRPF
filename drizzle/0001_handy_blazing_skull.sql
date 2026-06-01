CREATE TABLE `collaborators` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`name` varchar(255) NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `collaborators_id` PRIMARY KEY(`id`),
	CONSTRAINT `collaborators_userId_name_unique` UNIQUE(`userId`,`name`)
);
--> statement-breakpoint
CREATE TABLE `declarations` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`month` enum('Março','Abril','Maio') NOT NULL,
	`collaborator` varchar(255) NOT NULL,
	`cpfCliente` varchar(20),
	`cliente` varchar(255) NOT NULL,
	`valorRecebido` int NOT NULL,
	`clienteType` enum('Sócio','Diversos') NOT NULL,
	`comissao` int,
	`statusPagamento` enum('PAGO','AGUARDANDO','DOAÇÃO') NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `declarations_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `quotas` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`collaborator` varchar(255) NOT NULL,
	`cliente` varchar(255) NOT NULL,
	`quantidadeCotas` int NOT NULL,
	`meioEnvio` enum('WhatsApp','Email','SMS','Presencial','Outro') NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `quotas_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `settings` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`percentualDiversos` int NOT NULL DEFAULT 10,
	`valorFixoSocio` int NOT NULL DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `settings_id` PRIMARY KEY(`id`),
	CONSTRAINT `settings_userId_unique` UNIQUE(`userId`)
);
--> statement-breakpoint
ALTER TABLE `collaborators` ADD CONSTRAINT `collaborators_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `declarations` ADD CONSTRAINT `declarations_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `quotas` ADD CONSTRAINT `quotas_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `settings` ADD CONSTRAINT `settings_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `idx_user_month` ON `declarations` (`userId`,`month`);--> statement-breakpoint
CREATE INDEX `idx_user_collaborator` ON `declarations` (`userId`,`collaborator`);--> statement-breakpoint
CREATE INDEX `idx_user_status` ON `declarations` (`userId`,`statusPagamento`);--> statement-breakpoint
CREATE INDEX `idx_quotas_user_collaborator` ON `quotas` (`userId`,`collaborator`);