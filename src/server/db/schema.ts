import {
  pgTable,
  uuid,
  text,
  timestamp,
  integer,
  pgEnum,
  primaryKey,
  index,
  uniqueIndex,
  date,
  jsonb,
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

/**
 * Database Schema
 *
 * This file defines all database tables using Drizzle ORM.
 * Schema will be expanded in Phase 1.2.
 *
 * @see /docs/planning/app-planning-phases.md Phase 1.2
 * @see /docs/adrs/006-orm-selection.md
 */

// =============================================================================
// ENUMS
// =============================================================================

/**
 * Workspace mode enum
 * @see ADR-008: Multi-Tenancy Strategy
 */
export const workspaceModeEnum = pgEnum('workspace_mode', [
  'single-tenant',
  'multi-tenant',
]);

/**
 * Workspace role enum
 * @see ADR-008: Multi-Tenancy Strategy
 */
export const workspaceRoleEnum = pgEnum('workspace_role', [
  'owner',
  'editor',
  'viewer',
]);

/**
 * Teamspace role enum
 * @see ADR-017: Teamspace Hierarchy Architecture
 */
export const teamspaceRoleEnum = pgEnum('teamspace_role', [
  'owner',
  'admin',
  'editor',
  'viewer',
]);

/**
 * Video status enum
 * Represents the workflow stages of a video project
 */
export const videoStatusEnum = pgEnum('video_status', [
  'idea',
  'scripting',
  'filming',
  'editing',
  'review',
  'scheduled',
  'published',
  'archived',
]);

/**
 * Document type enum
 * Types of documents that can be attached to a video
 */
export const documentTypeEnum = pgEnum('document_type', [
  'script',
  'description',
  'notes',
  'thumbnail_ideas',
]);

// =============================================================================
// TABLES
// =============================================================================

/**
 * Teamspaces table
 * Represents the top-level organization/team entity
 * @see ADR-017: Teamspace Hierarchy Architecture
 */
export const teamspaces = pgTable('teamspaces', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(),
  slug: text('slug').notNull().unique(),
  externalId: text('external_id').unique(),
  mode: workspaceModeEnum('mode').notNull().default('single-tenant'),
  billingPlan: text('billing_plan'),
  billingCustomerId: text('billing_customer_id'),
  billingSubscriptionId: text('billing_subscription_id'),
  createdAt: timestamp('created_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
});

/**
 * Projects table (formerly Workspaces)
 * Represents a project within a teamspace
 * @see ADR-008: Multi-Tenancy Strategy
 * @see ADR-017: Teamspace Hierarchy Architecture
 */
export const projects = pgTable(
  'projects',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    teamspaceId: uuid('teamspace_id').references(() => teamspaces.id, {
      onDelete: 'cascade',
    }),
    name: text('name').notNull(),
    slug: text('slug').notNull(),
    mode: workspaceModeEnum('mode').notNull().default('single-tenant'),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex('projects_teamspace_slug_unique').on(
      table.teamspaceId,
      table.slug
    ),
  ]
);

/**
 * Users table
 * Stores user authentication and profile data
 */
export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  email: text('email').notNull().unique(),
  passwordHash: text('password_hash').notNull(),
  name: text('name'),
  createdAt: timestamp('created_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
});

/**
 * Teamspace Users join table
 * Links users to teamspaces with roles
 * @see ADR-017: Teamspace Hierarchy Architecture
 */
