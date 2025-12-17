CREATE TYPE "public"."date_format" AS ENUM('ISO', 'US', 'EU', 'UK');--> statement-breakpoint
CREATE TYPE "public"."time_format" AS ENUM('12h', '24h');--> statement-breakpoint
CREATE TYPE "public"."view_mode" AS ENUM('grid', 'table');--> statement-breakpoint
CREATE TABLE "user_preferences" (
	"user_id" uuid PRIMARY KEY NOT NULL,
	"default_channel_id" uuid,
	"content_plan_view_mode" "view_mode" DEFAULT 'grid' NOT NULL,
	"date_format" date_format DEFAULT 'ISO' NOT NULL,
	"time_format" time_format DEFAULT '24h' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "user_preferences" ADD CONSTRAINT "user_preferences_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_preferences" ADD CONSTRAINT "user_preferences_default_channel_id_channels_id_fk" FOREIGN KEY ("default_channel_id") REFERENCES "public"."channels"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_user_preferences_default_channel" ON "user_preferences" USING btree ("default_channel_id");