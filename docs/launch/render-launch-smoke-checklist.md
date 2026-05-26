# Render Launch Smoke Checklist

Status: ACTIVE
Scope: Final Render marketplace launch smoke validation.

## Required Commands

```bash
./scripts/launch-smoke-checklist.sh

## Pass Criteria

- API TypeScript passes.
- Web TypeScript passes.
- API contract suite passes.
- Render remains projection-only for SafeDeal/dispute financial workflows.
- TrustLayer remains authoritative for escrow, settlement, payout, ledger, identity, TrustScore, and financial dispute execution.

## Manual Smoke Checks

- Admin dashboard loads.
- Audit logs page loads and shows cursor metadata when available.
- Notification replay page loads.
- Dispute administration list loads.
- Dispute detail page supports moderator note/status workflow only.
- SafeDeal dashboard shows escrow/dispute projection freshness.
- Listing, messaging, and seller storefront routes remain available.