export const teamspaceUsers = pgTable(
  'teamspace_users',
  {
    teamspaceId: uuid('teamspace_id')
      .notNull()
      .references(() => teamspaces.id, { onDelete: 'cascade' }),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    role: teamspaceRoleEnum('role').notNull().default('editor'),
    joinedAt: timestamp('joined_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [primaryKey({ columns: [table.teamspaceId, table.userId] })]
);

/**
 * Project Users join table
 * Links users to projects with roles
 * @see ADR-008: Multi-Tenancy Strategy
 * @see ADR-017: Teamspace Hierarchy Architecture
 */
export const projectUsers = pgTable(
  'project_users',
  {
    projectId: uuid('project_id')
      .notNull()
      .references(() => projects.id, { onDelete: 'cascade' }),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    role: workspaceRoleEnum('role').notNull().default('editor'),
    roleOverride: workspaceRoleEnum('role_override'),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [primaryKey({ columns: [table.projectId, table.userId] })]
);

/**
 * Invitations table
 * Stores pending project invitations
 * @see Phase 5.2: Team Management
 * @see ADR-017: Teamspace Hierarchy Architecture
 */
export const invitations = pgTable(
  'invitations',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    workspaceId: uuid('workspace_id')
      .notNull()
      .references(() => projects.id, { onDelete: 'cascade' }),
    email: text('email').notNull(),
    role: workspaceRoleEnum('role').notNull().default('editor'),
    token: text('token').notNull().unique(), // 256-bit token as hex (64 chars)
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
    attempts: integer('attempts').notNull().default(0),
    createdBy: uuid('created_by')
      .notNull()
      .references(() => users.id),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    acceptedAt: timestamp('accepted_at', { withTimezone: true }),
  },
  (table) => [
    index('idx_invitations_workspace').on(table.workspaceId),
    index('idx_invitations_email').on(table.email),
    index('idx_invitations_token').on(table.token),
  ]
);

/**
 * Sessions table
 * Stores user sessions for Lucia Auth
 */
export const sessions = pgTable('sessions', {
  id: text('id').primaryKey(),
  userId: uuid('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
});

/**
 * Videos table
 * Stores video projects within projects
 * @see ADR-017: Teamspace Hierarchy Architecture
 */
export const videos = pgTable(
  'videos',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    workspaceId: uuid('workspace_id')
      .notNull()
      .references(() => projects.id, { onDelete: 'cascade' }),
    title: text('title').notNull(),
    description: text('description'),
    status: videoStatusEnum('status').notNull().default('idea'),
    dueDate: date('due_date'),
    publishDate: date('publish_date'),
    youtubeVideoId: text('youtube_video_id'),
    thumbnailUrl: text('thumbnail_url'),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    createdBy: uuid('created_by').references(() => users.id),
  },
  (table) => [
    index('idx_videos_workspace_status').on(table.workspaceId, table.status),
    index('idx_videos_workspace_due_date').on(table.workspaceId, table.dueDate),
  ]
);

/**
 * Categories table
 * Custom categories for organizing videos
 * @see ADR-017: Teamspace Hierarchy Architecture
 */
export const categories = pgTable('categories', {
  id: uuid('id').primaryKey().defaultRandom(),
  workspaceId: uuid('workspace_id')
    .notNull()
    .references(() => projects.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  color: text('color').notNull().default('#6B7280'), // Default gray (hex color)
  createdAt: timestamp('created_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
});

/**
 * Video Categories join table
 * Many-to-many relationship between videos and categories
 */
export const videoCategories = pgTable(
  'video_categories',
  {
    videoId: uuid('video_id')
      .notNull()
      .references(() => videos.id, { onDelete: 'cascade' }),
    categoryId: uuid('category_id')
      .notNull()
      .references(() => categories.id, { onDelete: 'cascade' }),
  },
  (table) => [primaryKey({ columns: [table.videoId, table.categoryId] })]
);

/**
 * Documents table
 * Stores markdown documents for videos (scripts, descriptions, notes, thumbnail ideas)
 * @see ADR-009: Versioning and Audit Approach
 */
export const documents = pgTable(
  'documents',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    videoId: uuid('video_id')
      .notNull()
      .references(() => videos.id, { onDelete: 'cascade' }),
    type: documentTypeEnum('type').notNull(),
    content: text('content').notNull().default(''),
    version: integer('version').notNull().default(1),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedBy: uuid('updated_by').references(() => users.id),
  },
  (table) => [index('idx_documents_video_type').on(table.videoId, table.type)]
);

/**
 * Document Revisions table
 * Stores version history for documents
 * @see ADR-009: Versioning and Audit Approach
 */
export const documentRevisions = pgTable(
  'document_revisions',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    documentId: uuid('document_id')
      .notNull()
      .references(() => documents.id, { onDelete: 'cascade' }),
    content: text('content').notNull(),
    version: integer('version').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    createdBy: uuid('created_by').references(() => users.id),
  },
  (table) => [
    index('idx_revisions_document_created').on(
      table.documentId,
      table.createdAt
    ),
  ]
);

/**
 * Audit Log table
 * Tracks important changes for security and debugging
 * Append-only (no updates or deletes)
 * @see ADR-009: Versioning and Audit Approach
 * @see ADR-017: Teamspace Hierarchy Architecture
 */
export const auditLog = pgTable(
  'audit_log',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    workspaceId: uuid('workspace_id')
      .notNull()
      .references(() => projects.id, { onDelete: 'cascade' }),
    userId: uuid('user_id').references(() => users.id, {
      onDelete: 'set null',
    }),
    action: text('action').notNull(),
    entityType: text('entity_type'),
    entityId: text('entity_id'),
    metadata: jsonb('metadata'),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index('idx_audit_workspace').on(table.workspaceId),
    index('idx_audit_entity').on(table.entityType, table.entityId),
  ]
);

// =============================================================================
// RELATIONS
// =============================================================================

export const teamspacesRelations = relations(teamspaces, ({ many }) => ({
  teamspaceUsers: many(teamspaceUsers),
  projects: many(projects),
}));

export const teamspaceUsersRelations = relations(teamspaceUsers, ({ one }) => ({
  teamspace: one(teamspaces, {
    fields: [teamspaceUsers.teamspaceId],
    references: [teamspaces.id],
  }),
  user: one(users, {
    fields: [teamspaceUsers.userId],
    references: [users.id],
  }),
}));

export const projectsRelations = relations(projects, ({ one, many }) => ({
  teamspace: one(teamspaces, {
    fields: [projects.teamspaceId],
    references: [teamspaces.id],
  }),
  projectUsers: many(projectUsers),
  videos: many(videos),
  categories: many(categories),
  auditLogs: many(auditLog),
  invitations: many(invitations),
}));

export const usersRelations = relations(users, ({ many }) => ({
  teamspaceUsers: many(teamspaceUsers),
  projectUsers: many(projectUsers),
  sessions: many(sessions),
  invitationsCreated: many(invitations),
}));

export const projectUsersRelations = relations(projectUsers, ({ one }) => ({
  project: one(projects, {
    fields: [projectUsers.projectId],
    references: [projects.id],
  }),
  user: one(users, {
    fields: [projectUsers.userId],
    references: [users.id],
  }),
}));

export const sessionsRelations = relations(sessions, ({ one }) => ({
  user: one(users, {
    fields: [sessions.userId],
    references: [users.id],
  }),
}));

export const videosRelations = relations(videos, ({ one, many }) => ({
  project: one(projects, {
    fields: [videos.workspaceId],
    references: [projects.id],
  }),
  creator: one(users, {
    fields: [videos.createdBy],
    references: [users.id],
  }),
  documents: many(documents),
  videoCategories: many(videoCategories),
}));

export const categoriesRelations = relations(categories, ({ one, many }) => ({
  project: one(projects, {
    fields: [categories.workspaceId],
    references: [projects.id],
  }),
  videoCategories: many(videoCategories),
}));

export const videoCategoriesRelations = relations(
  videoCategories,
  ({ one }) => ({
    video: one(videos, {
      fields: [videoCategories.videoId],
      references: [videos.id],
    }),
    category: one(categories, {
      fields: [videoCategories.categoryId],
      references: [categories.id],
    }),
  })
);

export const documentsRelations = relations(documents, ({ one, many }) => ({
  video: one(videos, {
    fields: [documents.videoId],
    references: [videos.id],
  }),
  updater: one(users, {
    fields: [documents.updatedBy],
    references: [users.id],
  }),
  revisions: many(documentRevisions),
}));

export const documentRevisionsRelations = relations(
  documentRevisions,
  ({ one }) => ({
    document: one(documents, {
      fields: [documentRevisions.documentId],
      references: [documents.id],
    }),
    creator: one(users, {
      fields: [documentRevisions.createdBy],
      references: [users.id],
    }),
  })
);

export const invitationsRelations = relations(invitations, ({ one }) => ({
  project: one(projects, {
    fields: [invitations.workspaceId],
    references: [projects.id],
  }),
  creator: one(users, {
    fields: [invitations.createdBy],
    references: [users.id],
  }),
}));

// =============================================================================
// TYPE EXPORTS
// =============================================================================

export type Teamspace = typeof teamspaces.$inferSelect;
export type NewTeamspace = typeof teamspaces.$inferInsert;

export type TeamspaceUser = typeof teamspaceUsers.$inferSelect;
export type NewTeamspaceUser = typeof teamspaceUsers.$inferInsert;

export type Project = typeof projects.$inferSelect;
export type NewProject = typeof projects.$inferInsert;

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;

export type ProjectUser = typeof projectUsers.$inferSelect;
export type NewProjectUser = typeof projectUsers.$inferInsert;

export type Session = typeof sessions.$inferSelect;
export type NewSession = typeof sessions.$inferInsert;

export type Video = typeof videos.$inferSelect;
export type NewVideo = typeof videos.$inferInsert;

export type Category = typeof categories.$inferSelect;
export type NewCategory = typeof categories.$inferInsert;

export type Document = typeof documents.$inferSelect;
export type NewDocument = typeof documents.$inferInsert;

export type DocumentRevision = typeof documentRevisions.$inferSelect;
export type NewDocumentRevision = typeof documentRevisions.$inferInsert;

export type AuditLogEntry = typeof auditLog.$inferSelect;
export type NewAuditLogEntry = typeof auditLog.$inferInsert;

export type WorkspaceMode = (typeof workspaceModeEnum.enumValues)[number];
export type WorkspaceRole = (typeof workspaceRoleEnum.enumValues)[number];
export type ProjectRole = WorkspaceRole; // Alias for renamed tables
export type TeamspaceRole = (typeof teamspaceRoleEnum.enumValues)[number];
export type VideoStatus = (typeof videoStatusEnum.enumValues)[number];
export type DocumentType = (typeof documentTypeEnum.enumValues)[number];

export type VideoCategory = typeof videoCategories.$inferSelect;
export type NewVideoCategory = typeof videoCategories.$inferInsert;

export type Invitation = typeof invitations.$inferSelect;
export type NewInvitation = typeof invitations.$inferInsert;
