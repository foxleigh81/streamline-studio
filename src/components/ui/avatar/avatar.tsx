import type { HTMLAttributes } from 'react';
import Image from 'next/image';
import styles from './avatar.module.scss';

/**
 * Avatar size options.
 */
export type AvatarSize = 'sm' | 'md' | 'lg';

/**
 * Avatar component props.
 */
export interface AvatarProps extends HTMLAttributes<HTMLDivElement> {
  /** User's display name (used for initials) */
  name?: string;
  /** User's email (fallback for initials if no name) */
  email?: string;
  /** Optional image URL (for future use) */
  src?: string;
  /** Size variant */
  size?: AvatarSize;
}

/**
 * Map size to CSS module class.
 */
const sizeClasses: Record<AvatarSize, string> = {
  sm: styles.sizeSm ?? '',
  md: styles.sizeMd ?? '',
  lg: styles.sizeLg ?? '',
};

/**
 * Generate initials from name or email
 */
function getInitials(name?: string, email?: string): string {
  if (name) {
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) {
      // First letter of first and last word
      return `${parts[0]?.[0] ?? ''}${parts[parts.length - 1]?.[0] ?? ''}`.toUpperCase();
    }
    // First letter of single word
    return (parts[0]?.[0] ?? '').toUpperCase();
  }

  if (email) {
    // First 2 letters of email username
    const username = email.split('@')[0] ?? '';
    return username.slice(0, 2).toUpperCase();
  }

  return '?';
}

/**
 * Generate consistent background color from string
 * Uses simple hash to map name/email to a predefined color palette
 */
function getBackgroundColor(name?: string, email?: string): string {
  const str = name ?? email ?? '';

  // Simple hash function
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
    hash = hash & hash; // Convert to 32-bit integer
  }

  // Color palette with good contrast (HSL values)
  // These colors provide WCAG AA compliant contrast (4.5:1) with white text
  // All colors have lightness ≤ 45% to ensure sufficient contrast
  const colors = [
    'hsl(210, 70%, 35%)', // Blue - darker
    'hsl(160, 60%, 30%)', // Teal - darker
    'hsl(280, 60%, 40%)', // Purple
    'hsl(340, 65%, 40%)', // Pink/Red
    'hsl(25, 70%, 40%)', // Orange - darker
    'hsl(190, 70%, 30%)', // Cyan - darker
    'hsl(320, 60%, 40%)', // Magenta
    'hsl(140, 50%, 32%)', // Green - darker
  ];

  const index = Math.abs(hash) % colors.length;
  return colors[index] ?? 'hsl(0, 0%, 50%)';
}

/**
 * Avatar Component
 *
 * Displays a user avatar with automatic initials generation and consistent color coding.
 * Falls back to initials when no image is provided, with colors generated from the user's name or email.
 *
 * @example
 * ```tsx
 * <Avatar name="John Doe" size="md" />
 * <Avatar email="alice@example.com" size="sm" />
 * <Avatar name="Bob Smith" src="/avatar.jpg" size="lg" />
 * ```
 */
export function Avatar({
  name,
  email,
  src,
  size = 'md',
  className,
  ...props
}: AvatarProps) {
  const initials = getInitials(name, email);
  const backgroundColor = getBackgroundColor(name, email);

  const avatarClasses = [styles.avatar, sizeClasses[size], className]
    .filter(Boolean)
    .join(' ');

  // Determine alt text for accessibility
  const altText = name ?? email ?? 'User avatar';

  if (src) {
    return (
      <div className={avatarClasses} {...props}>
        <Image
          src={src}
          alt={altText}
          className={styles.image}
          width={size === 'sm' ? 32 : size === 'md' ? 40 : 56}
          height={size === 'sm' ? 32 : size === 'md' ? 40 : 56}
        />
      </div>
    );
  }

  return (
    <div
      className={avatarClasses}
      style={{ backgroundColor }}
      aria-label={altText}
      {...props}
    >
      <span className={styles.initials} aria-hidden="true">
        {initials}
      </span>
    </div>
  );
}

Avatar.displayName = 'Avatar';
