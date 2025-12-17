'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import styles from './layout.module.scss';

/**
 * Settings Navigation Component
 *
 * Client-side navigation component that highlights the active settings section.
 * Uses Next.js usePathname hook to detect the current route.
 *
 * @param teamspace - The current teamspace slug
 */

interface NavItem {
  label: string;
  href: string;
  description: string;
}

interface SettingsNavProps {
  teamspace: string;
}

export function SettingsNav({ teamspace }: SettingsNavProps) {
  const pathname = usePathname();

  // Navigation items for settings sections
  const navItems: NavItem[] = [
    {
      label: 'Account',
      href: `/t/${teamspace}/settings`,
      description: 'Manage your account settings',
    },
    {
      label: 'Preferences',
      href: `/t/${teamspace}/settings/preferences`,
      description: 'Customize your experience',
    },
  ];

  /**
   * Determines if a navigation item is currently active
   */
  const isActive = (href: string): boolean => {
    // Exact match for the base settings page
    if (href === `/t/${teamspace}/settings`) {
      return pathname === href;
    }
    // Prefix match for sub-pages
    return pathname.startsWith(href);
  };

  return (
    <nav className={styles.nav}>
      <h2 className={styles.navHeading}>Settings</h2>
      <ul className={styles.navList}>
        {navItems.map((item) => {
          const active = isActive(item.href);
          return (
            <li key={item.href}>
              <Link
                href={item.href}
                className={styles.navLink}
                aria-label={item.description}
                aria-current={active ? 'page' : undefined}
              >
                <span className={styles.navLinkLabel}>{item.label}</span>
                <span className={styles.navLinkDescription}>
                  {item.description}
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
