/**
 * Setup Page - Deprecated
 *
 * This route has been consolidated into /register.
 * Redirects to /register for unified registration flow.
 *
 * @deprecated Use /register instead
 */

import { redirect } from 'next/navigation';

export default function SetupPage() {
  // Redirect to unified registration flow
  redirect('/register');
}
