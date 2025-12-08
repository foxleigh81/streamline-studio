import type { Metadata } from 'next';
import '@/themes/default/index.css';
import { THEME_INIT_SCRIPT } from '@/lib/theme';

export const metadata: Metadata = {
  title: 'Streamline Studio',
  description: 'YouTube Content Planner - Plan and manage your video content',
};

/**
 * Root Layout
 *
 * This is the root layout for the entire application.
 * It imports the theme CSS and prevents theme flash with an inline script.
 */
export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
      </head>
      <body>{children}</body>
    </html>
  );
}
