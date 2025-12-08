/**
 * Color Contrast Utilities
 *
 * Functions to calculate and verify WCAG color contrast ratios.
 * Ensures accessibility compliance for text and interactive elements.
 */

/**
 * Convert hex color to RGB
 */
function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16),
      }
    : null;
}

/**
 * Calculate relative luminance of a color
 * @see https://www.w3.org/WAI/GL/wiki/Relative_luminance
 */
function getLuminance(r: number, g: number, b: number): number {
  const [rs, gs, bs] = [r, g, b].map((c) => {
    const srgb = c / 255;
    return srgb <= 0.03928
      ? srgb / 12.92
      : Math.pow((srgb + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
}

/**
 * Calculate contrast ratio between two colors
 * @see https://www.w3.org/WAI/GL/wiki/Contrast_ratio
 */
export function getContrastRatio(color1: string, color2: string): number {
  const rgb1 = hexToRgb(color1);
  const rgb2 = hexToRgb(color2);

  if (!rgb1 || !rgb2) {
    throw new Error('Invalid hex color format');
  }

  const lum1 = getLuminance(rgb1.r, rgb1.g, rgb1.b);
  const lum2 = getLuminance(rgb2.r, rgb2.g, rgb2.b);

  const lighter = Math.max(lum1, lum2);
  const darker = Math.min(lum1, lum2);

  return (lighter + 0.05) / (darker + 0.05);
}

/**
 * Check if contrast ratio meets WCAG AA standard (4.5:1 for normal text)
 */
export function meetsWCAG_AA(foreground: string, background: string): boolean {
  const ratio = getContrastRatio(foreground, background);
  return ratio >= 4.5;
}

/**
 * Check if contrast ratio meets WCAG AAA standard (7:1 for normal text)
 */
export function meetsWCAG_AAA(foreground: string, background: string): boolean {
  const ratio = getContrastRatio(foreground, background);
  return ratio >= 7;
}

/**
 * Check if contrast ratio meets WCAG AA for large text (3:1)
 */
export function meetsWCAG_AA_LargeText(
  foreground: string,
  background: string
): boolean {
  const ratio = getContrastRatio(foreground, background);
  return ratio >= 3;
}

/**
 * Get a readable text color (black or white) for a given background
 */
export function getReadableTextColor(
  backgroundColor: string
): '#000000' | '#FFFFFF' {
  const whiteContrast = getContrastRatio('#FFFFFF', backgroundColor);
  const blackContrast = getContrastRatio('#000000', backgroundColor);

  return whiteContrast > blackContrast ? '#FFFFFF' : '#000000';
}

/**
 * Validate all preset colors against white background
 */
export function validateColorPalette(colors: readonly string[]): {
  color: string;
  ratio: number;
  passes: boolean;
}[] {
  return colors.map((color) => {
    const ratio = getContrastRatio(color, '#FFFFFF');
    return {
      color,
      ratio,
      passes: ratio >= 4.5,
    };
  });
}
