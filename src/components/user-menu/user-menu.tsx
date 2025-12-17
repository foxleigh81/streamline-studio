'use client';

import { useState } from 'react';
import * as DropdownMenu from '@radix-ui/react-dropdown-menu';
import { User, Sliders, LogOut, ChevronUp } from 'lucide-react';
import { AccountSettingsModal } from './account-settings-modal';
import { PreferencesModal } from './preferences-modal';
import styles from './user-menu.module.scss';

/**
 * User menu component props
 */
export interface UserMenuProps {
  /** User's name */
  userName: string | null;
  /** User's email */
  userEmail: string;
  /** User's ID */
  userId: string;
  /** Logout handler */
  onLogout: () => void;
  /** Whether logout is in progress */
  isLoggingOut?: boolean;
}

/**
 * User Menu Component
 *
 * Displays a user menu button in the sidebar with dropdown options:
 * - Account Settings (opens modal)
 * - Preferences (opens modal)
 * - Log Out
 *
 * Uses Radix UI DropdownMenu for accessibility and keyboard navigation.
 */
export function UserMenu({
  userName,
  userEmail,
  userId,
  onLogout,
  isLoggingOut = false,
}: UserMenuProps) {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isAccountModalOpen, setIsAccountModalOpen] = useState(false);
  const [isPreferencesModalOpen, setIsPreferencesModalOpen] = useState(false);

  /**
   * Get user initials for avatar
   */
  const getUserInitials = () => {
    if (userName) {
      const parts = userName.split(' ');
      if (parts.length >= 2) {
        const first = parts[0];
        const second = parts[1];
        if (first && second) {
          return `${first[0]}${second[0]}`.toUpperCase();
        }
      }
      return userName.substring(0, 2).toUpperCase();
    }
    return userEmail.substring(0, 2).toUpperCase();
  };

  /**
   * Handle account settings click
   */
  const handleAccountSettings = () => {
    setIsDropdownOpen(false);
    setIsAccountModalOpen(true);
  };

  /**
   * Handle preferences click
   */
  const handlePreferences = () => {
    setIsDropdownOpen(false);
    setIsPreferencesModalOpen(true);
  };

  /**
   * Handle logout click
   */
  const handleLogout = () => {
    setIsDropdownOpen(false);
    onLogout();
  };

  return (
    <>
      <DropdownMenu.Root open={isDropdownOpen} onOpenChange={setIsDropdownOpen}>
        <DropdownMenu.Trigger asChild>
          <button
            className={styles.trigger}
            aria-label="User menu"
            disabled={isLoggingOut}
          >
            <div className={styles.avatar} aria-hidden="true">
              {getUserInitials()}
            </div>
            <div className={styles.userInfo}>
              <span className={styles.userName}>{userName ?? 'User'}</span>
              <span className={styles.userEmail}>{userEmail}</span>
            </div>
            <ChevronUp
              className={`${styles.chevron} ${isDropdownOpen ? styles.chevronOpen : ''}`}
              aria-hidden="true"
            />
          </button>
        </DropdownMenu.Trigger>

        <DropdownMenu.Portal>
          <DropdownMenu.Content
            className={styles.content}
            align="end"
            sideOffset={8}
          >
            <DropdownMenu.Item
              className={styles.item}
              onSelect={handleAccountSettings}
            >
              <User className={styles.itemIcon} aria-hidden="true" />
              <span>Account Settings</span>
            </DropdownMenu.Item>

            <DropdownMenu.Item
              className={styles.item}
              onSelect={handlePreferences}
            >
              <Sliders className={styles.itemIcon} aria-hidden="true" />
              <span>Preferences</span>
            </DropdownMenu.Item>

            <DropdownMenu.Separator className={styles.separator} />

            <DropdownMenu.Item
              className={`${styles.item} ${styles.itemDanger}`}
              onSelect={handleLogout}
              disabled={isLoggingOut}
            >
              <LogOut className={styles.itemIcon} aria-hidden="true" />
              <span>{isLoggingOut ? 'Logging out...' : 'Log Out'}</span>
            </DropdownMenu.Item>
          </DropdownMenu.Content>
        </DropdownMenu.Portal>
      </DropdownMenu.Root>

      {/* Account Settings Modal */}
      <AccountSettingsModal
        isOpen={isAccountModalOpen}
        onClose={() => setIsAccountModalOpen(false)}
        userId={userId}
        userName={userName}
        userEmail={userEmail}
      />

      {/* Preferences Modal */}
      <PreferencesModal
        isOpen={isPreferencesModalOpen}
        onClose={() => setIsPreferencesModalOpen(false)}
      />
    </>
  );
}

UserMenu.displayName = 'UserMenu';
