-- Trained Models Table
CREATE TABLE IF NOT EXISTS `trained_models` (
  `id` text PRIMARY KEY NOT NULL,
  `user_id` text NOT NULL,
  `name` text NOT NULL,
  `description` text,
  `model_data` blob NOT NULL,
  `accuracy` real,
  `loss` real,
  `val_accuracy` real,
  `val_loss` real,
  `epochs` integer,
  `is_active` integer DEFAULT 1,
  `created_at` integer NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` integer NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX `trained_models_user_id_idx` ON `trained_models` (`user_id`);
CREATE INDEX `trained_models_created_at_idx` ON `trained_models` (`created_at`);

-- Model Versions Table
CREATE TABLE IF NOT EXISTS `model_versions` (
  `id` text PRIMARY KEY NOT NULL,
  `model_id` text NOT NULL,
  `version` integer NOT NULL,
  `model_data` blob NOT NULL,
  `accuracy` real,
  `loss` real,
  `change_log` text,
  `created_at` integer NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`model_id`) REFERENCES `trained_models` (`id`) ON DELETE CASCADE
);

CREATE INDEX `model_versions_model_id_idx` ON `model_versions` (`model_id`);

-- API Test Results Table
CREATE TABLE IF NOT EXISTS `api_test_results` (
  `id` text PRIMARY KEY NOT NULL,
  `user_id` text NOT NULL,
  `endpoint` text NOT NULL,
  `method` text NOT NULL,
  `status_code` integer,
  `response_time` integer,
  `success` integer NOT NULL,
  `error_message` text,
  `response_data` blob,
  `test_type` text,
  `created_at` integer NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX `api_test_results_user_id_idx` ON `api_test_results` (`user_id`);
CREATE INDEX `api_test_results_endpoint_idx` ON `api_test_results` (`endpoint`);
CREATE INDEX `api_test_results_created_at_idx` ON `api_test_results` (`created_at`);

-- Collaboration Sessions Table
CREATE TABLE IF NOT EXISTS `collaboration_sessions` (
  `id` text PRIMARY KEY NOT NULL,
  `created_by` text NOT NULL,
  `name` text NOT NULL,
  `description` text,
  `session_data` blob,
  `is_active` integer DEFAULT 1,
  `created_at` integer NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` integer NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX `collab_sessions_created_by_idx` ON `collaboration_sessions` (`created_by`);
CREATE INDEX `collab_sessions_created_at_idx` ON `collaboration_sessions` (`created_at`);

-- Collaboration Members Table
CREATE TABLE IF NOT EXISTS `collaboration_members` (
  `id` text PRIMARY KEY NOT NULL,
  `session_id` text NOT NULL,
  `user_id` text NOT NULL,
  `role` text NOT NULL,
  `joined_at` integer NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`session_id`) REFERENCES `collaboration_sessions` (`id`) ON DELETE CASCADE
);

CREATE INDEX `collab_members_session_id_idx` ON `collaboration_members` (`session_id`);
CREATE INDEX `collab_members_user_id_idx` ON `collaboration_members` (`user_id`);

-- API Integrations Table
CREATE TABLE IF NOT EXISTS `api_integrations` (
  `id` text PRIMARY KEY NOT NULL,
  `user_id` text NOT NULL,
  `name` text NOT NULL,
  `endpoint` text NOT NULL,
  `method` text NOT NULL,
  `headers` blob,
  `auth_type` text,
  `auth_token` text,
  `description` text,
  `is_active` integer DEFAULT 1,
  `created_at` integer NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` integer NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX `api_integrations_user_id_idx` ON `api_integrations` (`user_id`);
CREATE INDEX `api_integrations_endpoint_idx` ON `api_integrations` (`endpoint`);

-- Training Jobs Table
CREATE TABLE IF NOT EXISTS `training_jobs` (
  `id` text PRIMARY KEY NOT NULL,
  `user_id` text NOT NULL,
  `model_id` text,
  `name` text NOT NULL,
  `status` text NOT NULL,
  `progress` integer DEFAULT 0,
  `total_epochs` integer,
  `completed_epochs` integer DEFAULT 0,
  `current_loss` real,
  `current_accuracy` real,
  `error_message` text,
  `started_at` integer,
  `completed_at` integer,
  `created_at` integer NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX `training_jobs_user_id_idx` ON `training_jobs` (`user_id`);
CREATE INDEX `training_jobs_status_idx` ON `training_jobs` (`status`);
CREATE INDEX `training_jobs_created_at_idx` ON `training_jobs` (`created_at`);

-- Streaming Sessions Table
CREATE TABLE IF NOT EXISTS `streaming_sessions` (
  `id` text PRIMARY KEY NOT NULL,
  `user_id` text NOT NULL,
  `session_type` text NOT NULL,
  `status` text NOT NULL,
  `total_tokens` integer DEFAULT 0,
  `tokens_per_second` real,
  `started_at` integer NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `completed_at` integer
);

CREATE INDEX `streaming_sessions_user_id_idx` ON `streaming_sessions` (`user_id`);
CREATE INDEX `streaming_sessions_status_idx` ON `streaming_sessions` (`status`);
