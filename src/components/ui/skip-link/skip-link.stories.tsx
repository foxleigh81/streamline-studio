import type { Meta, StoryObj } from '@storybook/react';
import { within, userEvent, expect } from '@storybook/test';
import { SkipLink } from './skip-link';

/**
 * Skip Link Component Stories
 *
 * Demonstrates the skip link for keyboard navigation.
 * The link is hidden until focused with Tab key.
 */
const meta: Meta<typeof SkipLink> = {
  title: 'UI/SkipLink',
  component: SkipLink,
  tags: ['autodocs'],
  parameters: {
    layout: 'fullscreen',
  },
  argTypes: {
    targetId: {
      control: 'text',
      description: 'Target element ID to skip to',
    },
    label: {
      control: 'text',
      description: 'Label text for the skip link',
    },
  },
};

export default meta;
type Story = StoryObj<typeof SkipLink>;

// =============================================================================
// BASIC STORIES
// =============================================================================

export const Default: Story = {
  args: {},
  render: (args) => (
    <div>
      <SkipLink {...args} />
      <div style={{ padding: '2rem' }}>
        <p style={{ marginBottom: '1rem', fontStyle: 'italic', color: '#666' }}>
          Press Tab to see the skip link appear at the top of the page.
        </p>
        <div id="main-content">
          <h1>Main Content</h1>
          <p>This is the main content area.</p>
        </div>
      </div>
    </div>
  ),
};

export const CustomLabel: Story = {
  args: {
    label: 'Jump to content',
  },
  render: (args) => (
    <div>
      <SkipLink {...args} />
      <div style={{ padding: '2rem' }}>
        <p style={{ marginBottom: '1rem', fontStyle: 'italic', color: '#666' }}>
          Press Tab to see the skip link with custom label.
        </p>
        <div id="main-content">
          <h1>Main Content</h1>
          <p>This is the main content area.</p>
        </div>
      </div>
    </div>
  ),
};

export const CustomTarget: Story = {
  args: {
    targetId: 'article-content',
    label: 'Skip to article',
  },
  render: (args) => (
    <div>
      <SkipLink {...args} />
      <div style={{ padding: '2rem' }}>
        <p style={{ marginBottom: '1rem', fontStyle: 'italic', color: '#666' }}>
          Press Tab to see the skip link. Clicking it will jump to the article.
        </p>
        <nav
          style={{
            marginBottom: '2rem',
            padding: '1rem',
            background: '#f3f4f6',
          }}
        >
          <h2>Navigation</h2>
          <ul>
            <li>
              <a href="#">Home</a>
            </li>
            <li>
              <a href="#">About</a>
            </li>
            <li>
              <a href="#">Contact</a>
            </li>
          </ul>
        </nav>
        <div id="article-content">
          <h1>Article Content</h1>
          <p>This is the article content that the skip link jumps to.</p>
        </div>
      </div>
    </div>
  ),
};

export const WithNavigation: Story = {
  args: {},
  render: (args) => (
    <div>
      <SkipLink {...args} />
      <div style={{ padding: '2rem' }}>
        <p style={{ marginBottom: '1rem', fontStyle: 'italic', color: '#666' }}>
          Press Tab multiple times. The first focusable element is the skip
          link.
        </p>
        <nav
          style={{
            marginBottom: '2rem',
            padding: '1rem',
            background: '#f3f4f6',
            borderRadius: '0.5rem',
          }}
        >
          <h2>Main Navigation</h2>
          <ul
            style={{
              display: 'flex',
              gap: '1rem',
              listStyle: 'none',
              padding: 0,
            }}
          >
            <li>
              <a
                href="#"
                style={{
                  padding: '0.5rem 1rem',
                  background: '#fff',
                  borderRadius: '0.25rem',
                  textDecoration: 'none',
                }}
              >
                Home
              </a>
            </li>
            <li>
              <a
                href="#"
                style={{
                  padding: '0.5rem 1rem',
                  background: '#fff',
                  borderRadius: '0.25rem',
                  textDecoration: 'none',
                }}
              >
                Videos
              </a>
            </li>
            <li>
              <a
                href="#"
                style={{
                  padding: '0.5rem 1rem',
                  background: '#fff',
                  borderRadius: '0.25rem',
                  textDecoration: 'none',
                }}
              >
                Categories
              </a>
            </li>
            <li>
              <a
                href="#"
                style={{
                  padding: '0.5rem 1rem',
                  background: '#fff',
                  borderRadius: '0.25rem',
                  textDecoration: 'none',
                }}
              >
                Settings
              </a>
            </li>
          </ul>
        </nav>
        <div
          id="main-content"
          style={{
            padding: '2rem',
            background: '#f9fafb',
            borderRadius: '0.5rem',
          }}
        >
          <h1>Main Content</h1>
          <p>
            When you use the skip link, you bypass the navigation and jump
            directly here.
          </p>
          <p style={{ marginTop: '1rem' }}>
            This improves accessibility for keyboard users who don&apos;t want
            to tab through all navigation links on every page.
          </p>
        </div>
      </div>
    </div>
  ),
};

// =============================================================================
// INTERACTION TESTS
// =============================================================================

/**
 * Test that skip link is present in DOM
 */
export const LinkPresent: Story = {
  args: {},
  render: (args) => (
    <div>
      <SkipLink {...args} />
      <div id="main-content">Main Content</div>
    </div>
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    // Skip link should exist
    const skipLink = canvas.getByText('Skip to main content');
    expect(skipLink).toBeInTheDocument();

    // Should be a link
    expect(skipLink.tagName).toBe('A');

    // Should have correct href
    expect(skipLink).toHaveAttribute('href', '#main-content');
  },
};

/**
 * Test that skip link becomes visible when focused
 */
export const FocusBehavior: Story = {
  args: {},
  render: (args) => (
    <div>
      <SkipLink {...args} />
      <div id="main-content">Main Content</div>
    </div>
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    // Get the skip link
    const skipLink = canvas.getByText('Skip to main content');

    // Tab to focus the skip link
    await userEvent.tab();

    // Skip link should have focus
    expect(skipLink).toHaveFocus();
  },
};

/**
 * Test custom label
 */
export const CustomLabelTest: Story = {
  args: {
    label: 'Jump to main content',
  },
  render: (args) => (
    <div>
      <SkipLink {...args} />
      <div id="main-content">Main Content</div>
    </div>
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    // Should have custom label
    const skipLink = canvas.getByText('Jump to main content');
    expect(skipLink).toBeInTheDocument();
  },
};

/**
 * Test custom target
 */
export const CustomTargetTest: Story = {
  args: {
    targetId: 'custom-target',
  },
  render: (args) => (
    <div>
      <SkipLink {...args} />
      <div id="custom-target">Target Content</div>
    </div>
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    // Should have correct href
    const skipLink = canvas.getByText('Skip to main content');
    expect(skipLink).toHaveAttribute('href', '#custom-target');
  },
};
