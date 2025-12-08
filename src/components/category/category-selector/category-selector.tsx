'use client';

import { useState, useRef } from 'react';
import * as DropdownMenu from '@radix-ui/react-dropdown-menu';
import styles from './category-selector.module.scss';

/**
 * Category item shape
 */
export interface Category {
  id: string;
  name: string;
  color: string;
}

/**
 * CategorySelector component props
 */
export interface CategorySelectorProps {
  /** Available categories */
  categories: Category[];
  /** Currently selected category IDs */
  selectedIds: string[];
  /** Callback when selection changes */
  onChange: (selectedIds: string[]) => void;
  /** Label for the selector */
  label?: string;
  /** Error message */
  error?: string;
  /** Placeholder text */
  placeholder?: string;
  /** Whether the selector is disabled */
  disabled?: boolean;
  /** Optional className for custom styling */
  className?: string;
}

/**
 * CategorySelector Component
 *
 * Multi-select dropdown for categories with color chips.
 * Uses Radix UI DropdownMenu for accessibility.
 */
export function CategorySelector({
  categories,
  selectedIds,
  onChange,
  label,
  error,
  placeholder = 'Select categories...',
  disabled = false,
  className,
}: CategorySelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);

  /**
   * Get selected categories from IDs
   */
  const selectedCategories = categories.filter((cat) =>
    selectedIds.includes(cat.id)
  );

  /**
   * Toggle category selection
   */
  const toggleCategory = (categoryId: string) => {
    if (selectedIds.includes(categoryId)) {
      onChange(selectedIds.filter((id) => id !== categoryId));
    } else {
      onChange([...selectedIds, categoryId]);
    }
  };

  /**
   * Remove a category chip
   */
  const removeCategory = (categoryId: string) => {
    onChange(selectedIds.filter((id) => id !== categoryId));
  };

  /**
   * Handle keyboard interaction on chips
   */
  const handleChipKeyDown = (e: React.KeyboardEvent, categoryId: string) => {
    if (e.key === 'Backspace' || e.key === 'Delete') {
      e.preventDefault();
      removeCategory(categoryId);
    }
  };

  const wrapperClasses = [styles.wrapper, className].filter(Boolean).join(' ');

  return (
    <div className={wrapperClasses}>
      {label && <label className={styles.label}>{label}</label>}

      <DropdownMenu.Root open={isOpen} onOpenChange={setIsOpen}>
        <DropdownMenu.Trigger asChild>
          <button
            ref={triggerRef}
            type="button"
            className={`${styles.trigger} ${error ? styles.triggerError : ''}`}
            disabled={disabled}
            aria-label={label ?? 'Select categories'}
            aria-describedby={error ? 'category-selector-error' : undefined}
          >
            <div className={styles.selectedContainer}>
              {selectedCategories.length === 0 ? (
                <span className={styles.placeholder}>{placeholder}</span>
              ) : (
                <div className={styles.chips}>
                  {selectedCategories.map((category) => (
                    <span
                      key={category.id}
                      className={styles.chip}
                      style={{
                        backgroundColor: `${category.color}20`,
                        color: category.color,
                        borderColor: category.color,
                      }}
                      onClick={(e) => {
                        e.stopPropagation();
                        removeCategory(category.id);
                      }}
                      onKeyDown={(e) => handleChipKeyDown(e, category.id)}
                      tabIndex={0}
                      aria-label={`Remove ${category.name}`}
                    >
                      {category.name}
                      <span className={styles.chipRemove} aria-hidden="true">
                        ×
                      </span>
                    </span>
                  ))}
                </div>
              )}
            </div>
            <span className={styles.arrow} aria-hidden="true">
              ▼
            </span>
          </button>
        </DropdownMenu.Trigger>

        <DropdownMenu.Portal>
          <DropdownMenu.Content
            className={styles.content}
            align="start"
            sideOffset={4}
          >
            {categories.length === 0 ? (
              <div className={styles.empty}>No categories available</div>
            ) : (
              categories.map((category) => {
                const isSelected = selectedIds.includes(category.id);
                return (
                  <DropdownMenu.CheckboxItem
                    key={category.id}
                    className={styles.item}
                    checked={isSelected}
                    onSelect={(e) => {
                      e.preventDefault();
                      toggleCategory(category.id);
                    }}
                  >
                    <span className={styles.itemIndicator}>
                      {isSelected ? '✓' : ''}
                    </span>
                    <span
                      className={styles.colorDot}
                      style={{ backgroundColor: category.color }}
                      aria-hidden="true"
                    />
                    <span className={styles.itemText}>{category.name}</span>
                  </DropdownMenu.CheckboxItem>
                );
              })
            )}
          </DropdownMenu.Content>
        </DropdownMenu.Portal>
      </DropdownMenu.Root>

      {error && (
        <span
          id="category-selector-error"
          className={styles.error}
          role="alert"
        >
          {error}
        </span>
      )}
    </div>
  );
}

CategorySelector.displayName = 'CategorySelector';
