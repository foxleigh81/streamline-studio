/**
 * Home Page
 *
 * Placeholder page for the application root.
 * Will be replaced with proper landing/dashboard in Phase 2.
 */
export default function HomePage() {
  return (
    <main
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
        padding: 'var(--spacing-4)',
        fontFamily: 'var(--font-sans)',
      }}
    >
      <h1
        style={{
          fontSize: 'var(--font-size-4xl)',
          fontWeight: 'var(--font-weight-bold)',
          color: 'var(--color-foreground)',
          marginBottom: 'var(--spacing-4)',
        }}
      >
        Streamline Studio
      </h1>
      <p
        style={{
          fontSize: 'var(--font-size-lg)',
          color: 'var(--color-foreground-muted)',
          textAlign: 'center',
          maxWidth: '600px',
        }}
      >
        YouTube Content Planner - Plan and manage your video content with ease.
      </p>
      <p
        style={{
          marginTop: 'var(--spacing-8)',
          fontSize: 'var(--font-size-sm)',
          color: 'var(--color-foreground-muted)',
        }}
      >
        Phase 1.1 Setup Complete
      </p>
    </main>
  );
}
