# Render Event Contract Registry

## Canonical Envelope

Every Render ecosystem event must use this envelope:

- id
- type
- version
- aggregateId
- correlationId
- causationId
- source
- payload
- metadata
- occurredAt

## Boundary Rule

Render events are projection and operational events only.

Render must not use events to become the authority for:

- escrow lifecycle
- settlement decisions
- payout execution
- dispute resolution outcome
- TrustScore computation
- fraud decisioning

TrustLayer remains the authoritative source for financial, trust, dispute, escrow, and payout state.

## Versioning Rule

Event type changes must be additive under the same version.

Breaking payload changes require a new version.

Consumers must tolerate unknown metadata fields.
