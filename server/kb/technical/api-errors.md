---
title: API Errors Reference
product_area: technical
tags: [api, errors, http, rate-limit, technical]
---

# API Errors Reference

This guide helps agents interpret common API error responses reported by developers and integration partners.

## Status codes
- `400 Bad Request` — malformed JSON, missing required fields, or invalid enum values
- `401 Unauthorized` — missing/invalid API key or expired OAuth token
- `403 Forbidden` — key lacks scope for the endpoint
- `404 Not Found` — resource ID does not exist or belongs to another tenant
- `409 Conflict` — duplicate idempotency key with a different payload
- `429 Too Many Requests` — rate limit exceeded; check `Retry-After`
- `500/502/503` — platform-side issue; collect request ID for engineering

## Agent steps
1. Ask for the full error JSON body, HTTP status, request ID, and approximate timestamp (UTC).
2. Confirm environment (sandbox vs production) and API version header.
3. For 401/403, verify key status and scopes in the developer portal.
4. For 429, advise exponential backoff and review plan rate limits.
5. For 5xx with a request ID, open an engineering ticket and avoid promising an ETA.

## Notes
Idempotency keys are required for payment and provisioning endpoints. Reusing a key with a changed body returns `409`.
