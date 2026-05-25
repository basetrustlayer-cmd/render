# Legacy Ledger and Settlement Model Removal

Status: ACTIVE
Date: 2026-05-25
Slice: v8-015-remove-legacy-ledger-settlement-models

## Decision

Render no longer owns escrow ledger or settlement authority.

The following Prisma models are legacy financial-authority surfaces and must be removed or converted into TrustLayer projection read models:

- EscrowLedgerEntry
- Settlement
- EscrowLedgerEntryType
- SettlementStatus

## Launch Rule

Render may display TrustLayer-provided SafeDeal projection state, but must not maintain a settlement ledger, payout ledger, or reconciliation ledger.

## Required Outcome

Render schema and routes must not depend on Render-owned settlement or escrow ledger relations.
