---
title: Password Reset Guide
product_area: account
tags: [password, reset, email, security, account]
---

# Password Reset Guide

Password resets are self-serve. Agents should guide customers through the flow and only intervene when email delivery fails.

## Standard flow
1. Customer opens Sign in → Forgot password.
2. They enter the account email and request a reset link.
3. The link expires after 60 minutes and can be used once.
4. New passwords must be at least 12 characters and not match the last three passwords.

## Agent steps
1. Confirm the email on file matches the address receiving mail.
2. Check spam/junk and that corporate filters are not blocking `noreply@`.
3. If no email arrives within 10 minutes, resend from the admin console (max 3 resends per hour).
4. Never ask the customer to share their new password.
5. After a successful reset, recommend reviewing active sessions and enabling MFA.

## Security notes
If the customer did not request a reset but received an email, advise ignoring the link and checking account activity. Escalate suspected account takeover to Security.
