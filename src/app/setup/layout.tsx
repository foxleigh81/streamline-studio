/**
 * Setup Layout - Deprecated
 *
 * This route has been consolidated into /register.
 * Layout is minimal since the page immediately redirects.
 *
 * @deprecated Use /register instead
 */

export default function SetupLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
