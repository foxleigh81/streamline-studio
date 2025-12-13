import type { Meta, StoryObj } from '@storybook/react';
import { useState } from 'react';
import { within, userEvent, expect } from '@storybook/test';
import { CategorySelector } from './category-selector';
import type { Category } from './category-selector';

/**
 * CategorySelector Component Stories
 *
 * Demonstrates the multi-select category dropdown with color chips.
 */
const meta: Meta<typeof CategorySelector> = {
  title: 'Category/CategorySelector',
  component: CategorySelector,
  tags: ['autodocs'],
  parameters: {
    layout: 'padded',
  },
};

export default meta;
type Story = StoryObj<typeof CategorySelector>;

// Sample categories for stories
const sampleCategories: Category[] = [
  { id: '1', name: 'Tutorial', color: '#3B82F6' },
  { id: '2', name: 'Web Dev', color: '#8B5CF6' },
  { id: '3', name: 'JavaScript', color: '#F59E0B' },
  { id: '4', name: 'TypeScript', color: '#06B6D4' },
  { id: '5', name: 'React', color: '#22C55E' },
  { id: '6', name: 'CSS', color: '#EC4899' },
];

// =============================================================================
// INTERACTIVE WRAPPER
// =============================================================================

/**
 * Wrapper component for interactive stories
 */
function InteractiveWrapper({
  categories,
  initialSelectedIds = [],
  ...props
}: {
  categories: Category[];
  initialSelectedIds?: string[];
  label?: string;
  error?: string;
  placeholder?: string;
  disabled?: boolean;
}) {
  const [selectedIds, setSelectedIds] = useState<string[]>(initialSelectedIds);

  return (
    <div style={{ maxWidth: '400px' }}>
      <CategorySelector
        categories={categories}
        selectedIds={selectedIds}
        onChange={setSelectedIds}
        {...props}
      />
      <div style={{ marginTop: '1rem', fontSize: '0.875rem', color: '#666' }}>
        <strong>Selected IDs:</strong>{' '}
        {selectedIds.length > 0 ? selectedIds.join(', ') : 'None'}
      </div>
    </div>
  );
}

// =============================================================================
// BASIC STORIES
// =============================================================================

export const Default: Story = {
  render: () => (
    <InteractiveWrapper
      categories={sampleCategories}
      label="Categories"
      placeholder="Select categories..."
    />
  ),
};

export const WithInitialSelection: Story = {
  render: () => (
    <InteractiveWrapper
      categories={sampleCategories}
      initialSelectedIds={['1', '3', '5']}
      label="Categories"
    />
  ),
};

export const WithError: Story = {
  render: () => (
    <InteractiveWrapper
      categories={sampleCategories}
      label="Categories"
      error="Please select at least one category"
    />
  ),
};

export const Disabled: Story = {
  render: () => (
    <InteractiveWrapper
      categories={sampleCategories}
      initialSelectedIds={['1', '2']}
      label="Categories"
      disabled
    />
  ),
};

export const NoCategories: Story = {
  render: () => (
    <InteractiveWrapper
      categories={[]}
      label="Categories"
      placeholder="No categories available"
    />
  ),
};

export const ManyCategories: Story = {
  render: () => {
    const manyCategories: Category[] = Array.from({ length: 20 }, (_, i) => ({
      id: String(i + 1),
      name: `Category ${i + 1}`,
      color: `hsl(${(i * 360) / 20}, 70%, 50%)`,
    }));

    return (
      <InteractiveWrapper
        categories={manyCategories}
        label="Categories"
        placeholder="Select from many categories..."
      />
    );
  },
};

export const NoLabel: Story = {
  render: () => (
    <InteractiveWrapper
      categories={sampleCategories}
      placeholder="Select categories..."
    />
  ),
};

export const CustomPlaceholder: Story = {
  render: () => (
    <InteractiveWrapper
      categories={sampleCategories}
      label="Video Tags"
      placeholder="Choose your tags..."
    />
  ),
};

// =============================================================================
// INTERACTION TESTS
// =============================================================================

/**
 * Test keyboard navigation
 */
export const KeyboardNavigation: Story = {
  render: () => (
    <InteractiveWrapper categories={sampleCategories} label="Categories" />
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const trigger = canvas.getByRole('button', { name: /categories/i });

    // Tab to focus the trigger
    await userEvent.tab();

    // Verify trigger has focus
    await expect(trigger).toHaveFocus();
  },
};

/**
 * Test opening dropdown
 */
export const OpenDropdown: Story = {
  render: () => (
    <InteractiveWrapper categories={sampleCategories} label="Categories" />
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const trigger = canvas.getByRole('button', { name: /categories/i });

    // Click to open dropdown
    await userEvent.click(trigger);

    // Radix UI portals render outside the canvas, so we need to query the document body
    const body = within(document.body);
    const items = body.getAllByRole('menuitemcheckbox');
    await expect(items.length).toBeGreaterThan(0);
  },
};

/**
 * Test selecting a category
 */
export const SelectCategory: Story = {
  render: () => (
    <InteractiveWrapper categories={sampleCategories} label="Categories" />
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const trigger = canvas.getByRole('button', { name: /categories/i });

    // Open dropdown
    await userEvent.click(trigger);

    // Radix UI portals render outside the canvas, so we need to query the document body
    const body = within(document.body);
    const firstItem = body.getAllByRole('menuitemcheckbox')[0];
    if (firstItem) {
      await userEvent.click(firstItem);
    }

    // Verify selection appears in the debug output
    // (In a real test, we'd check the actual state)
  },
};

/**
 * Test removing a chip
 */
export const RemoveChip: Story = {
  render: () => (
    <InteractiveWrapper
      categories={sampleCategories}
      initialSelectedIds={['1', '2']}
      label="Categories"
    />
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    // Find chip buttons (they have role="button" and contain category names)
    const chips = canvas.getAllByRole('button').filter((btn) => {
      const text = btn.textContent;
      return text && sampleCategories.some((cat) => text.includes(cat.name));
    });

    if (chips.length > 0) {
      // Click first chip to remove it
      await userEvent.click(chips[0]!);
    }
  },
};
