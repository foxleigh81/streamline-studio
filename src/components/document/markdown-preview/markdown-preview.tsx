'use client';

import { useMemo } from 'react';
import { marked } from 'marked';
import DOMPurify from 'dompurify';
import styles from './markdown-preview.module.scss';

/**
 * Props for the MarkdownPreview component.
 */
export interface MarkdownPreviewProps {
  /** Markdown content to render */
  content: string;
  /** Optional CSS class name */
  className?: string;
  /** Accessibility label for the preview */
  ariaLabel?: string;
}

/**
 * Configure marked options for security and consistency.
 */
marked.setOptions({
  breaks: true, // Convert \n to <br>
  gfm: true, // GitHub Flavored Markdown
});

/**
 * Parses and sanitizes markdown content.
 * Uses marked for parsing and DOMPurify for sanitization.
 *
 * @param markdown - Raw markdown string
 * @returns Sanitized HTML string
 */
function parseMarkdown(markdown: string): string {
  // Parse markdown to HTML
  const rawHtml = marked.parse(markdown, { async: false }) as string;

  // Sanitize HTML to prevent XSS attacks
  const sanitizedHtml = DOMPurify.sanitize(rawHtml, {
    ALLOWED_TAGS: [
      'h1',
      'h2',
      'h3',
      'h4',
      'h5',
      'h6',
      'p',
      'br',
      'strong',
      'em',
      'u',
      's',
      'code',
      'pre',
      'blockquote',
      'ul',
      'ol',
      'li',
      'a',
      'img',
      'table',
      'thead',
      'tbody',
      'tr',
      'th',
      'td',
      'hr',
      'div',
      'span',
    ],
    ALLOWED_ATTR: [
      'href',
      'src',
      'alt',
      'title',
      'class',
      'id',
      'style',
      'target',
      'rel',
    ],
    ALLOW_DATA_ATTR: false,
  });

  return sanitizedHtml;
}

/**
 * MarkdownPreview Component
 *
 * Renders markdown content as sanitized HTML.
 * Uses marked for markdown parsing and DOMPurify for XSS prevention.
 *
 * Features:
 * - GitHub Flavored Markdown support
 * - XSS protection via DOMPurify
 * - Styled markdown output
 * - Accessible with ARIA labels
 *
 * @example
 * ```tsx
 * <MarkdownPreview
 *   content="# Hello World\n\nThis is **bold** text."
 *   ariaLabel="Video script preview"
 * />
 * ```
 */
export function MarkdownPreview({
  content,
  className,
  ariaLabel = 'Markdown preview',
}: MarkdownPreviewProps) {
  // Memoize the parsed HTML to avoid re-parsing on every render
  const htmlContent = useMemo(() => parseMarkdown(content), [content]);

  return (
    <div
      className={`${styles.preview} ${className ?? ''}`}
      dangerouslySetInnerHTML={{ __html: htmlContent }}
      role="region"
      aria-label={ariaLabel}
    />
  );
}

MarkdownPreview.displayName = 'MarkdownPreview';
