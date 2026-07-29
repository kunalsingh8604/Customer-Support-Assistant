---
title: Login Issues
product_area: account
tags: [login, access, sso, session, account]
---

# Login Issues

Customers who cannot sign in usually hit one of: wrong credentials, locked account, SSO misconfiguration, or browser session problems.

## Quick checks
- Confirm email spelling and that the account exists in the admin directory
- Check whether the account is locked after repeated failed attempts
- Ask if the customer uses email/password or SSO (Google, Okta, Azure AD)
- Have them try an incognito window to rule out stale cookies

## Agent steps
1. Identify authentication method from the account profile.
2. If locked, unlock after verifying identity with account email and recent invoice or ticket ID.
3. For password users, send a password reset link rather than resetting manually.
4. For SSO failures, collect IdP error message and timestamp; check SAML/OIDC certificate expiry.
5. Clear stuck sessions by revoking active sessions from the security panel when the customer reports being logged into the wrong workspace.

## Escalation
Escalate SSO certificate or IdP mapping issues to the Identity engineering on-call.
