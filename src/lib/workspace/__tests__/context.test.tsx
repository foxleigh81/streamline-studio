/**
 * Workspace Context Hook Tests
 *
 * Tests for workspace context hooks including useWorkspace, useWorkspaceId,
 * useHasRole, useCanEdit, and useIsOwner.
 *
 * @see /docs/adrs/005-testing-strategy.md
 * @see /docs/adrs/008-multi-tenancy-strategy.md
 */

import { describe, it, expect } from 'vitest';
import { renderHook } from '@testing-library/react';
import {
  useWorkspace,
  useWorkspaceId,
  useHasRole,
  useCanEdit,
  useIsOwner,
  WorkspaceContext,
  type WorkspaceContextValue,
} from '../context';
import type { ReactNode } from 'react';

describe('Workspace Context Hooks', () => {
  describe('useWorkspace', () => {
    it('should throw error when used outside provider', () => {
      // Should throw when context is not available
      expect(() => {
        renderHook(() => useWorkspace());
      }).toThrow('useWorkspace must be used within WorkspaceProvider');
    });

    it('should return context value when inside provider', () => {
      const mockContext: WorkspaceContextValue = {
        workspace: {
          id: 'workspace-1',
          name: 'Test Workspace',
          slug: 'test-workspace',
          mode: 'single-tenant',
        },
        role: 'owner',
        isLoading: false,
        error: null,
        switchWorkspace: async () => {},
        refresh: async () => {},
      };

      const wrapper = ({ children }: { children: ReactNode }) => (
        <WorkspaceContext.Provider value={mockContext}>
          {children}
        </WorkspaceContext.Provider>
      );

      const { result } = renderHook(() => useWorkspace(), { wrapper });

      expect(result.current).toBe(mockContext);
      expect(result.current.workspace?.id).toBe('workspace-1');
      expect(result.current.role).toBe('owner');
    });

    it('should return loading state correctly', () => {
      const mockContext: WorkspaceContextValue = {
        workspace: null,
        role: null,
        isLoading: true,
        error: null,
        switchWorkspace: async () => {},
        refresh: async () => {},
      };

      const wrapper = ({ children }: { children: ReactNode }) => (
        <WorkspaceContext.Provider value={mockContext}>
          {children}
        </WorkspaceContext.Provider>
      );

      const { result } = renderHook(() => useWorkspace(), { wrapper });

      expect(result.current.isLoading).toBe(true);
      expect(result.current.workspace).toBeNull();
    });

    it('should return error state correctly', () => {
      const mockContext: WorkspaceContextValue = {
        workspace: null,
        role: null,
        isLoading: false,
        error: 'Failed to load workspace',
        switchWorkspace: async () => {},
        refresh: async () => {},
      };

      const wrapper = ({ children }: { children: ReactNode }) => (
        <WorkspaceContext.Provider value={mockContext}>
          {children}
        </WorkspaceContext.Provider>
      );

      const { result } = renderHook(() => useWorkspace(), { wrapper });

      expect(result.current.error).toBe('Failed to load workspace');
    });
  });

  describe('useWorkspaceId', () => {
    it('should return workspace ID when workspace is available', () => {
      const mockContext: WorkspaceContextValue = {
        workspace: {
          id: 'workspace-123',
          name: 'Test Workspace',
          slug: 'test-workspace',
          mode: 'single-tenant',
        },
        role: 'editor',
        isLoading: false,
        error: null,
        switchWorkspace: async () => {},
        refresh: async () => {},
      };

      const wrapper = ({ children }: { children: ReactNode }) => (
        <WorkspaceContext.Provider value={mockContext}>
          {children}
        </WorkspaceContext.Provider>
      );

      const { result } = renderHook(() => useWorkspaceId(), { wrapper });

      expect(result.current).toBe('workspace-123');
    });

    it('should return null when workspace is not available', () => {
      const mockContext: WorkspaceContextValue = {
        workspace: null,
        role: null,
        isLoading: false,
        error: null,
        switchWorkspace: async () => {},
        refresh: async () => {},
      };

      const wrapper = ({ children }: { children: ReactNode }) => (
        <WorkspaceContext.Provider value={mockContext}>
          {children}
        </WorkspaceContext.Provider>
      );

      const { result } = renderHook(() => useWorkspaceId(), { wrapper });

      expect(result.current).toBeNull();
    });

    it('should return null during loading', () => {
      const mockContext: WorkspaceContextValue = {
        workspace: null,
        role: null,
        isLoading: true,
        error: null,
        switchWorkspace: async () => {},
        refresh: async () => {},
      };

      const wrapper = ({ children }: { children: ReactNode }) => (
        <WorkspaceContext.Provider value={mockContext}>
          {children}
        </WorkspaceContext.Provider>
      );

      const { result } = renderHook(() => useWorkspaceId(), { wrapper });

      expect(result.current).toBeNull();
    });
  });

  describe('useHasRole', () => {
    describe('role hierarchy (owner > editor > viewer)', () => {
      it('should return true for owner checking owner role', () => {
        const mockContext: WorkspaceContextValue = {
          workspace: {
            id: 'workspace-1',
            name: 'Test Workspace',
            slug: 'test-workspace',
            mode: 'single-tenant',
          },
          role: 'owner',
          isLoading: false,
          error: null,
          switchWorkspace: async () => {},
          refresh: async () => {},
        };

        const wrapper = ({ children }: { children: ReactNode }) => (
          <WorkspaceContext.Provider value={mockContext}>
            {children}
          </WorkspaceContext.Provider>
        );

        const { result } = renderHook(() => useHasRole('owner'), { wrapper });

        expect(result.current).toBe(true);
      });

      it('should return true for owner checking editor role', () => {
        const mockContext: WorkspaceContextValue = {
          workspace: {
            id: 'workspace-1',
            name: 'Test Workspace',
            slug: 'test-workspace',
            mode: 'single-tenant',
          },
          role: 'owner',
          isLoading: false,
          error: null,
          switchWorkspace: async () => {},
          refresh: async () => {},
        };

        const wrapper = ({ children }: { children: ReactNode }) => (
          <WorkspaceContext.Provider value={mockContext}>
            {children}
          </WorkspaceContext.Provider>
        );

        const { result } = renderHook(() => useHasRole('editor'), { wrapper });

        expect(result.current).toBe(true);
      });

      it('should return true for owner checking viewer role', () => {
        const mockContext: WorkspaceContextValue = {
          workspace: {
            id: 'workspace-1',
            name: 'Test Workspace',
            slug: 'test-workspace',
            mode: 'single-tenant',
          },
          role: 'owner',
          isLoading: false,
          error: null,
          switchWorkspace: async () => {},
          refresh: async () => {},
        };

        const wrapper = ({ children }: { children: ReactNode }) => (
          <WorkspaceContext.Provider value={mockContext}>
            {children}
          </WorkspaceContext.Provider>
        );

        const { result } = renderHook(() => useHasRole('viewer'), { wrapper });

        expect(result.current).toBe(true);
      });

      it('should return false for editor checking owner role', () => {
        const mockContext: WorkspaceContextValue = {
          workspace: {
            id: 'workspace-1',
            name: 'Test Workspace',
            slug: 'test-workspace',
            mode: 'single-tenant',
          },
          role: 'editor',
          isLoading: false,
          error: null,
          switchWorkspace: async () => {},
          refresh: async () => {},
        };

        const wrapper = ({ children }: { children: ReactNode }) => (
          <WorkspaceContext.Provider value={mockContext}>
            {children}
          </WorkspaceContext.Provider>
        );

        const { result } = renderHook(() => useHasRole('owner'), { wrapper });

        expect(result.current).toBe(false);
      });

      it('should return true for editor checking editor role', () => {
        const mockContext: WorkspaceContextValue = {
          workspace: {
            id: 'workspace-1',
            name: 'Test Workspace',
            slug: 'test-workspace',
            mode: 'single-tenant',
          },
          role: 'editor',
          isLoading: false,
          error: null,
          switchWorkspace: async () => {},
          refresh: async () => {},
        };

        const wrapper = ({ children }: { children: ReactNode }) => (
          <WorkspaceContext.Provider value={mockContext}>
            {children}
          </WorkspaceContext.Provider>
        );

        const { result } = renderHook(() => useHasRole('editor'), { wrapper });

        expect(result.current).toBe(true);
      });

      it('should return true for editor checking viewer role', () => {
        const mockContext: WorkspaceContextValue = {
          workspace: {
            id: 'workspace-1',
            name: 'Test Workspace',
            slug: 'test-workspace',
            mode: 'single-tenant',
          },
          role: 'editor',
          isLoading: false,
          error: null,
          switchWorkspace: async () => {},
          refresh: async () => {},
        };

        const wrapper = ({ children }: { children: ReactNode }) => (
          <WorkspaceContext.Provider value={mockContext}>
            {children}
          </WorkspaceContext.Provider>
        );

        const { result } = renderHook(() => useHasRole('viewer'), { wrapper });

        expect(result.current).toBe(true);
      });

      it('should return false for viewer checking owner role', () => {
        const mockContext: WorkspaceContextValue = {
          workspace: {
            id: 'workspace-1',
            name: 'Test Workspace',
            slug: 'test-workspace',
            mode: 'single-tenant',
          },
          role: 'viewer',
          isLoading: false,
          error: null,
          switchWorkspace: async () => {},
          refresh: async () => {},
        };

        const wrapper = ({ children }: { children: ReactNode }) => (
          <WorkspaceContext.Provider value={mockContext}>
            {children}
          </WorkspaceContext.Provider>
        );

        const { result } = renderHook(() => useHasRole('owner'), { wrapper });

        expect(result.current).toBe(false);
      });

      it('should return false for viewer checking editor role', () => {
        const mockContext: WorkspaceContextValue = {
          workspace: {
            id: 'workspace-1',
            name: 'Test Workspace',
            slug: 'test-workspace',
            mode: 'single-tenant',
          },
          role: 'viewer',
          isLoading: false,
          error: null,
          switchWorkspace: async () => {},
          refresh: async () => {},
        };

        const wrapper = ({ children }: { children: ReactNode }) => (
          <WorkspaceContext.Provider value={mockContext}>
            {children}
          </WorkspaceContext.Provider>
        );

        const { result } = renderHook(() => useHasRole('editor'), { wrapper });

        expect(result.current).toBe(false);
      });

      it('should return true for viewer checking viewer role', () => {
        const mockContext: WorkspaceContextValue = {
          workspace: {
            id: 'workspace-1',
            name: 'Test Workspace',
            slug: 'test-workspace',
            mode: 'single-tenant',
          },
          role: 'viewer',
          isLoading: false,
          error: null,
          switchWorkspace: async () => {},
          refresh: async () => {},
        };

        const wrapper = ({ children }: { children: ReactNode }) => (
          <WorkspaceContext.Provider value={mockContext}>
            {children}
          </WorkspaceContext.Provider>
        );

        const { result } = renderHook(() => useHasRole('viewer'), { wrapper });

        expect(result.current).toBe(true);
      });
    });

    it('should return false when role is null', () => {
      const mockContext: WorkspaceContextValue = {
        workspace: null,
        role: null,
        isLoading: false,
        error: null,
        switchWorkspace: async () => {},
        refresh: async () => {},
      };

      const wrapper = ({ children }: { children: ReactNode }) => (
        <WorkspaceContext.Provider value={mockContext}>
          {children}
        </WorkspaceContext.Provider>
      );

      const { result } = renderHook(() => useHasRole('viewer'), { wrapper });

      expect(result.current).toBe(false);
    });
  });

  describe('useCanEdit', () => {
    it('should return true for owner', () => {
      const mockContext: WorkspaceContextValue = {
        workspace: {
          id: 'workspace-1',
          name: 'Test Workspace',
          slug: 'test-workspace',
          mode: 'single-tenant',
        },
        role: 'owner',
        isLoading: false,
        error: null,
        switchWorkspace: async () => {},
        refresh: async () => {},
      };

      const wrapper = ({ children }: { children: ReactNode }) => (
        <WorkspaceContext.Provider value={mockContext}>
          {children}
        </WorkspaceContext.Provider>
      );

      const { result } = renderHook(() => useCanEdit(), { wrapper });

      expect(result.current).toBe(true);
    });

    it('should return true for editor', () => {
      const mockContext: WorkspaceContextValue = {
        workspace: {
          id: 'workspace-1',
          name: 'Test Workspace',
          slug: 'test-workspace',
          mode: 'single-tenant',
        },
        role: 'editor',
        isLoading: false,
        error: null,
        switchWorkspace: async () => {},
        refresh: async () => {},
      };

      const wrapper = ({ children }: { children: ReactNode }) => (
        <WorkspaceContext.Provider value={mockContext}>
          {children}
        </WorkspaceContext.Provider>
      );

      const { result } = renderHook(() => useCanEdit(), { wrapper });

      expect(result.current).toBe(true);
    });

    it('should return false for viewer', () => {
      const mockContext: WorkspaceContextValue = {
        workspace: {
          id: 'workspace-1',
          name: 'Test Workspace',
          slug: 'test-workspace',
          mode: 'single-tenant',
        },
        role: 'viewer',
        isLoading: false,
        error: null,
        switchWorkspace: async () => {},
        refresh: async () => {},
      };

      const wrapper = ({ children }: { children: ReactNode }) => (
        <WorkspaceContext.Provider value={mockContext}>
          {children}
        </WorkspaceContext.Provider>
      );

      const { result } = renderHook(() => useCanEdit(), { wrapper });

      expect(result.current).toBe(false);
    });

    it('should return false when no role', () => {
      const mockContext: WorkspaceContextValue = {
        workspace: null,
        role: null,
        isLoading: false,
        error: null,
        switchWorkspace: async () => {},
        refresh: async () => {},
      };

      const wrapper = ({ children }: { children: ReactNode }) => (
        <WorkspaceContext.Provider value={mockContext}>
          {children}
        </WorkspaceContext.Provider>
      );

      const { result } = renderHook(() => useCanEdit(), { wrapper });

      expect(result.current).toBe(false);
    });
  });

  describe('useIsOwner', () => {
    it('should return true for owner role', () => {
      const mockContext: WorkspaceContextValue = {
        workspace: {
          id: 'workspace-1',
          name: 'Test Workspace',
          slug: 'test-workspace',
          mode: 'single-tenant',
        },
        role: 'owner',
        isLoading: false,
        error: null,
        switchWorkspace: async () => {},
        refresh: async () => {},
      };

      const wrapper = ({ children }: { children: ReactNode }) => (
        <WorkspaceContext.Provider value={mockContext}>
          {children}
        </WorkspaceContext.Provider>
      );

      const { result } = renderHook(() => useIsOwner(), { wrapper });

      expect(result.current).toBe(true);
    });

    it('should return false for editor role', () => {
      const mockContext: WorkspaceContextValue = {
        workspace: {
          id: 'workspace-1',
          name: 'Test Workspace',
          slug: 'test-workspace',
          mode: 'single-tenant',
        },
        role: 'editor',
        isLoading: false,
        error: null,
        switchWorkspace: async () => {},
        refresh: async () => {},
      };

      const wrapper = ({ children }: { children: ReactNode }) => (
        <WorkspaceContext.Provider value={mockContext}>
          {children}
        </WorkspaceContext.Provider>
      );

      const { result } = renderHook(() => useIsOwner(), { wrapper });

      expect(result.current).toBe(false);
    });

    it('should return false for viewer role', () => {
      const mockContext: WorkspaceContextValue = {
        workspace: {
          id: 'workspace-1',
          name: 'Test Workspace',
          slug: 'test-workspace',
          mode: 'single-tenant',
        },
        role: 'viewer',
        isLoading: false,
        error: null,
        switchWorkspace: async () => {},
        refresh: async () => {},
      };

      const wrapper = ({ children }: { children: ReactNode }) => (
        <WorkspaceContext.Provider value={mockContext}>
          {children}
        </WorkspaceContext.Provider>
      );

      const { result } = renderHook(() => useIsOwner(), { wrapper });

      expect(result.current).toBe(false);
    });

    it('should return false when no role', () => {
      const mockContext: WorkspaceContextValue = {
        workspace: null,
        role: null,
        isLoading: false,
        error: null,
        switchWorkspace: async () => {},
        refresh: async () => {},
      };

      const wrapper = ({ children }: { children: ReactNode }) => (
        <WorkspaceContext.Provider value={mockContext}>
          {children}
        </WorkspaceContext.Provider>
      );

      const { result } = renderHook(() => useIsOwner(), { wrapper });

      expect(result.current).toBe(false);
    });
  });
});
