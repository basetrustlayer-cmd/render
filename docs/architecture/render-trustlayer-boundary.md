# Render / TrustLayer Boundary

Status: Active  
Updated: May 2026

## Canonical Boundary

Render is the Ghana classifieds marketplace layer.

Render owns:
- listings
- search and discovery
- marketplace UX
- messaging
- seller storefronts
- moderation/admin views
- local projection/read-model state

TrustLayer owns:
- identity verification
- TrustScore
- escrow orchestration
- payment/settlement execution
- dispute execution authority
- fraud/risk infrastructure
- payout infrastructure

## SafeDeal Rule

Render may create SafeDeal intents through TrustLayer and cache TrustLayer state for marketplace UX.

Render must not:
- execute Paystack transfers
- expose active Paystack runtime integration
- execute settlement release commands
- own escrow orchestration
- act as the settlement engine

Settlement state in Render is projection-only and must be driven by TrustLayer webhook state.

## Regression Guards

The boundary is protected by:

- `apps/api/src/boundary/__tests__/render-trustlayer-boundary-contract.test.ts`
- TrustLayer-only webhook contract tests
- projection-only settlement queue naming
- removal of active Paystack runtime code

Historical migration references to Paystack may remain only inside old Prisma migration files.
