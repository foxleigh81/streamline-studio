# ADR-001: Next.js Framework Selection

**Status**: Accepted
**Date**: 2025-12-08
**Deciders**: Strategic Project Planner, Lead Developer, QA Architect

## Context

Streamline Studio requires a full-stack web framework for building a YouTube content planning application. The framework must support:

1. **Server-side rendering** for SEO and initial load performance
2. **API routes** for tRPC backend integration
3. **Authentication** with session-based auth (Lucia)
4. **Docker deployment** for self-hosting
5. **Multi-tenant SaaS** capability with workspace-scoped routing
6. **Rich text editing** with CodeMirror 6 integration
7. **Accessibility** (WCAG 2.1 AA compliance)

The application will be deployed both as a self-hosted Docker container and as a multi-tenant SaaS platform. Development velocity and long-term maintainability are critical.

## Decision

### Framework: Next.js 14+ with App Router

Use **Next.js** with the **App Router** (app directory) as the full-stack framework.

### Key Configuration Choices

1. **App Router over Pages Router**: Leverage React Server Components and the latest Next.js features
2. **Standalone output mode**: Optimised Docker images (~100MB vs ~500MB)
3. **Strict React mode**: Enable React.StrictMode for development
4. **TypeScript**: Strict mode enabled (see ADR-004)

## Consequences

### Positive

- **Full-stack in one framework**: API routes, SSR, and static generation unified
- **React Server Components**: Reduced client bundle, better initial load
- **Excellent TypeScript support**: First-class integration
- **Large ecosystem**: Extensive documentation, community, and tooling
- **Vercel deployment**: Seamless for SaaS (with self-hosting via Docker)
- **Streaming and Suspense**: Built-in support for progressive loading
- **tRPC integration**: Mature adapters for App Router
- **Image optimisation**: Built-in next/image for performance
- **Incremental adoption**: Can add features progressively

### Negative

- **App Router learning curve**: Newer paradigm, fewer examples than Pages Router
- **Build times**: Can be slow for large applications
- **Vercel-centric documentation**: Some optimisations assume Vercel hosting
- **Bundle size management**: Requires attention to avoid client bundle bloat
- **Hydration complexity**: Server/client component boundaries need careful design

## Alternatives Considered

### Remix

**Pros:**

- Excellent data loading patterns with loaders/actions
- Nested routing with error boundaries
- Better progressive enhancement story
- Web standards focused (FormData, Request/Response)

**Cons:**

- Smaller ecosystem than Next.js
- Less mature than Next.js for production at scale
- Fewer deployment options for self-hosting
- tRPC integration less established
- Would require more custom infrastructure setup

### Astro

**Pros:**

- Excellent static site performance
- Multi-framework support
- Island architecture reduces JavaScript
- Great for content-heavy sites

**Cons:**

- Not designed for full-stack applications
- Limited server-side capabilities compared to Next.js
- Would require separate API server
- Not suitable for real-time features
- Doesn't fit a dashboard/application use case

### Plain React + Vite

**Pros:**

- Maximum flexibility
- Fast development builds
- No framework lock-in
- Smaller bundle when optimised

**Cons:**

- No SSR without significant setup (would need custom server)
- No built-in routing (would need React Router)
- API layer requires separate framework (Express, Fastify)
- More boilerplate for features Next.js provides out-of-box
- Authentication setup more complex
- No built-in image optimisation

### SvelteKit

**Pros:**

- Excellent performance (smaller runtime)
- Clean syntax and reactivity model
- Built-in transitions and animations
- Growing ecosystem

**Cons:**

- Team would need to learn Svelte
- Smaller ecosystem and job market
- Fewer UI component libraries
- tRPC support less mature
- Not as battle-tested at scale

## Discussion

### Strategic Project Planner

"Let me evaluate our requirements against framework capabilities:

**Must-haves:**

1. SSR for dashboard pages (SEO less critical, but performance matters)
2. API routes for tRPC
3. Docker deployment support
4. TypeScript first-class support
5. Active maintenance and large community

