import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Avatar } from './avatar';

/**
 * Avatar Component Unit Tests
 *
 * Tests core functionality, initials generation, and accessibility.
 *
 * @see /docs/adrs/005-testing-strategy.md
 */
describe('Avatar', () => {
  describe('initials generation', () => {
    it('renders initials from full name', () => {
      render(<Avatar name="John Doe" />);

      const avatar = screen.getByLabelText('John Doe');
      expect(avatar).toBeDefined();
      expect(avatar.textContent).toBe('JD');
    });

    it('renders single initial from single name', () => {
      render(<Avatar name="Alice" />);

      const avatar = screen.getByLabelText('Alice');
      expect(avatar).toBeDefined();
      expect(avatar.textContent).toBe('A');
    });

    it('renders initials from email when no name', () => {
      render(<Avatar email="john@example.com" />);

      const avatar = screen.getByLabelText('john@example.com');
      expect(avatar).toBeDefined();
      expect(avatar.textContent).toBe('JO');
    });

    it('renders fallback when no name or email', () => {
      render(<Avatar />);

      const avatar = screen.getByLabelText('User avatar');
      expect(avatar).toBeDefined();
      expect(avatar.textContent).toBe('?');
    });

    it('handles multiple word names correctly', () => {
      render(<Avatar name="Mary Jane Watson" />);

      const avatar = screen.getByLabelText('Mary Jane Watson');
      expect(avatar).toBeDefined();
      // Should use first and last word
      expect(avatar.textContent).toBe('MW');
    });

    it('handles whitespace in names', () => {
      const { container } = render(<Avatar name="  Bob   Smith  " />);

      // Find avatar by querying the DOM directly since testing-library normalizes whitespace
      const avatar = container.querySelector('[aria-label]');
      expect(avatar).toBeDefined();
      expect(avatar?.getAttribute('aria-label')).toBe('  Bob   Smith  ');
      expect(avatar?.textContent).toBe('BS');
    });
  });

  describe('size variants', () => {
    it('applies small size class', () => {
      render(<Avatar name="Test" size="sm" />);

      const avatar = screen.getByLabelText('Test');
      expect(avatar.className).toContain('sizeSm');
    });

    it('applies medium size class by default', () => {
      render(<Avatar name="Test" />);

      const avatar = screen.getByLabelText('Test');
      expect(avatar.className).toContain('sizeMd');
    });

    it('applies large size class', () => {
      render(<Avatar name="Test" size="lg" />);

      const avatar = screen.getByLabelText('Test');
      expect(avatar.className).toContain('sizeLg');
    });
  });

  describe('image rendering', () => {
    it('renders image when src provided', () => {
      render(<Avatar name="Test User" src="/avatar.jpg" />);

      const image = screen.getByAltText('Test User');
      expect(image).toBeDefined();
      expect(image.tagName).toBe('IMG');
    });

    it('uses email for alt text when no name', () => {
      render(<Avatar email="test@example.com" src="/avatar.jpg" />);

      const image = screen.getByAltText('test@example.com');
      expect(image).toBeDefined();
    });
  });

  describe('color consistency', () => {
    it('generates consistent color for same name', () => {
      const { container: container1 } = render(<Avatar name="John Doe" />);
      const { container: container2 } = render(<Avatar name="John Doe" />);

      const avatar1 = container1.querySelector('[aria-label="John Doe"]');
      const avatar2 = container2.querySelector('[aria-label="John Doe"]');

      const style1 = avatar1?.getAttribute('style');
      const style2 = avatar2?.getAttribute('style');

      expect(style1).toBe(style2);
    });

    it('generates different colors for different names', () => {
      const { container: container1 } = render(<Avatar name="John Doe" />);
      const { container: container2 } = render(<Avatar name="Jane Smith" />);

      const avatar1 = container1.querySelector('[aria-label="John Doe"]');
      const avatar2 = container2.querySelector('[aria-label="Jane Smith"]');

      const style1 = avatar1?.getAttribute('style');
      const style2 = avatar2?.getAttribute('style');

      // Different names should likely have different colors (though hash collisions are possible)
      // This test might occasionally fail due to hash collisions, but it's unlikely
      expect(style1).not.toBe(style2);
    });
  });

  describe('custom className', () => {
    it('applies custom className', () => {
      render(<Avatar name="Test" className="custom-class" />);

      const avatar = screen.getByLabelText('Test');
      expect(avatar.className).toContain('custom-class');
    });

    it('preserves default classes with custom className', () => {
      render(<Avatar name="Test" className="custom-class" />);

      const avatar = screen.getByLabelText('Test');
      expect(avatar.className).toContain('avatar');
      expect(avatar.className).toContain('custom-class');
    });
  });

  describe('accessibility', () => {
    it('has correct aria-label with name', () => {
      render(<Avatar name="John Doe" />);

      const avatar = screen.getByLabelText('John Doe');
      expect(avatar).toBeDefined();
    });

    it('has correct aria-label with email', () => {
      render(<Avatar email="test@example.com" />);

      const avatar = screen.getByLabelText('test@example.com');
      expect(avatar).toBeDefined();
    });

    it('has aria-hidden on initials text', () => {
      const { container } = render(<Avatar name="Test" />);

      // Query using CSS module class pattern
      const initialsSpan = container.querySelector('span[aria-hidden="true"]');
      expect(initialsSpan?.getAttribute('aria-hidden')).toBe('true');
      expect(initialsSpan?.textContent).toBe('T');
    });

    it('has fallback aria-label when no data', () => {
      render(<Avatar />);

      const avatar = screen.getByLabelText('User avatar');
      expect(avatar).toBeDefined();
    });
  });
});
