import { CategoriesPageClient } from './categories-page-client';

/**
 * Categories Page
 *
 * Server component that renders the categories management page.
 * Delegates to client component for interactivity.
 */
export default async function CategoriesPage({
  params,
}: {
  params: Promise<{ teamspace: string; channel: string }>;
}) {
  // Await params (Next.js 15 requirement)
  const { channel } = await params;

  return <CategoriesPageClient channelSlug={channel} />;
}