**Nice-to-haves:**

1. React Server Components
2. Built-in image optimisation
3. Streaming/Suspense support
4. Edge runtime option for future

Next.js ticks all boxes. The main question is: App Router vs Pages Router?"

### Lead Developer

"I've shipped production applications with both Pages Router and App Router. Here's my assessment:

**App Router advantages for our use case:**

1. **Server Components for dashboard**: Our video list, category tree, and document viewer can be Server Components. This means:
   - Database queries on the server, no client-side data fetching
   - Smaller JavaScript bundles
   - Faster initial paint

2. **Layouts**: Our workspace-scoped routes (`/w/[slug]/...`) benefit from nested layouts. The workspace context can be loaded once in a layout, not on every page.

3. **Loading states**: Built-in `loading.tsx` files for skeleton UIs during navigation.

4. **Error boundaries**: Granular error handling with `error.tsx` files.

Here's a concrete example of our route structure:

```
app/
  (marketing)/
    page.tsx              # Landing page (Server Component)
    pricing/page.tsx      # Pricing page
  (auth)/
    login/page.tsx        # Login form (Client Component)
    register/page.tsx     # Registration
  (app)/
    w/[slug]/
      layout.tsx          # Load workspace, inject context
      page.tsx            # Dashboard
      videos/
        page.tsx          # Video list
        [id]/
          page.tsx        # Video detail
          edit/page.tsx   # Editor (Client Component for CodeMirror)
```

The `(app)/w/[slug]/layout.tsx` loads the workspace once, and all nested pages have access to it."

### QA Architect

"I have concerns about Server Component vs Client Component boundaries. CodeMirror is a client-only library. How do we handle that?"

### Lead Developer (Response)

"Good question. The pattern is:

1. **Server Component** loads document data from database
2. **Client Component** renders CodeMirror editor

```tsx
// app/(app)/w/[slug]/videos/[id]/edit/page.tsx (Server Component)
export default async function EditPage({ params }: Props) {
  const document = await getDocument(params.id);

  return (
    <div>
      <h1>Edit: {document.videoTitle}</h1>
      <DocumentEditor
        initialContent={document.content}
        documentId={document.id}
        version={document.version}
      />
    </div>
  );
}

// components/DocumentEditor.tsx
('use client');

import { useCodeMirror } from '@uiw/react-codemirror';

export function DocumentEditor({ initialContent, documentId, version }: Props) {
  // All CodeMirror logic here - runs only on client
}
```

The server fetches data, the client handles interactivity. This is actually cleaner than fetching in useEffect."

### Strategic Project Planner

"What about Remix? It has a compelling data loading story."

### Lead Developer (Response)

"Remix is excellent, and I'd consider it for a new project. However, for Streamline Studio:

1. **tRPC**: Our architecture is built around tRPC. Next.js has the most mature tRPC adapter. Remix can work with tRPC, but it's less common - you'd typically use Remix's native loaders instead.

2. **Ecosystem**: We want to use shadcn/ui components, which are designed for Next.js. Adapting them for Remix is possible but adds friction.

3. **Team familiarity**: Most React developers know Next.js. Smaller hiring pool for Remix expertise.

4. **Deployment**: Next.js standalone output mode produces a single Docker image that runs anywhere. Remix can do this too, but Next.js docs are better for this use case.

5. **Community resources**: When we hit issues, Stack Overflow and GitHub have more Next.js answers.

If we weren't using tRPC, I'd seriously consider Remix. But our tRPC + Drizzle architecture pairs naturally with Next.js."

### QA Architect

"What about the App Router's stability? I've heard about bugs and breaking changes."

### Lead Developer (Response)

"Valid concern. App Router had rough edges in Next.js 13. As of Next.js 14.1+:

1. **Stable features**: Server Components, Suspense, streaming are stable
2. **Known patterns**: Community has established patterns for common issues
3. **Breaking changes**: Major changes are behind flags now

The remaining rough edges:

