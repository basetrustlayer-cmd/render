# Render Final Launch Operations Runbook

Status: ACTIVE
Scope: Render marketplace launch operations

Boundary: Render owns marketplace UX, admin operations, projections, messaging, listings, and moderation. TrustLayer remains authoritative for escrow, settlement, payout, ledger, identity, TrustScore, and financial dispute execution.

## Pre-Launch Verification

Run:

    ./scripts/launch-smoke-checklist.sh

Pass criteria:
- API TypeScript passes.
- Web TypeScript passes.
- API contract suite passes.
- Working tree is clean.
- origin/main is up to date.

## Environment Verification

Confirm:

    docs/launch/render-env-launch-config-checklist.md

Required:
- DATABASE_URL
- JWT_SECRET
- JWT_REFRESH_SECRET
- TRUSTLAYER_API_KEY
- TRUSTLAYER_API_URL
- TRUSTLAYER_WEBHOOK_SECRET
- REDIS_URL
- NEXT_PUBLIC_API_URL
- NEXT_PUBLIC_CLOUDINARY_API_KEY

## Admin Smoke Checks

Verify:
- /admin
- /admin/audit-logs
- /admin/notifications-replay
- /admin/disputes
- /admin/disputes/:id
- /admin/listings
- /admin/reviews
- /admin/users

## Marketplace Smoke Checks

Verify:
- Listings browse/search
- Listing detail page
- Create listing flow
- Edit listing image upload
- Messaging route
- Seller storefront route
- SafeDeal dashboard projections
- SafeDeal dispute opening

## Boundary Guardrails

Render must not:
- execute escrow release
- execute buyer refund
- execute seller payout
- maintain settlement ledger authority
- compute authoritative TrustScore
- perform identity source-of-truth verification
- financially adjudicate disputes

Render may:
- display TrustLayer projections
- send TrustLayer commands
- store projection cache
- maintain admin moderation workflow
- create audit logs and operational risk signals

## Post-Launch Monitoring

Check:
- API health route
- Web route availability
- TrustLayer webhook processing
- Notification dead-letter queue
- Replay audit logs
- Sentry errors if configured
- Admin dispute screens
- Audit screens

## Rollback

If launch regression is found:
1. Stop new deployments.
2. Identify last known-good commit.
3. Revert or redeploy previous service version.
4. Re-run smoke checklist.
5. Record incident in launch operations notes.

## Launch Decision

Launch is clear only when:
- Smoke checklist passes.
- Env checklist is complete.
- Admin pages load.
- No Render-owned financial authority drift exists.
- TrustLayer projection paths function.
