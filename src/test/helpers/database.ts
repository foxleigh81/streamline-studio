/**
 * Test Database Helpers
 *
 * Provides utilities for setting up and managing test databases.
 * Uses a separate test database to avoid affecting development data.
 *
 * @see /docs/adrs/005-testing-strategy.md
 */

import { drizzle } from 'drizzle-orm/node-postgres';
// eslint-disable-next-line no-restricted-imports -- Required for test database setup and teardown
import { sql } from 'drizzle-orm';
import { Pool } from 'pg';
import * as schema from '@/server/db/schema';
import { hashPassword } from '@/lib/auth/password';

// Test database URL - defaults to a test database
const TEST_DATABASE_URL =
  process.env.TEST_DATABASE_URL ??
  'postgresql://postgres:postgres@localhost:5432/streamline_test';

let pool: Pool | null = null;
let testDb: ReturnType<typeof drizzle<typeof schema>> | null = null;
let databaseAvailable: boolean | null = null;

/**
 * Check if the test database is available
 * Caches the result to avoid repeated connection attempts
 */
export async function isDatabaseAvailable(): Promise<boolean> {
  if (databaseAvailable !== null) {
    return databaseAvailable;
  }

  try {
    const testPool = new Pool({
      connectionString: TEST_DATABASE_URL,
      max: 1,
      connectionTimeoutMillis: 3000, // 3 second timeout
    });

    const client = await testPool.connect();
    await client.query('SELECT 1');
    client.release();
    await testPool.end();

    databaseAvailable = true;
  } catch {
    databaseAvailable = false;
    console.warn(
      '\n⚠️  Test database not available. Database tests will be skipped.\n' +
        '   To run database tests, start PostgreSQL and ensure the test database exists.\n' +
        `   Connection URL: ${TEST_DATABASE_URL}\n`
    );
  }

  return databaseAvailable;
}

/**
 * Helper to skip tests when database is not available
 * Use in describe blocks: describe.skipIf(await skipIfNoDatabase())
 */
export async function skipIfNoDatabase(): Promise<boolean> {
  return !(await isDatabaseAvailable());
}

/**
 * Get or create a test database connection
 * Throws if database is not available - use isDatabaseAvailable() first
 */
export async function getTestDatabase() {
  if (!testDb) {
    // Check availability first
    const available = await isDatabaseAvailable();
    if (!available) {
      throw new Error(
        'Test database is not available. Use isDatabaseAvailable() to check before calling getTestDatabase().'
      );
    }

    pool = new Pool({
      connectionString: TEST_DATABASE_URL,
      max: 10,
    });

    testDb = drizzle(pool, { schema });
  }

  return testDb;
}

/**
 * Clean up the test database connection
 */
export async function closeTestDatabase() {
  if (pool) {
    await pool.end();
    pool = null;
    testDb = null;
  }
}

/**
 * Reset all tables in the test database
 * Use this between tests to ensure isolation
 */
export async function resetTestDatabase() {
  const db = await getTestDatabase();

  // Truncate all tables in correct order (respects foreign keys)
  await db.execute(sql`
    TRUNCATE TABLE
      audit_log,
      document_revisions,
      documents,
      video_categories,
      videos,
      categories,
      workspace_users,
      sessions,
      users,
      workspaces
    RESTART IDENTITY CASCADE
  `);
}

/**
 * Create a test workspace
 */
export async function createTestWorkspace(
  options: {
    name?: string;
    slug?: string;
    mode?: 'single-tenant' | 'multi-tenant';
  } = {}
) {
  const db = await getTestDatabase();

  const [workspace] = await db
    .insert(schema.workspaces)
    .values({
      name: options.name ?? 'Test Workspace',
      slug: options.slug ?? `test-${Date.now()}`,
      mode: options.mode ?? 'single-tenant',
    })
    .returning();

  if (!workspace) {
    throw new Error('Failed to create test workspace');
  }

  return workspace;
}

/**
 * Create a test user
 */