- **Caching**: Next.js aggressive caching can be confusing. We'll use explicit `revalidate` settings.
- **Middleware limitations**: Can't access database directly. We'll use tRPC for auth checks.
- **Dev mode performance**: First compile is slow. Hot reload is fast.

For a greenfield project starting now, App Router is the right choice. The Pages Router is maintenance mode - new features go to App Router."

### Strategic Project Planner

"Let's discuss the Docker deployment. How does standalone output work?"

### Lead Developer (Response)

"Standalone output is critical for self-hosting. In `next.config.js`:

```javascript
module.exports = {
  output: 'standalone',
};
```

This produces `.next/standalone/` containing:

- Only the production dependencies needed
- A minimal `server.js` entry point
- Static files need to be copied separately

Our Dockerfile:

```dockerfile
FROM node:20-alpine AS builder
WORKDIR /app
COPY . .
RUN npm ci && npm run build

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production

# Copy standalone build
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public

EXPOSE 3000
CMD [\"node\", \"server.js\"]
```

Result: ~100MB image instead of ~500MB with full node_modules. Faster pulls, less disk usage for self-hosters."

### QA Architect

"What about testing? Does App Router complicate testing?"

### Lead Developer (Response)

"Some considerations:

1. **Server Components**: Can't use React Testing Library directly on async Server Components. We test:
   - The data fetching functions in isolation
   - Client Components with Testing Library
   - Full pages with Playwright

2. **tRPC procedures**: Tested independently of React

3. **Integration tests**: Playwright tests the full flow

We'll detail this in ADR-005 (Testing Strategy). The short answer: App Router requires more E2E testing, less unit testing of page components. This is actually fine - E2E tests catch more real bugs."

### Strategic Project Planner (Conclusion)

"Decision: Next.js with App Router.

Rationale:

1. Best tRPC integration for our architecture
2. Server Components reduce client bundle for dashboard pages
3. Excellent Docker deployment with standalone output
4. Largest ecosystem for hiring and problem-solving
5. App Router is the future direction of Next.js

Risks:

1. App Router learning curve (mitigated by team experience)
2. Caching complexity (mitigated by explicit configuration)
3. Build times (acceptable for project size)

This is a high-confidence decision. Next.js is the industry standard for React full-stack applications."

## Implementation Notes

### next.config.js

```javascript
/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  reactStrictMode: true,

  // Transpile specific packages if needed
  transpilePackages: [],

  // Experimental features (evaluate carefully)
  experimental: {
    // Enable if we need server actions
    // serverActions: true,
  },

  // Image domains for next/image
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'i.ytimg.com', // YouTube thumbnails in Phase 6
      },
    ],
  },

  // Headers for security
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
        ],
      },
    ];
  },
};

module.exports = nextConfig;
```

### Recommended Project Structure

```
streamline-studio/
  app/
    (marketing)/           # Public pages
    (auth)/                # Auth flows (login, register)
    (app)/                 # Authenticated app
      w/[slug]/           # Workspace-scoped routes
    api/
      trpc/[trpc]/        # tRPC handler
      health/             # Health check endpoint
    layout.tsx            # Root layout
    globals.css           # Global styles
  components/
    ui/                   # Base UI components (shadcn)
    features/             # Feature-specific components
  lib/
    server/               # Server-only code
    client/               # Client-only code
    shared/               # Shared utilities
  server/
    db/                   # Drizzle schema and config
    trpc/                 # tRPC routers
    auth/                 # Lucia auth configuration
  public/                 # Static assets
```

### Key Dependencies

```json
{
  "dependencies": {
    "next": "^14.1.0",
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "@trpc/server": "^10.x",
    "@trpc/client": "^10.x",
    "@trpc/react-query": "^10.x",
    "@trpc/next": "^10.x"
  }
}
```

### Version Constraints

- **Next.js**: Use 14.1.0 or higher for stable App Router
- **React**: 18.2.0 or higher for Server Components support
- **Node.js**: 20.x LTS for production
