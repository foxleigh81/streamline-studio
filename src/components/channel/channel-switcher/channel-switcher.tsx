'use client';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { trpc } from '@/lib/trpc/client';
import styles from './channel-switcher.module.scss';

/**
 * Channel Switcher Component
 *
 * Displays the current channel and allows switching between channels.
 * Shows a dropdown with all available channels and a create option.
 *
 * Adapts to single-tenant vs multi-tenant deployment modes:
 * - Single-tenant: Lists all channels at /t/[channel]
 * - Multi-tenant: Lists channels within teamspace at /t/[teamspace]/[channel]
 *
 * @see /docs/adrs/017-teamspace-hierarchy.md
 */

export interface ChannelSwitcherProps {
  /** Current channel slug */
  channelSlug: string;
  /** Current channel name */
  channelName?: string;
  /** Callback when create channel is clicked */
  onCreateChannel?: () => void;
  /** Optional teamspace slug (only for multi-tenant mode) */
  teamspaceSlug?: string;
}

/**
 * Channel Switcher Component
 */
export function ChannelSwitcher({
  channelSlug,
  channelName,
  onCreateChannel,
  teamspaceSlug,
}: ChannelSwitcherProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState<number>(-1);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  // Always use unified routing - default to "workspace" if no teamspace provided
  const effectiveTeamspaceSlug = teamspaceSlug ?? 'workspace';

  // Fetch all channels the user has access to
  const { data: channels = [], isLoading } = trpc.channel.list.useQuery();

  // Get current channel details if not provided
  const currentChannel = channels.find((c) => c.slug === channelSlug);
  const displayName = channelName ?? currentChannel?.name ?? channelSlug;

  /**
   * Close dropdown when clicking outside
   */
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
      };
    }

    return undefined;
  }, [isOpen]);

  /**
   * Handle keyboard navigation
   */
  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (!isOpen) return;

    // Total number of menu items (channels + View All + Create New if available)
    const totalItems = channels.length + 1 + (onCreateChannel ? 1 : 0);

    switch (event.key) {
      case 'Escape':
        event.preventDefault();
        setIsOpen(false);
        setActiveIndex(-1);
        break;

      case 'ArrowDown':
        event.preventDefault();
        setActiveIndex((prevIndex) => {
          const nextIndex = prevIndex + 1;
          return nextIndex >= totalItems ? 0 : nextIndex;
        });
        break;

      case 'ArrowUp':
        event.preventDefault();
        setActiveIndex((prevIndex) => {
          const nextIndex = prevIndex - 1;
          return nextIndex < 0 ? totalItems - 1 : nextIndex;
        });
        break;

      case 'Home':
        event.preventDefault();
        setActiveIndex(0);
        break;

      case 'End':
        event.preventDefault();
        setActiveIndex(totalItems - 1);
        break;

      case 'Enter':
        event.preventDefault();
        if (activeIndex >= 0 && activeIndex < channels.length) {
          // Channel item
          const selectedChannel = channels[activeIndex];
          if (selectedChannel) {
            handleChannelSelect(selectedChannel.slug);
          }
        } else if (activeIndex === channels.length) {
          // View All Channels - navigate to teamspace page
          router.push(`/t/${effectiveTeamspaceSlug}`);
          setIsOpen(false);
        } else if (activeIndex === channels.length + 1 && onCreateChannel) {
          // Create New Channel
          setIsOpen(false);
          onCreateChannel();
        }
        break;
    }
  };

  /**
   * Reset active index when dropdown closes
   */
  useEffect(() => {
    if (!isOpen) {
      setActiveIndex(-1);
    }
  }, [isOpen]);

  /**
   * Handle channel selection
   */
  const handleChannelSelect = (slug: string) => {
    setIsOpen(false);
    if (slug !== channelSlug) {
      // Always use unified routing structure
      router.push(`/t/${effectiveTeamspaceSlug}/${slug}/content-plan`);
    }
  };

  return (
    <div
      className={styles.container}
      ref={dropdownRef}
      onKeyDown={handleKeyDown}
    >
      <button
        className={styles.trigger}
        onClick={() => setIsOpen(!isOpen)}
        aria-expanded={isOpen}
        aria-haspopup="true"
        aria-label="Switch channel"
      >
        <span className={styles.channelName}>{displayName}</span>
        <span
          className={`${styles.chevron} ${isOpen ? styles.chevronOpen : ''}`}
          aria-hidden="true"
        >
          ▼
        </span>
      </button>

      {isOpen && (
        <div
          className={styles.dropdown}
          role="menu"
          aria-activedescendant={
            activeIndex >= 0 ? `channel-item-${activeIndex}` : undefined
          }
        >
          {isLoading ? (
            <div className={styles.loading}>Loading channels...</div>
          ) : (
            <>
              <div className={styles.dropdownSection}>
                <div className={styles.dropdownLabel}>Your Channels</div>
                {channels.map((channel, index) => (
                  <button
                    key={channel.id}
                    id={`channel-item-${index}`}
                    className={`${styles.dropdownItem} ${
                      channel.slug === channelSlug
                        ? styles.dropdownItemActive
                        : ''
                    } ${activeIndex === index ? styles.dropdownItemFocused : ''}`}
                    onClick={() => handleChannelSelect(channel.slug)}
                    role="menuitem"
                    tabIndex={-1}
                  >
                    <span className={styles.channelItemName}>
                      {channel.name}
                    </span>
                    <span className={styles.channelRole}>{channel.role}</span>
                  </button>
                ))}
              </div>

              <div className={styles.dropdownDivider} />

              <div className={styles.dropdownSection}>
                <Link
                  id={`channel-item-${channels.length}`}
                  href={`/t/${effectiveTeamspaceSlug}`}
                  className={`${styles.dropdownItem} ${
                    activeIndex === channels.length
                      ? styles.dropdownItemFocused
                      : ''
                  }`}
                  onClick={() => setIsOpen(false)}
                  role="menuitem"
                  tabIndex={-1}
                >
                  View All Channels
                </Link>

                {onCreateChannel && (
                  <button
                    id={`channel-item-${channels.length + 1}`}
                    className={`${styles.dropdownItem} ${
                      activeIndex === channels.length + 1
                        ? styles.dropdownItemFocused
                        : ''
                    }`}
                    onClick={() => {
                      setIsOpen(false);
                      onCreateChannel();
                    }}
                    role="menuitem"
                    tabIndex={-1}
                  >
                    + Create New Channel
                  </button>
                )}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}

ChannelSwitcher.displayName = 'ChannelSwitcher';
