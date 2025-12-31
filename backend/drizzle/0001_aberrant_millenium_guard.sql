ALTER TABLE "system_config" ADD COLUMN "oauth_provider" text;--> statement-breakpoint
ALTER TABLE "system_config" ADD COLUMN "oauth_access_token" text;--> statement-breakpoint
ALTER TABLE "system_config" ADD COLUMN "oauth_refresh_token" text;--> statement-breakpoint
ALTER TABLE "system_config" ADD COLUMN "oauth_token_expiry" timestamp;--> statement-breakpoint
ALTER TABLE "system_config" ADD COLUMN "oauth_email" text;