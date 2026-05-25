# SafeDeal Ledger Endpoint Quarantine

Status: ACTIVE
Date: 2026-05-25
Slice: v8-013-quarantine-safedeal-ledger-endpoint

## Decision

`GET /safe-deals/:id/ledger` is not a Render launch feature.

It is a legacy transitional endpoint and must not be presented as financial ledger authority.

## Rule

Render may show SafeDeal marketplace state and TrustLayer projection state.

Render must not expose or imply authoritative:
- financial ledger balances
- settlement accounting
- payout readiness
- escrow release authority
- reconciliation authority

## Required Follow-Up

Before launch, this endpoint must be either:
1. removed, or
2. renamed/reclassified as a TrustLayer projection-only audit view.
