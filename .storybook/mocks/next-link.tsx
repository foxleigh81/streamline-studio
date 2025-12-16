/**
 * Mock for next/link in Storybook
 *
 * This provides a simple <a> tag implementation since Storybook
 * uses @storybook/react-vite instead of @storybook/nextjs due to
 * Next.js 15.5 compatibility issues.
 */
import * as React from 'react';

type LinkProps = React.AnchorHTMLAttributes<HTMLAnchorElement> & {
  href: string;
  children: React.ReactNode;
};

const Link = React.forwardRef<HTMLAnchorElement, LinkProps>(function Link(
  { href, children, ...rest },
  ref
) {
  return (
    <a href={href} ref={ref} {...rest}>
      {children}
    </a>
  );
});

Link.displayName = 'Link';

export default Link;
