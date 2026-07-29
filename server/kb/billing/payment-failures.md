---
title: Payment Failures Troubleshooting
product_area: billing
tags: [payment, failed-charge, card, retry, billing]
---

# Payment Failures Troubleshooting

When a customer's payment fails, first confirm the decline reason returned by the payment processor (insufficient funds, expired card, fraud filter, or bank decline).

## Common causes
- Expired or incorrect card details
- Insufficient funds or bank-side blocks
- 3-D Secure / SCA authentication not completed
- Duplicate charge protection rejecting a retry too quickly

## Agent steps
1. Ask the customer for the approximate charge time and last four digits of the card.
2. Check the billing dashboard for the processor decline code.
3. If the card is expired, guide the customer to update payment method under Account → Billing.
4. For insufficient funds, advise retrying after funds are available; do not manually force multiple retries.
5. If fraud filters triggered, escalate to billing ops with the transaction ID.

## Escalation
Escalate to Billing Ops when the same payment fails three times with different decline codes, or when a business customer reports payroll-impacting outages.
