import type { Meta, StoryObj } from '@storybook/react';
import { within, expect } from '@storybook/test';
import { Breadcrumb } from './breadcrumb';

/**
 * Breadcrumb Component Stories
 *
 * Demonstrates breadcrumb navigation patterns.
 * Includes interaction tests for accessibility verification.
 */
const meta: Meta<typeof Breadcrumb> = {
  title: 'UI/Breadcrumb',
  component: Breadcrumb,
  tags: ['autodocs'],
  parameters: {
    layout: 'padded',
  },
  argTypes: {
    items: {
      description: 'Array of breadcrumb items',
    },
  },
};

export default meta;
type Story = StoryObj<typeof Breadcrumb>;

// =============================================================================
// BASIC STORIES
// =============================================================================

export const Default: Story = {
  args: {
    items: [
      { label: 'Home', href: '/' },
      { label: 'My Team', href: '/t/my-team' },
      { label: 'Videos' },
    ],
  },
};

export const SingleLevel: Story = {
  args: {
    items: [{ label: 'Home' }],
  },
};

export const TwoLevels: Story = {
  args: {
    items: [{ label: 'Home', href: '/' }, { label: 'Workspace' }],
  },
};

export const DeepNavigation: Story = {
  args: {
    items: [
      { label: 'Home', href: '/' },
      { label: 'My Team', href: '/t/my-team' },
      { label: 'Videos', href: '/t/my-team/my-project/videos' },
      { label: 'Video Details', href: '/t/my-team/my-project/videos/123' },
      { label: 'Script Editor' },
    ],
  },
};

export const LongLabels: Story = {
  args: {
    items: [
      { label: 'Dashboard', href: '/' },
      { label: 'My Very Long Teamspace Name', href: '/t/my-team' },
      { label: 'Video Management Area', href: '/t/my-team/my-project/videos' },
      { label: 'Detailed Video Information Page' },
    ],
  },
};

// =============================================================================
// INTERACTION TESTS
// =============================================================================

/**
 * Test that breadcrumb has proper ARIA attributes
 */
export const AccessibilityAttributes: Story = {
  args: {
    items: [
      { label: 'Home', href: '/' },
      { label: 'My Team', href: '/t/my-team' },
      { label: 'Current Page' },
    ],
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    // Check for breadcrumb navigation
    const nav = canvas.getByRole('navigation', { name: /breadcrumb/i });
    expect(nav).toBeInTheDocument();

    // Check for ordered list
    const list = canvas.getByRole('list');
    expect(list).toBeInTheDocument();

    // Check for list items
    const items = canvas.getAllByRole('listitem');
    expect(items).toHaveLength(3);
  },
};

/**
 * Test that current page has aria-current attribute
 */
export const CurrentPageMarked: Story = {
  args: {
    items: [
      { label: 'Home', href: '/' },
      { label: 'Videos', href: '/videos' },
      { label: 'Current Video' },
    ],
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    // Find element with aria-current="page"
    const currentPage = canvas.getByText('Current Video');
    expect(currentPage).toHaveAttribute('aria-current', 'page');
  },
};

/**
 * Test that links are properly rendered
 */
export const LinksRendered: Story = {
  args: {
    items: [
      { label: 'Home', href: '/' },
      { label: 'My Team', href: '/t/my-team' },
      { label: 'Current' },
    ],
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    // Check that first two items are links
    const homeLink = canvas.getByRole('link', { name: 'Home' });
    expect(homeLink).toHaveAttribute('href', '/');

    const teamLink = canvas.getByRole('link', { name: 'My Team' });
    expect(teamLink).toHaveAttribute('href', '/t/my-team');

    // Check that last item is NOT a link
    const links = canvas.getAllByRole('link');
    expect(links).toHaveLength(2);
  },
};

/**
 * Test that separators are present and hidden from screen readers
 */
export const SeparatorsHidden: Story = {
  args: {
    items: [
      { label: 'Home', href: '/' },
      { label: 'My Team', href: '/t/my-team' },
      { label: 'Current' },
    ],
  },
  play: async ({ canvasElement }) => {
    // Check for separators with aria-hidden
    const separators = canvasElement.querySelectorAll('[aria-hidden="true"]');
    // Should have 2 separators for 3 items
    expect(separators).toHaveLength(2);

    separators.forEach((separator) => {
      expect(separator.textContent).toBe('/');
    });
  },
};

/**
 * Test empty breadcrumb renders nothing
 */
export const EmptyBreadcrumb: Story = {
  args: {
    items: [],
  },
  play: async ({ canvasElement }) => {
    // Should not render navigation when items are empty
    const nav = canvasElement.querySelector('nav');
    expect(nav).not.toBeInTheDocument();
  },
};
