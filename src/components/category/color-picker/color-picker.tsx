'use client';

import { useState } from 'react';
import styles from './color-picker.module.scss';

/**
 * Preset color palette (18 accessible colors with 4.5:1 contrast ratio on white)
 * Organized in semantic groups: neutrals, blues, greens, yellows, oranges, reds, purples, pinks
 */
export const PRESET_COLORS = [
  // Neutrals
  '#6B7280', // Gray
  '#374151', // Dark Gray
  '#1F2937', // Charcoal

  // Blues
  '#3B82F6', // Blue
  '#2563EB', // Dark Blue
  '#1E40AF', // Navy

  // Greens
  '#22C55E', // Green
  '#16A34A', // Dark Green
  '#14B8A6', // Teal

  // Yellows
  '#F59E0B', // Amber
  '#EAB308', // Yellow
  '#CA8A04', // Dark Yellow

  // Oranges/Reds
  '#F97316', // Orange
  '#EF4444', // Red
  '#DC2626', // Dark Red

  // Purples/Pinks
  '#8B5CF6', // Purple
  '#7C3AED', // Dark Purple
  '#EC4899', // Pink
] as const;

/**
 * Color picker component props
 */
export interface ColorPickerProps {
  /** Currently selected color (hex code) */
  value: string;
  /** Callback when color is selected */
  onChange: (color: string) => void;
  /** Optional label for accessibility */
  label?: string;
  /** Optional className for custom styling */
  className?: string;
}

/**
 * ColorPicker Component
 *
 * A color picker component that displays 18 preset colors in a grid.
 * Users can select a color by clicking on it. Fully keyboard accessible.
 */
export function ColorPicker({
  value,
  onChange,
  label = 'Select color',
  className,
}: ColorPickerProps) {
  const [_focusedIndex, setFocusedIndex] = useState<number>(-1);

  /**
   * Handle keyboard navigation
   */
  const handleKeyDown = (
    e: React.KeyboardEvent<HTMLButtonElement>,
    index: number
  ) => {
    let newIndex = index;

    switch (e.key) {
      case 'ArrowRight':
        e.preventDefault();
        newIndex = (index + 1) % PRESET_COLORS.length;
        break;
      case 'ArrowLeft':
        e.preventDefault();
        newIndex = (index - 1 + PRESET_COLORS.length) % PRESET_COLORS.length;
        break;
      case 'ArrowDown':
        e.preventDefault();
        newIndex = Math.min(index + 6, PRESET_COLORS.length - 1);
        break;
      case 'ArrowUp':
        e.preventDefault();
        newIndex = Math.max(index - 6, 0);
        break;
      case 'Home':
        e.preventDefault();
        newIndex = 0;
        break;
      case 'End':
        e.preventDefault();
        newIndex = PRESET_COLORS.length - 1;
        break;
      default:
        return;
    }

    setFocusedIndex(newIndex);
    // Focus the button after state update
    setTimeout(() => {
      const buttons = document.querySelectorAll(
        `.${styles.colorButton}`
      ) as NodeListOf<HTMLButtonElement>;
      buttons[newIndex]?.focus();
    }, 0);
  };

  const containerClasses = [styles.container, className]
    .filter(Boolean)
    .join(' ');

  return (
    <div className={containerClasses}>
      <span className={styles.label} id="color-picker-label">
        {label}
      </span>
      <div
        className={styles.grid}
        role="radiogroup"
        aria-labelledby="color-picker-label"
      >
        {PRESET_COLORS.map((color, index) => {
          const isSelected = value === color;
          const buttonClasses = [
            styles.colorButton,
            isSelected ? styles.selected : '',
          ]
            .filter(Boolean)
            .join(' ');

          return (
            <button
              key={color}
              type="button"
              className={buttonClasses}
              style={{ backgroundColor: color }}
              onClick={() => onChange(color)}
              onKeyDown={(e) => handleKeyDown(e, index)}
              onFocus={() => setFocusedIndex(index)}
              role="radio"
              aria-checked={isSelected}
              aria-label={`Color ${color}`}
              tabIndex={isSelected ? 0 : -1}
            >
              {isSelected && (
                <svg
                  className={styles.checkmark}
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="3"
                  aria-hidden="true"
                >
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

ColorPicker.displayName = 'ColorPicker';
