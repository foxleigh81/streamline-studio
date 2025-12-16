/**
 * Breadcrumb Hooks Tests
 *
 * Tests for useBreadcrumbs and useBaseUrl hooks.
 * Verifies breadcrumb generation in single-tenant and multi-tenant modes.
 *
 * @see /docs/adrs/005-testing-strategy.md
 * @see /docs/adrs/017-teamspace-hierarchy.md
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useBreadcrumbs, useBaseUrl } from '../use-breadcrumbs';
import {
  TeamspaceContext,
  type TeamspaceContextValue,
} from '@/lib/teamspace/context';
import {
  ProjectContext,
  type ProjectContextValue,
} from '@/lib/project/context';
import type { ReactNode } from 'react';

// Mock the constants module
vi.mock('@/lib/constants', () => ({
  isMultiTenant: vi.fn(() => false),
}));

describe('useBreadcrumbs', () => {
  let originalEnv: NodeJS.ProcessEnv;

  beforeEach(() => {
    // Save original env
    originalEnv = { ...process.env };
  });

  afterEach(() => {
    // Restore original env
    process.env = originalEnv;
    vi.clearAllMocks();
  });

  describe('single-tenant mode', () => {
    beforeEach(async () => {
      const { isMultiTenant } = vi.mocked(await import('@/lib/constants'));
      isMultiTenant.mockReturnValue(false);
    });

    it('should return only project breadcrumb (hide teamspace)', () => {
      const mockTeamspaceContext: TeamspaceContextValue = {
        teamspace: {
          id: 'teamspace-1',
          name: 'Workspace',
          slug: 'workspace',
          createdAt: new Date(),
        },
        role: 'owner',
        isLoading: false,
        error: null,
        refresh: async () => {},
      };

      const mockProjectContext: ProjectContextValue = {
        project: {
          id: 'project-1',
          name: 'My Project',
          slug: 'my-project',
          teamspaceId: 'teamspace-1',
          mode: 'single-tenant',
          createdAt: new Date(),
        },
        role: 'owner',
        isLoading: false,
        error: null,
        refresh: async () => {},
      };

      const wrapper = ({ children }: { children: ReactNode }) => (
        <TeamspaceContext.Provider value={mockTeamspaceContext}>
          <ProjectContext.Provider value={mockProjectContext}>
            {children}
          </ProjectContext.Provider>
        </TeamspaceContext.Provider>
      );

      const { result } = renderHook(() => useBreadcrumbs(), { wrapper });

      // Should only have project, not teamspace (single-tenant hides teamspace)
      expect(result.current).toHaveLength(1);
      expect(result.current[0]).toEqual({
        label: 'My Project',
        href: '/t/workspace/my-project/content-plan',
      });
    });

    it('should append additional breadcrumbs after project', () => {
      const mockTeamspaceContext: TeamspaceContextValue = {
        teamspace: {
          id: 'teamspace-1',
          name: 'Workspace',
          slug: 'workspace',
          createdAt: new Date(),
        },
        role: 'owner',
        isLoading: false,
        error: null,
        refresh: async () => {},
      };

      const mockProjectContext: ProjectContextValue = {
        project: {
          id: 'project-1',
          name: 'My Project',
          slug: 'my-project',
          teamspaceId: 'teamspace-1',
          mode: 'single-tenant',
          createdAt: new Date(),
        },
        role: 'owner',
        isLoading: false,
        error: null,
        refresh: async () => {},
      };

      const wrapper = ({ children }: { children: ReactNode }) => (
        <TeamspaceContext.Provider value={mockTeamspaceContext}>
          <ProjectContext.Provider value={mockProjectContext}>
            {children}
          </ProjectContext.Provider>
        </TeamspaceContext.Provider>
      );

      const { result } = renderHook(
        () =>
          useBreadcrumbs([
            {
              label: 'Content Plan',
              href: '/t/workspace/my-project/content-plan',
            },
            { label: 'Video Title' },
          ]),
        { wrapper }
      );

      expect(result.current).toHaveLength(3);
      expect(result.current).toEqual([
        { label: 'My Project', href: '/t/workspace/my-project/content-plan' },
        { label: 'Content Plan', href: '/t/workspace/my-project/content-plan' },
        { label: 'Video Title' },
      ]);
    });

    it('should return empty array when no teamspace or project', () => {
      const mockTeamspaceContext: TeamspaceContextValue = {
        teamspace: null,
        role: null,
        isLoading: false,
        error: null,
        refresh: async () => {},
      };

      const mockProjectContext: ProjectContextValue = {
        project: null,
        role: null,
        isLoading: false,
        error: null,
        refresh: async () => {},
      };

      const wrapper = ({ children }: { children: ReactNode }) => (
        <TeamspaceContext.Provider value={mockTeamspaceContext}>
          <ProjectContext.Provider value={mockProjectContext}>
            {children}
          </ProjectContext.Provider>
        </TeamspaceContext.Provider>
      );

      const { result } = renderHook(() => useBreadcrumbs(), { wrapper });

      expect(result.current).toHaveLength(0);
    });
  });

  describe('multi-tenant mode', () => {
    beforeEach(async () => {
      const { isMultiTenant } = vi.mocked(await import('@/lib/constants'));
      isMultiTenant.mockReturnValue(true);
    });

    it('should return teamspace and project breadcrumbs', () => {
      const mockTeamspaceContext: TeamspaceContextValue = {
        teamspace: {
          id: 'teamspace-1',
          name: 'My Team',
          slug: 'my-team',
          createdAt: new Date(),
        },
        role: 'owner',
        isLoading: false,
        error: null,
        refresh: async () => {},
      };

      const mockProjectContext: ProjectContextValue = {
        project: {
          id: 'project-1',
          name: 'My Project',
          slug: 'my-project',
          teamspaceId: 'teamspace-1',
          mode: 'multi-tenant',
          createdAt: new Date(),
        },
        role: 'owner',
        isLoading: false,
        error: null,
        refresh: async () => {},
      };

      const wrapper = ({ children }: { children: ReactNode }) => (
        <TeamspaceContext.Provider value={mockTeamspaceContext}>
          <ProjectContext.Provider value={mockProjectContext}>
            {children}
          </ProjectContext.Provider>
        </TeamspaceContext.Provider>
      );

      const { result } = renderHook(() => useBreadcrumbs(), { wrapper });

      expect(result.current).toHaveLength(2);
      expect(result.current).toEqual([
        { label: 'My Team', href: '/t/my-team' },
        { label: 'My Project', href: '/t/my-team/my-project/content-plan' },
      ]);
    });

    it('should append additional breadcrumbs after teamspace and project', () => {
      const mockTeamspaceContext: TeamspaceContextValue = {
        teamspace: {
          id: 'teamspace-1',
          name: 'My Team',
          slug: 'my-team',
          createdAt: new Date(),
        },
        role: 'owner',
        isLoading: false,
        error: null,
        refresh: async () => {},
      };

      const mockProjectContext: ProjectContextValue = {
        project: {
          id: 'project-1',
          name: 'My Project',
          slug: 'my-project',
          teamspaceId: 'teamspace-1',
          mode: 'multi-tenant',
          createdAt: new Date(),
        },
        role: 'owner',
        isLoading: false,
        error: null,
        refresh: async () => {},
      };

      const wrapper = ({ children }: { children: ReactNode }) => (
        <TeamspaceContext.Provider value={mockTeamspaceContext}>
          <ProjectContext.Provider value={mockProjectContext}>
            {children}
          </ProjectContext.Provider>
        </TeamspaceContext.Provider>
      );

      const { result } = renderHook(
        () =>
          useBreadcrumbs([
            {
              label: 'Content Plan',
              href: '/t/my-team/my-project/content-plan',
            },
            {
              label: 'Video Details',
              href: '/t/my-team/my-project/content-plan/123',
            },
            { label: 'Script Editor' },
          ]),
        { wrapper }
      );

      expect(result.current).toHaveLength(5);
      expect(result.current).toEqual([
        { label: 'My Team', href: '/t/my-team' },
        { label: 'My Project', href: '/t/my-team/my-project/content-plan' },
        { label: 'Content Plan', href: '/t/my-team/my-project/content-plan' },
        {
          label: 'Video Details',
          href: '/t/my-team/my-project/content-plan/123',
        },
        { label: 'Script Editor' },
      ]);
    });

    it('should return only teamspace when no project available', () => {
      const mockTeamspaceContext: TeamspaceContextValue = {
        teamspace: {
          id: 'teamspace-1',
          name: 'My Team',
          slug: 'my-team',
          createdAt: new Date(),
        },
        role: 'owner',
        isLoading: false,
        error: null,
        refresh: async () => {},
      };

      const mockProjectContext: ProjectContextValue = {
        project: null,
        role: null,
        isLoading: false,
        error: null,
        refresh: async () => {},
      };

      const wrapper = ({ children }: { children: ReactNode }) => (
        <TeamspaceContext.Provider value={mockTeamspaceContext}>
          <ProjectContext.Provider value={mockProjectContext}>
            {children}
          </ProjectContext.Provider>
        </TeamspaceContext.Provider>
      );

      const { result } = renderHook(() => useBreadcrumbs(), { wrapper });

      // Should only have teamspace when project is null
      expect(result.current).toHaveLength(1);
      expect(result.current).toEqual([
        { label: 'My Team', href: '/t/my-team' },
      ]);
    });
  });
});

describe('useBaseUrl', () => {
  it('should return base URL with teamspace and project slugs', () => {
    const mockTeamspaceContext: TeamspaceContextValue = {
      teamspace: {
        id: 'teamspace-1',
        name: 'My Team',
        slug: 'my-team',
        createdAt: new Date(),
      },
      role: 'owner',
      isLoading: false,
      error: null,
      refresh: async () => {},
    };

    const mockProjectContext: ProjectContextValue = {
      project: {
        id: 'project-1',
        name: 'My Project',
        slug: 'my-project',
        teamspaceId: 'teamspace-1',
        mode: 'multi-tenant',
        createdAt: new Date(),
      },
      role: 'owner',
      isLoading: false,
      error: null,
      refresh: async () => {},
    };

    const wrapper = ({ children }: { children: ReactNode }) => (
      <TeamspaceContext.Provider value={mockTeamspaceContext}>
        <ProjectContext.Provider value={mockProjectContext}>
          {children}
        </ProjectContext.Provider>
      </TeamspaceContext.Provider>
    );

    const { result } = renderHook(() => useBaseUrl(), { wrapper });

    expect(result.current).toBe('/t/my-team/my-project');
  });

  it('should return root path when no teamspace available', () => {
    const mockTeamspaceContext: TeamspaceContextValue = {
      teamspace: null,
      role: null,
      isLoading: false,
      error: null,
      refresh: async () => {},
    };

    const mockProjectContext: ProjectContextValue = {
      project: {
        id: 'project-1',
        name: 'My Project',
        slug: 'my-project',
        teamspaceId: null,
        mode: 'single-tenant',
        createdAt: new Date(),
      },
      role: 'owner',
      isLoading: false,
      error: null,
      refresh: async () => {},
    };

    const wrapper = ({ children }: { children: ReactNode }) => (
      <TeamspaceContext.Provider value={mockTeamspaceContext}>
        <ProjectContext.Provider value={mockProjectContext}>
          {children}
        </ProjectContext.Provider>
      </TeamspaceContext.Provider>
    );

    const { result } = renderHook(() => useBaseUrl(), { wrapper });

    expect(result.current).toBe('/');
  });

  it('should return root path when no project available', () => {
    const mockTeamspaceContext: TeamspaceContextValue = {
      teamspace: {
        id: 'teamspace-1',
        name: 'My Team',
        slug: 'my-team',
        createdAt: new Date(),
      },
      role: 'owner',
      isLoading: false,
      error: null,
      refresh: async () => {},
    };

    const mockProjectContext: ProjectContextValue = {
      project: null,
      role: null,
      isLoading: false,
      error: null,
      refresh: async () => {},
    };

    const wrapper = ({ children }: { children: ReactNode }) => (
      <TeamspaceContext.Provider value={mockTeamspaceContext}>
        <ProjectContext.Provider value={mockProjectContext}>
          {children}
        </ProjectContext.Provider>
      </TeamspaceContext.Provider>
    );

    const { result } = renderHook(() => useBaseUrl(), { wrapper });

    expect(result.current).toBe('/');
  });

  it('should return root path when both teamspace and project are null', () => {
    const mockTeamspaceContext: TeamspaceContextValue = {
      teamspace: null,
      role: null,
      isLoading: false,
      error: null,
      refresh: async () => {},
    };

    const mockProjectContext: ProjectContextValue = {
      project: null,
      role: null,
      isLoading: false,
      error: null,
      refresh: async () => {},
    };

    const wrapper = ({ children }: { children: ReactNode }) => (
      <TeamspaceContext.Provider value={mockTeamspaceContext}>
        <ProjectContext.Provider value={mockProjectContext}>
          {children}
        </ProjectContext.Provider>
      </TeamspaceContext.Provider>
    );

    const { result } = renderHook(() => useBaseUrl(), { wrapper });

    expect(result.current).toBe('/');
  });

  it('should work in single-tenant mode with workspace slug', () => {
    const mockTeamspaceContext: TeamspaceContextValue = {
      teamspace: {
        id: 'teamspace-1',
        name: 'Workspace',
        slug: 'workspace',
        createdAt: new Date(),
      },
      role: 'owner',
      isLoading: false,
      error: null,
      refresh: async () => {},
    };

    const mockProjectContext: ProjectContextValue = {
      project: {
        id: 'project-1',
        name: 'My Project',
        slug: 'my-project',
        teamspaceId: 'teamspace-1',
        mode: 'single-tenant',
        createdAt: new Date(),
      },
      role: 'owner',
      isLoading: false,
      error: null,
      refresh: async () => {},
    };

    const wrapper = ({ children }: { children: ReactNode }) => (
      <TeamspaceContext.Provider value={mockTeamspaceContext}>
        <ProjectContext.Provider value={mockProjectContext}>
          {children}
        </ProjectContext.Provider>
      </TeamspaceContext.Provider>
    );

    const { result } = renderHook(() => useBaseUrl(), { wrapper });

    // Single-tenant still uses /t/workspace/project pattern
    expect(result.current).toBe('/t/workspace/my-project');
  });
});
