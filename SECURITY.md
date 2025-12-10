# Security Policy

## Overview

Streamline Studio takes security seriously. This document outlines our security policies, vulnerability reporting procedures, and the security measures we have in place to protect your data.

## Supported Versions

We provide security updates for the following versions:

| Version | Supported          |
| ------- | ------------------ |
| 0.1.x   | :white_check_mark: |

As we are currently in active development (pre-1.0), we focus security updates on the latest release.

## Reporting a Vulnerability

We appreciate responsible disclosure of security vulnerabilities. If you discover a security issue, please report it privately rather than publicly disclosing it.

### How to Report

**DO NOT** create a public GitHub issue for security vulnerabilities.

Instead, please email security-related issues to:

**Security Contact**: [Add your security contact email here]

### What to Include

Please provide the following information in your report:

- Description of the vulnerability
- Steps to reproduce the issue
- Potential impact assessment
- Any suggested fixes (optional)
- Your contact information for follow-up

### Response Timeline

We are committed to responding quickly to security reports:

- **Initial Response**: Within 48 hours of receiving your report
- **Status Update**: Within 5 business days with our assessment
- **Resolution**: Varies based on severity and complexity
  - Critical: Within 7 days
  - High: Within 14 days
  - Medium: Within 30 days
  - Low: Next planned release

### Disclosure Policy

We follow coordinated vulnerability disclosure:

1. You report the vulnerability privately
2. We acknowledge and investigate
3. We develop and test a fix
4. We release a security update
5. After the fix is released, we publicly disclose the vulnerability (with your credit, if desired)

Please allow us time to address the issue before any public disclosure.

## Security Architecture

Streamline Studio implements a defense-in-depth security architecture. For complete details, see [ADR-014: Comprehensive Security Architecture](./docs/adrs/014-security-architecture.md).

### Key Security Features

#### Authentication & Authorization

- **Password Security**: Argon2id hashing with secure parameters
- **Session Management**: HTTP-only, Secure, SameSite cookies
- **Password Policy**: Minimum 8 characters, common password blocking
- **Multi-Tenancy Isolation**: Workspace-scoped data access with WorkspaceRepository pattern

#### Attack Prevention

- **Rate Limiting**: Redis-backed rate limiting for authentication endpoints
- **CSRF Protection**: Origin header verification for state-changing requests
- **XSS Protection**: DOMPurify sanitization for user-generated content
- **SQL Injection**: Drizzle ORM with parameterized queries
- **Security Headers**: CSP, HSTS, X-Frame-Options configured

#### Infrastructure Security

- **Setup Wizard Protection**: File-based flag prevents database reinitialization
- **Docker Hardening**: Non-root user, minimal image, read-only filesystem
- **Environment Validation**: Strict environment variable validation with Zod
- **Secrets Management**: Environment-based configuration, no hardcoded secrets

### Security Testing

We maintain comprehensive security testing:

- **Unit Tests**: Authentication, authorization, input validation
- **Integration Tests**: Multi-tenant isolation, workspace scoping
- **E2E Tests**: Authentication flows, authorization checks
- **Security Linting**: ESLint security rules, dependency scanning

**Current Test Coverage**: 60% (target: 80% per ADR-005)

### Known Limitations

As a self-hosted application, security also depends on proper deployment:

- **Database Security**: Secure your PostgreSQL instance (use strong passwords, limit network access)
- **Redis Security**: Secure your Redis instance (use authentication, limit network access)
- **HTTPS**: Always deploy behind HTTPS (use Let's Encrypt, Cloudflare, or similar)
- **Environment Variables**: Protect your `.env` file (never commit to version control)
- **Updates**: Keep Streamline Studio and dependencies up to date
- **Backups**: Implement regular database backups with encryption

## Security Best Practices for Self-Hosting

### Production Deployment Checklist

- [ ] Use strong, unique `SESSION_SECRET` (minimum 32 characters)
- [ ] Set `NODE_ENV=production`
- [ ] Enable HTTPS (TLS 1.2+)
- [ ] Configure firewall rules (limit PostgreSQL and Redis access)
- [ ] Use strong database passwords
- [ ] Enable database encryption at rest
- [ ] Set up automated backups
- [ ] Configure log monitoring and alerting
- [ ] Keep Docker images and dependencies updated
- [ ] Review and configure CSP headers for your domain
- [ ] Enable Redis authentication (requirepass)

### Environment Variable Security

Critical environment variables that must be secured:

- `DATABASE_URL`: PostgreSQL connection string
- `SESSION_SECRET`: Session encryption key
- `REDIS_URL`: Redis connection string (if using Redis mode)

**Never** commit these to version control. Use:

- Docker secrets
- Environment variable injection
- Secure key management services

## Security Audit History

| Date       | Type        | Auditor       | Status   |
| ---------- | ----------- | ------------- | -------- |
| 2025-12-10 | Code Review | Internal Team | Complete |

## Compliance

We design Streamline Studio with common security frameworks in mind:

- **OWASP Top 10**: Mitigations implemented for common web vulnerabilities
- **CWE Top 25**: Awareness of common software weaknesses
- **NIST Cybersecurity Framework**: Defense-in-depth approach

While Streamline Studio is designed with security best practices, formal compliance certification (SOC 2, ISO 27001, etc.) is the responsibility of individual deployers.

## Security Resources

### Internal Documentation

- [ADR-014: Comprehensive Security Architecture](./docs/adrs/014-security-architecture.md)
- [ADR-007: API and Authentication](./docs/adrs/007-api-and-auth.md)
- [ADR-008: Multi-Tenancy Strategy](./docs/adrs/008-multi-tenancy-strategy.md)

### External References

- [OWASP Top 10](https://owasp.org/Top10/)
- [Node.js Security Best Practices](https://nodejs.org/en/docs/guides/security/)
- [Docker Security](https://docs.docker.com/engine/security/)

## Updates to This Policy

This security policy may be updated as Streamline Studio evolves. Check back regularly for updates. Major changes will be announced in release notes.

**Last Updated**: December 10, 2025

## Questions?

If you have questions about our security practices that aren't related to vulnerability reporting, please open a GitHub Discussion or contact the maintainers.

---

**Thank you for helping keep Streamline Studio secure!**