export async function createTestUser(options: {
  email?: string;
  password?: string;
  name?: string;
}) {
  const db = await getTestDatabase();
  const passwordHash = await hashPassword(
    options.password ?? 'testpassword123'
  );

  const [user] = await db
    .insert(schema.users)
    .values({
      email: options.email ?? `test-${Date.now()}@example.com`,
      passwordHash,
      name: options.name ?? 'Test User',
    })
    .returning();

  if (!user) {
    throw new Error('Failed to create test user');
  }

  return user;
}

/**
 * Create a test user and add them to a workspace
 */
export async function createTestUserWithWorkspace(options: {
  email?: string;
  password?: string;
  name?: string;
  workspaceName?: string;
  role?: 'owner' | 'editor' | 'viewer';
}) {
  const db = await getTestDatabase();

  const workspace = await createTestWorkspace({
    name: options.workspaceName,
  });

  const user = await createTestUser({
    email: options.email,
    password: options.password,
    name: options.name,
  });

  await db.insert(schema.workspaceUsers).values({
    workspaceId: workspace.id,
    userId: user.id,
    role: options.role ?? 'owner',
  });

  return { user, workspace };
}

/**
 * Create a test video
 */
export async function createTestVideo(
  workspaceId: string,
  options: {
    title?: string;
    description?: string;
    status?: schema.VideoStatus;
  } = {}
) {
  const db = await getTestDatabase();

  const [video] = await db
    .insert(schema.videos)
    .values({
      workspaceId,
      title: options.title ?? 'Test Video',
      description: options.description ?? 'Test video description',
      status: options.status ?? 'idea',
    })
    .returning();

  if (!video) {
    throw new Error('Failed to create test video');
  }

  return video;
}

/**
 * Create a test category
 */
export async function createTestCategory(
  workspaceId: string,
  options: {
    name?: string;
    color?: string;
  } = {}
) {
  const db = await getTestDatabase();

  const [category] = await db
    .insert(schema.categories)
    .values({
      workspaceId,
      name: options.name ?? 'Test Category',
      color: options.color ?? '#FF5733',
    })
    .returning();

  if (!category) {
    throw new Error('Failed to create test category');
  }

  return category;
}

/**
 * Create a test document
 */
export async function createTestDocument(
  videoId: string,
  options: {
    type?: schema.DocumentType;
    content?: string;
  } = {}
) {
  const db = await getTestDatabase();

  const [document] = await db
    .insert(schema.documents)
    .values({
      videoId,
      type: options.type ?? 'script',
      content: options.content ?? 'Test document content',
    })
    .returning();

  if (!document) {
    throw new Error('Failed to create test document');
  }

  return document;
}

/**
 * Create a test session for a user
 */
export async function createTestSession(userId: string, token?: string) {
  const db = await getTestDatabase();
  const sessionToken = token ?? `test-session-${Date.now()}`;

  const [session] = await db
    .insert(schema.sessions)
    .values({
      id: sessionToken,
      userId,
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
    })
    .returning();

  if (!session) {
    throw new Error('Failed to create test session');
  }

  return session;
}

/**
 * Seed a complete test environment with workspace, user, and sample data
 */
export async function seedTestEnvironment() {
  const { user, workspace } = await createTestUserWithWorkspace({
    email: 'test@example.com',
    password: 'testpassword123',
    name: 'Test User',
    workspaceName: 'Test Workspace',
    role: 'owner',
  });

  // Create some test videos
  const video1 = await createTestVideo(workspace.id, {
    title: 'Video in Ideas',
    status: 'idea',
  });

  const video2 = await createTestVideo(workspace.id, {
    title: 'Video in Scripting',
    status: 'scripting',
  });

  const video3 = await createTestVideo(workspace.id, {
    title: 'Video in Filming',
    status: 'filming',
  });

  // Create a category
  const category = await createTestCategory(workspace.id, {
    name: 'Tutorials',
    color: '#3498DB',
  });

  // Create a document for the first video
  const document = await createTestDocument(video1.id, {
    type: 'script',
    content: '# Video Script\n\nThis is a test script.',
  });

  return {
    user,
    workspace,
    videos: [video1, video2, video3],
    category,
    document,
  };
}
