import { CategoriesPageClient } from './categories-page-client';

/**
 * Categories Page
 *
 * Server component that renders the categories management page.
 * Delegates to client component for interactivity.
 */
export default function CategoriesPage({
  params,
}: {
  params: { teamspace: string; project: string };
}) {
  return <CategoriesPageClient workspaceSlug={params.project} />;
}
