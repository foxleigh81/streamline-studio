CREATE TYPE "public"."document_type" AS ENUM('script', 'description', 'notes', 'thumbnail_ideas');--> statement-breakpoint
CREATE TYPE "public"."teamspace_role" AS ENUM('owner', 'admin', 'editor', 'viewer');--> statement-breakpoint
CREATE TYPE "public"."video_status" AS ENUM('idea', 'scripting', 'filming', 'editing', 'review', 'scheduled', 'published', 'archived');--> statement-breakpoint
CREATE TYPE "public"."workspace_mode" AS ENUM('single-tenant', 'multi-tenant');--> statement-breakpoint
CREATE TYPE "public"."workspace_role" AS ENUM('owner', 'editor', 'viewer');--> statement-breakpoint
CREATE TABLE "audit_log" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspace_id" uuid NOT NULL,
	"user_id" uuid,
	"action" text NOT NULL,
	"entity_type" text,
	"entity_id" text,
	"metadata" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "categories" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspace_id" uuid NOT NULL,
	"name" text NOT NULL,
	"color" text DEFAULT '#6B7280' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "document_revisions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"document_id" uuid NOT NULL,
	"content" text NOT NULL,
	"version" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" uuid
);
--> statement-breakpoint
CREATE TABLE "documents" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"video_id" uuid NOT NULL,
	"type" "document_type" NOT NULL,
	"content" text DEFAULT '' NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_by" uuid
);
--> statement-breakpoint
CREATE TABLE "invitations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspace_id" uuid NOT NULL,
	"email" text NOT NULL,
	"role" "workspace_role" DEFAULT 'editor' NOT NULL,
	"token" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"attempts" integer DEFAULT 0 NOT NULL,
	"created_by" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"accepted_at" timestamp with time zone,
	CONSTRAINT "invitations_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE "project_users" (
	"project_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"role" "workspace_role" DEFAULT 'editor' NOT NULL,
	"role_override" "workspace_role",
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "project_users_project_id_user_id_pk" PRIMARY KEY("project_id","user_id")
);
--> statement-breakpoint
CREATE TABLE "projects" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"teamspace_id" uuid,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"mode" "workspace_mode" DEFAULT 'single-tenant' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sessions" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" uuid NOT NULL,
	"expires_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "teamspace_users" (
	"teamspace_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"role" "teamspace_role" DEFAULT 'editor' NOT NULL,
	"joined_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "teamspace_users_teamspace_id_user_id_pk" PRIMARY KEY("teamspace_id","user_id")
);
--> statement-breakpoint
CREATE TABLE "teamspaces" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"external_id" text,
	"mode" "workspace_mode" DEFAULT 'single-tenant' NOT NULL,
	"billing_plan" text,
	"billing_customer_id" text,
	"billing_subscription_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "teamspaces_slug_unique" UNIQUE("slug"),
	CONSTRAINT "teamspaces_external_id_unique" UNIQUE("external_id")
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" text NOT NULL,
	"password_hash" text NOT NULL,
	"name" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "video_categories" (
	"video_id" uuid NOT NULL,
	"category_id" uuid NOT NULL,
	CONSTRAINT "video_categories_video_id_category_id_pk" PRIMARY KEY("video_id","category_id")
);
--> statement-breakpoint
CREATE TABLE "videos" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspace_id" uuid NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"status" "video_status" DEFAULT 'idea' NOT NULL,
	"due_date" date,
	"publish_date" date,
	"youtube_video_id" text,
	"thumbnail_url" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" uuid
);
--> statement-breakpoint
ALTER TABLE "audit_log" ADD CONSTRAINT "audit_log_workspace_id_projects_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audit_log" ADD CONSTRAINT "audit_log_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "categories" ADD CONSTRAINT "categories_workspace_id_projects_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "document_revisions" ADD CONSTRAINT "document_revisions_document_id_documents_id_fk" FOREIGN KEY ("document_id") REFERENCES "public"."documents"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "document_revisions" ADD CONSTRAINT "document_revisions_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "documents" ADD CONSTRAINT "documents_video_id_videos_id_fk" FOREIGN KEY ("video_id") REFERENCES "public"."videos"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "documents" ADD CONSTRAINT "documents_updated_by_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invitations" ADD CONSTRAINT "invitations_workspace_id_projects_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invitations" ADD CONSTRAINT "invitations_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_users" ADD CONSTRAINT "project_users_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_users" ADD CONSTRAINT "project_users_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "projects" ADD CONSTRAINT "projects_teamspace_id_teamspaces_id_fk" FOREIGN KEY ("teamspace_id") REFERENCES "public"."teamspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "teamspace_users" ADD CONSTRAINT "teamspace_users_teamspace_id_teamspaces_id_fk" FOREIGN KEY ("teamspace_id") REFERENCES "public"."teamspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "teamspace_users" ADD CONSTRAINT "teamspace_users_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "video_categories" ADD CONSTRAINT "video_categories_video_id_videos_id_fk" FOREIGN KEY ("video_id") REFERENCES "public"."videos"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "video_categories" ADD CONSTRAINT "video_categories_category_id_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."categories"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "videos" ADD CONSTRAINT "videos_workspace_id_projects_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "videos" ADD CONSTRAINT "videos_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_audit_workspace" ON "audit_log" USING btree ("workspace_id");--> statement-breakpoint
CREATE INDEX "idx_audit_entity" ON "audit_log" USING btree ("entity_type","entity_id");--> statement-breakpoint
CREATE INDEX "idx_revisions_document_created" ON "document_revisions" USING btree ("document_id","created_at");--> statement-breakpoint
CREATE INDEX "idx_documents_video_type" ON "documents" USING btree ("video_id","type");--> statement-breakpoint
CREATE INDEX "idx_invitations_workspace" ON "invitations" USING btree ("workspace_id");--> statement-breakpoint
CREATE INDEX "idx_invitations_email" ON "invitations" USING btree ("email");--> statement-breakpoint
CREATE INDEX "idx_invitations_token" ON "invitations" USING btree ("token");--> statement-breakpoint
CREATE UNIQUE INDEX "projects_teamspace_slug_unique" ON "projects" USING btree ("teamspace_id","slug");--> statement-breakpoint
CREATE INDEX "idx_videos_workspace_status" ON "videos" USING btree ("workspace_id","status");--> statement-breakpoint
CREATE INDEX "idx_videos_workspace_due_date" ON "videos" USING btree ("workspace_id","due_date");