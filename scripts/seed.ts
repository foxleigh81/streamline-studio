/**
 * Database Seed Script
 *
 * Creates initial development data for testing and development.
 * Run with: npx tsx scripts/seed.ts
 *
 * Prerequisites:
 * 1. PostgreSQL running (via docker-compose or locally)
 * 2. DATABASE_URL environment variable set
 * 3. Migrations have been run (npm run db:migrate)
 *
 * @see /docs/planning/app-planning-phases.md Phase 1.2.13
 */

/* eslint-disable no-console -- Console output is expected in CLI seed scripts */

import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as schema from '../src/server/db/schema';

// Known test credentials for development
const TEST_USER = {
  email: 'test@example.com',
  // Password: 'password123' - in production, this would be hashed with Argon2id
  // For seeding, we use a placeholder hash. The actual hash will be generated
  // by the auth system during login/registration.
  passwordHash: '$argon2id$v=19$m=65536,t=3,p=4$placeholder$hash',
  name: 'Test User',
};

const TEST_WORKSPACE = {
  name: 'Test Workspace',
  slug: 'test-workspace',
};

// Sample video statuses for variety (reference for available statuses)
const _VIDEO_STATUSES: schema.VideoStatus[] = [
  'idea',
  'scripting',
  'filming',
  'editing',
  'scheduled',
  'published',
];

// Sample categories with colors
const SAMPLE_CATEGORIES = [
  { name: 'Tutorial', color: '#3B82F6' }, // Blue
  { name: 'Review', color: '#10B981' }, // Green
  { name: 'Vlog', color: '#F59E0B' }, // Amber
  { name: 'News', color: '#EF4444' }, // Red
  { name: 'Live Stream', color: '#8B5CF6' }, // Purple
];

// Sample video data
const SAMPLE_VIDEOS = [
  {
    title: 'Getting Started with TypeScript',
    description: 'A beginner-friendly introduction to TypeScript',
    status: 'published' as const,
    dueDate: '2025-01-15',
    publishDate: '2025-01-20',
  },
  {
    title: 'React 19 New Features',
    description: 'Deep dive into the latest React features',
    status: 'editing' as const,
    dueDate: '2025-02-01',
  },
  {
    title: 'Building a Full-Stack App with Next.js',
    description: 'Complete walkthrough of building a production app',
    status: 'scripting' as const,
    dueDate: '2025-02-15',
  },
  {
    title: 'Database Design Best Practices',
    description: 'How to structure your database for scalability',
    status: 'idea' as const,
  },
  {
    title: 'Docker for Developers',
    description: 'Essential Docker knowledge for modern development',
    status: 'filming' as const,
    dueDate: '2025-01-25',
  },
  {
    title: 'CI/CD Pipeline Setup',
    description: 'Automate your deployment workflow',
    status: 'scheduled' as const,
    dueDate: '2025-01-10',
    publishDate: '2025-01-12',
  },
];

// Sample document content
const SCRIPT_CONTENT = `# Video Script

## Introduction
- Hook: Start with an interesting fact or question
- Brief overview of what we'll cover

## Main Content
### Section 1
- Key point 1
- Key point 2
- Demonstration

### Section 2
- Key point 3
- Example walkthrough

## Conclusion
- Summary of key takeaways
- Call to action
- Next video teaser
`;

const DESCRIPTION_CONTENT = `In this video, we explore...

Topics covered:
- Topic 1
- Topic 2
- Topic 3

Links mentioned:
- Link 1
- Link 2

Follow me:
- Twitter: @example
- GitHub: github.com/example
`;

const NOTES_CONTENT = `## Production Notes

### Equipment
- Camera: Sony A7IV
- Microphone: Blue Yeti
- Lighting: Elgato Key Light

### Post-production
- [ ] Edit main footage
- [ ] Add B-roll
- [ ] Color correction
- [ ] Audio mixing
- [ ] Add captions
`;

const THUMBNAIL_IDEAS_CONTENT = `## Thumbnail Ideas

### Concept 1
- Bright background
- Shocked face expression
- Large text overlay

### Concept 2
- Code on screen
- Minimalist design
- Brand colors

### Notes
- Keep text minimal (3-4 words max)
- High contrast for mobile visibility
`;

