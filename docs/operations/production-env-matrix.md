# Render Production Environment Matrix

## Purpose

This matrix defines the production environment variables required to launch the Render marketplace across API, worker, and web services.

Render is the marketplace layer. TrustLayer remains the independent trust infrastructure service.

## Launch-Critical Minimum

API must have:

- DATABASE_URL
- REDIS_URL
- JWT_SECRET
- TRUSTLAYER_API_KEY
- TRUSTLAYER_API_URL
- PUBLIC_APP_URL
- TRUSTLAYER_WEBHOOK_SECRET
- NODE_ENV=production
- PORT

Worker must have:

- DATABASE_URL
- REDIS_URL
- NODE_ENV=production

Web must have:

- NEXT_PUBLIC_API_URL
- NEXT_PUBLIC_CLOUDINARY_API_KEY
- NODE_ENV=production

## Redis Launch Note

BullMQ recommends Redis eviction policy `noeviction`. If the current Redis provider uses `volatile-lru`, it is acceptable only for beta certification. Upgrade or reconfigure before meaningful production volume.

## Credential Handling

Never commit real secrets. Use platform environment variables or secret managers.
