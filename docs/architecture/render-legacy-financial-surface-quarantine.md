# Render Legacy Financial Surface Quarantine

Status: ACTIVE
Date: 2026-05-25
Slice: v8-012-quarantine-legacy-financial-surfaces

## Decision

Render must not operate as a financial authority.

Existing ledger, settlement, and dispute models/routes are treated as legacy transitional surfaces until removed or converted into TrustLayer projection-only read models.

## Quarantined Surfaces

- EscrowLedgerEntry
- Settlement
- Dispute resolution state
- DisputeEvent adjudication state
- settlement.ts financial helpers
- SafeDeal ledger endpoint

## Allowed During Quarantine

Render may temporarily retain these surfaces only for:
- backward-compatible tests
- historical development continuity
- projection display
- migration planning
- non-authoritative audit context

## Forbidden

Render must not:
- execute payouts
- release funds
- compute settlement authority
- adjudicate disputes
- reconcile financial ledgers
- create new Render-owned financial authority features

## Required Follow-Up

A later extraction slice must either:
1. remove these models/routes, or
2. rename/reclassify them as TrustLayer projection read models.
