/**
 * Email Service
 *
 * Simple inline email sending for Phase 5.
 * Uses nodemailer with SMTP configuration from environment.
 *
 * Note: For production SaaS, consider moving to a job queue like Graphile Worker
 * or a transactional email service like Resend/SendGrid.
 *
 * @see /docs/planning/app-planning-phases.md Phase 5.2
 * @see /docs/adrs/012-background-jobs.md
 */

import { serverEnv } from './env';
import { createLogger } from './logger';

const logger = createLogger('email');

/**
 * Email options for sending
 */
export interface EmailOptions {
  to: string;
  subject: string;
  text?: string;
  html?: string;
}

/**
 * Escapes HTML special characters to prevent XSS attacks
 * Used for user-provided values in email templates
 *
 * @param str - The string to escape
 * @returns HTML-escaped string
 */
function htmlEscape(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/**
 * Validation for email header injection
 * Prevents CRLF injection attacks
 *
 * @param value - The value to validate
 * @returns true if safe, false if contains injection attempts
 */
function isSafeEmailValue(value: string): boolean {
  // Check for CRLF injection attempts
  return !value.includes('\r') && !value.includes('\n');
}

/**
 * Send an email using SMTP
 *
 * In development, logs email to console instead of sending.
 * In production, requires SMTP configuration in environment.
 *
 * @param options - Email options
 * @throws Error if SMTP not configured in production
 * @throws Error if email values contain header injection attempts
 */
export async function sendEmail(options: EmailOptions): Promise<void> {
  const { to, subject, text, html } = options;

  // Validate against header injection
  if (!isSafeEmailValue(to)) {
    throw new Error('Invalid email address: contains illegal characters');
  }

  if (!isSafeEmailValue(subject)) {
    throw new Error('Invalid email subject: contains illegal characters');
  }

  // In development, log to console
  if (serverEnv.NODE_ENV === 'development') {
    logger.info(
      {
        to,
        subject,
        hasText: !!text,
        hasHtml: !!html,
      },
      'Would send email (dev mode)'
    );
    return;
  }

  // In production, require SMTP configuration
  if (
    !serverEnv.SMTP_HOST ||
    !serverEnv.SMTP_PORT ||
    !serverEnv.SMTP_USER ||
    !serverEnv.SMTP_PASSWORD ||
    !serverEnv.SMTP_FROM
  ) {
    throw new Error(
      'SMTP not configured. Set SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASSWORD, and SMTP_FROM environment variables.'
    );
  }

  // Lazy load nodemailer only when actually sending
  const nodemailer = await import('nodemailer');

  // Create transporter
  const transporter = nodemailer.default.createTransport({
    host: serverEnv.SMTP_HOST,
    port: serverEnv.SMTP_PORT,
    secure: serverEnv.SMTP_PORT === 465, // true for 465, false for other ports
    auth: {
      user: serverEnv.SMTP_USER,
      pass: serverEnv.SMTP_PASSWORD,
    },
  });

  // Send email
  await transporter.sendMail({
    from: serverEnv.SMTP_FROM,
    to,
    subject,
    text,
    html,
  });

  logger.info({ to, subject }, 'Email sent successfully');
}

/**
 * Send invitation email
 *
 * @param to - Recipient email address
 * @param workspaceName - Name of the workspace they're invited to
 * @param inviterName - Name of the person who invited them
 * @param invitationUrl - Full URL to accept the invitation
 */
export async function sendInvitationEmail(
  to: string,
  workspaceName: string,
  inviterName: string,
  invitationUrl: string
): Promise<void> {
  const subject = `You've been invited to ${workspaceName}`;

  const text = `
${inviterName} has invited you to join the "${workspaceName}" workspace on Streamline Studio.

Click the link below to accept the invitation:
${invitationUrl}

This invitation will expire in 24 hours.

If you didn't expect this invitation, you can safely ignore this email.
  `.trim();

  // Escape user-provided values to prevent XSS
  const escapedInviterName = htmlEscape(inviterName);
  const escapedWorkspaceName = htmlEscape(workspaceName);

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      line-height: 1.6;
      color: #333;
      max-width: 600px;
      margin: 0 auto;
      padding: 20px;
    }
    .button {
      display: inline-block;
      background-color: #4F46E5;
      color: white;
      padding: 12px 24px;
      text-decoration: none;
      border-radius: 6px;
      margin: 20px 0;
    }
    .footer {
      margin-top: 40px;
      padding-top: 20px;
      border-top: 1px solid #e5e7eb;
      font-size: 14px;
      color: #6b7280;
    }
  </style>
</head>
<body>
  <h1>You've been invited!</h1>
  <p><strong>${escapedInviterName}</strong> has invited you to join the <strong>${escapedWorkspaceName}</strong> workspace on Streamline Studio.</p>
  <p>
    <a href="${invitationUrl}" class="button">Accept Invitation</a>
  </p>
  <p>Or copy and paste this URL into your browser:</p>
  <p style="word-break: break-all; color: #6b7280;">${invitationUrl}</p>
  <div class="footer">
    <p>This invitation will expire in 24 hours.</p>
    <p>If you didn't expect this invitation, you can safely ignore this email.</p>
  </div>
</body>
</html>
  `.trim();

  await sendEmail({ to, subject, text, html });
}
