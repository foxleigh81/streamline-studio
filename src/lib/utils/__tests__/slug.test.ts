/**
 * Slug Generation Utilities Tests
 */

import { describe, it, expect } from 'vitest';
import { generateSlug, generateUniqueSlug } from '../slug';

describe('generateSlug', () => {
  it('converts simple names to slugs', () => {
    expect(generateSlug('My Project')).toBe('my-project');
    expect(generateSlug('YouTube Channel')).toBe('youtube-channel');
  });

  it('handles special characters', () => {
    expect(generateSlug('What the heck!?')).toBe('what-the-heck');
    expect(generateSlug('Project!!!')).toBe('project');
    expect(generateSlug('User@Email.com')).toBe('user-email-com');
  });

  it('handles numbers', () => {
    expect(generateSlug('123 Numbers')).toBe('123-numbers');
    expect(generateSlug('Project 2024')).toBe('project-2024');
    expect(generateSlug('2023')).toBe('2023');
  });

  it('handles multiple consecutive special characters', () => {
    expect(generateSlug('Multiple   Spaces')).toBe('multiple-spaces');
    expect(generateSlug('Lots---of---dashes')).toBe('lots-of-dashes');
    expect(generateSlug('Mixed !@# $%^ &*() chars')).toBe('mixed-chars');
  });

  it('trims leading and trailing whitespace', () => {
    expect(generateSlug('   Spaces   ')).toBe('spaces');
    expect(generateSlug('  Leading')).toBe('leading');
    expect(generateSlug('Trailing  ')).toBe('trailing');
  });

  it('removes leading and trailing hyphens', () => {
    expect(generateSlug('---dashes---')).toBe('dashes');
    expect(generateSlug('!@#start')).toBe('start');
    expect(generateSlug('end!@#')).toBe('end');
  });

  it('handles empty strings with fallback', () => {
    expect(generateSlug('')).toBe('my-project');
    expect(generateSlug('   ')).toBe('my-project');
    expect(generateSlug('!@#$%^&*()')).toBe('my-project');
  });

  it('supports custom fallback', () => {
    expect(generateSlug('', 'custom-fallback')).toBe('custom-fallback');
    expect(generateSlug('   ', 'default')).toBe('default');
  });

  it('handles unicode characters', () => {
    expect(generateSlug('Café')).toBe('caf');
    expect(generateSlug('Tëst Prøject')).toBe('t-st-pr-ject');
    expect(generateSlug('测试')).toBe('my-project'); // Falls back for non-latin
  });

  it('handles very long names', () => {
    const longName = 'A'.repeat(100) + ' ' + 'B'.repeat(100);
    const slug = generateSlug(longName);
    expect(slug).toBe('a'.repeat(100) + '-' + 'b'.repeat(100));
    expect(slug.length).toBe(201); // 100 + 1 (hyphen) + 100
  });

  it('handles mixed case', () => {
    expect(generateSlug('MiXeD CaSe')).toBe('mixed-case');
    expect(generateSlug('UPPERCASE')).toBe('uppercase');
    expect(generateSlug('lowercase')).toBe('lowercase');
  });

  it('handles common project name patterns', () => {
    expect(generateSlug('My YouTube Channel')).toBe('my-youtube-channel');
    expect(generateSlug('Content Studio')).toBe('content-studio');
    expect(generateSlug('Video Projects')).toBe('video-projects');
    expect(generateSlug("John's Blog")).toBe('john-s-blog');
  });
});

describe('generateUniqueSlug', () => {
  it('appends a random suffix', () => {
    const baseSlug = 'my-project';
    const uniqueSlug = generateUniqueSlug(baseSlug);

    expect(uniqueSlug).toMatch(/^my-project-[a-z0-9]{6}$/);
  });

  it('generates different suffixes on multiple calls', () => {
    const baseSlug = 'my-project';
    const slug1 = generateUniqueSlug(baseSlug);
    const slug2 = generateUniqueSlug(baseSlug);
    const slug3 = generateUniqueSlug(baseSlug);

    // All should start with base
    expect(slug1).toContain('my-project-');
    expect(slug2).toContain('my-project-');
    expect(slug3).toContain('my-project-');

    // All should be different (extremely high probability)
    expect(slug1).not.toBe(slug2);
    expect(slug2).not.toBe(slug3);
    expect(slug1).not.toBe(slug3);
  });

  it('works with slugs that already have hyphens', () => {
    const baseSlug = 'my-awesome-project';
    const uniqueSlug = generateUniqueSlug(baseSlug);

    expect(uniqueSlug).toMatch(/^my-awesome-project-[a-z0-9]{6}$/);
  });
});