async function seed() {
  console.log('Starting database seed...\n');

  const connectionString =
    process.env.DATABASE_URL ??
    'postgresql://streamline:password@localhost:5432/streamline';

  const pool = new Pool({ connectionString });
  const db = drizzle(pool, { schema });

  try {
    // Clean existing data (in reverse dependency order)
    console.log('Cleaning existing data...');
    await db.delete(schema.auditLog);
    await db.delete(schema.documentRevisions);
    await db.delete(schema.documents);
    await db.delete(schema.videoCategories);
    await db.delete(schema.videos);
    await db.delete(schema.categories);
    await db.delete(schema.sessions);
    await db.delete(schema.workspaceUsers);
    await db.delete(schema.users);
    await db.delete(schema.workspaces);
    console.log('Existing data cleaned.\n');

    // Create test workspace
    console.log('Creating test workspace...');
    const [workspace] = await db
      .insert(schema.workspaces)
      .values({
        name: TEST_WORKSPACE.name,
        slug: TEST_WORKSPACE.slug,
        mode: 'single-tenant',
      })
      .returning();

    if (!workspace) {
      throw new Error('Failed to create workspace');
    }
    console.log(`Created workspace: ${workspace.name} (${workspace.id})\n`);

    // Create test user
    console.log('Creating test user...');
    const [user] = await db
      .insert(schema.users)
      .values({
        email: TEST_USER.email,
        passwordHash: TEST_USER.passwordHash,
        name: TEST_USER.name,
      })
      .returning();

    if (!user) {
      throw new Error('Failed to create user');
    }
    console.log(`Created user: ${user.email} (${user.id})\n`);

    // Link user to workspace as owner
    console.log('Linking user to workspace...');
    await db.insert(schema.workspaceUsers).values({
      workspaceId: workspace.id,
      userId: user.id,
      role: 'owner',
    });
    console.log('User linked as workspace owner.\n');

    // Create categories
    console.log('Creating categories...');
    const categoryRecords = await db
      .insert(schema.categories)
      .values(
        SAMPLE_CATEGORIES.map((cat) => ({
          workspaceId: workspace.id,
          name: cat.name,
          color: cat.color,
        }))
      )
      .returning();
    console.log(`Created ${categoryRecords.length} categories.\n`);

    // Create videos with documents
    console.log('Creating videos with documents...');
    for (const videoData of SAMPLE_VIDEOS) {
      // Create video
      const [video] = await db
        .insert(schema.videos)
        .values({
          workspaceId: workspace.id,
          title: videoData.title,
          description: videoData.description,
          status: videoData.status,
          dueDate: videoData.dueDate ?? null,
          publishDate: videoData.publishDate ?? null,
          createdBy: user.id,
        })
        .returning();

      if (!video) {
        throw new Error(`Failed to create video: ${videoData.title}`);
      }

      console.log(`  Created video: ${video.title}`);

      // Create all document types for this video
      const documentTypes: Array<{
        type: schema.DocumentType;
        content: string;
      }> = [
        { type: 'script', content: SCRIPT_CONTENT },
        { type: 'description', content: DESCRIPTION_CONTENT },
        { type: 'notes', content: NOTES_CONTENT },
        { type: 'thumbnail_ideas', content: THUMBNAIL_IDEAS_CONTENT },
      ];

      for (const doc of documentTypes) {
        await db.insert(schema.documents).values({
          videoId: video.id,
          type: doc.type,
          content: doc.content,
          version: 1,
          updatedBy: user.id,
        });
      }

      // Assign random categories to this video (1-3 categories)
      const numCategories = Math.floor(Math.random() * 3) + 1;
      const shuffledCategories = [...categoryRecords].sort(
        () => Math.random() - 0.5
      );
      const selectedCategories = shuffledCategories.slice(0, numCategories);

      for (const category of selectedCategories) {
        await db.insert(schema.videoCategories).values({
          videoId: video.id,
          categoryId: category.id,
        });
      }
    }
    console.log(`\nCreated ${SAMPLE_VIDEOS.length} videos with documents.\n`);

    // Create sample audit log entries
    console.log('Creating sample audit log entries...');
    await db.insert(schema.auditLog).values([
      {
        workspaceId: workspace.id,
        userId: user.id,
        action: 'create',
        entityType: 'workspace',
        entityId: workspace.id,
        metadata: { name: workspace.name },
      },
      {
        workspaceId: workspace.id,
        userId: user.id,
        action: 'update',
        entityType: 'video',
        entityId: 'sample-video-id',
        metadata: { status: { from: 'idea', to: 'scripting' } },
      },
    ]);
    console.log('Created sample audit log entries.\n');

    console.log('='.repeat(50));
    console.log('Seed completed successfully!');
    console.log('='.repeat(50));
    console.log('\nTest credentials:');
    console.log(`  Email: ${TEST_USER.email}`);
    console.log('  Password: password123 (use auth system to set actual hash)');
    console.log(`\nWorkspace: ${TEST_WORKSPACE.name}`);
    console.log(`  Slug: ${TEST_WORKSPACE.slug}`);
    console.log(`  Videos: ${SAMPLE_VIDEOS.length}`);
    console.log(`  Categories: ${SAMPLE_CATEGORIES.length}`);
  } catch (error) {
    console.error('Seed failed:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

// Run the seed
seed();
