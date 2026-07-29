---
title: Integration Guide Overview
product_area: technical
tags: [integration, webhook, oauth, sdk, technical]
---

# Integration Guide Overview

Partners integrate using REST APIs, official SDKs, and signed webhooks.

## Getting started
1. Create a sandbox application in the developer portal.
2. Generate an API key and store it in a secrets manager (never in source control).
3. Implement OAuth if the integration acts on behalf of end customers.
4. Subscribe to webhooks for `invoice.paid`, `invoice.failed`, and `account.updated`.

## Webhooks
- Endpoints must acknowledge with HTTP 200 within 5 seconds
- Verify the `X-Signature` header using the webhook signing secret
- Retry policy: up to 8 attempts with exponential backoff over 24 hours
- Disable and rotate secrets immediately if a URL is compromised

## Agent steps
1. Confirm whether the customer is in sandbox or production.
2. For missed webhooks, check delivery logs and endpoint TLS validity.
3. For OAuth consent errors, verify redirect URI exact match (including trailing slash).
4. Point developers to SDK docs for Node, Python, and Java; do not invent sample code.
5. Escalate signature validation failures that persist after secret rotation.

## Best practices
Use idempotency keys on create endpoints, log request IDs, and handle partial failure states when provisioning multi-step resources.
