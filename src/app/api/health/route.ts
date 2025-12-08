import { pool } from '@/server/db';

/**
 * Health Check Endpoint
 *
 * Returns the health status of the application.
 * Used by Docker healthcheck and monitoring tools.
 *
 * @see /docs/adrs/011-self-hosting-strategy.md
 */
export async function GET() {
  try {
    // Test database connection
    const client = await pool.connect();
    await client.query('SELECT 1');
    client.release();

    return Response.json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      database: 'connected',
    });
  } catch (error) {
    // Don't expose error details in production
    const message =
      process.env.NODE_ENV === 'development' && error instanceof Error
        ? error.message
        : 'Database unavailable';

    return Response.json(
      {
        status: 'error',
        timestamp: new Date().toISOString(),
        database: 'disconnected',
        message,
      },
      { status: 500 }
    );
  }
}
