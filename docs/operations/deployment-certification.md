# Render Deployment Certification

## Current Launch Topology

Render marketplace may temporarily use managed hosting during launch certification.

## Target Production Topology

The final application will be deployed under the render.com.gh production stack.

## Critical Worker Requirement

The Render worker must run as a persistent Node.js process.

Do not run BullMQ worker processing as a Vercel serverless function.

Required worker commands:

    pnpm worker:build
    pnpm worker:start

## Required Services

- Frontend deployment
- API deployment
- Persistent worker deployment
- Neon PostgreSQL
- Redis Cloud
- Cloudinary
- TrustLayer API access

## API Required Environment

- DATABASE_URL
- REDIS_URL
- JWT_SECRET
- TRUSTLAYER_API_KEY
- TRUSTLAYER_API_URL
- TRUSTLAYER_WEBHOOK_SECRET
- PUBLIC_APP_URL
- NODE_ENV=production

## Worker Required Environment

- DATABASE_URL
- REDIS_URL
- NODE_ENV=production

## Web Required Environment

- NEXT_PUBLIC_API_URL
- NEXT_PUBLIC_CLOUDINARY_API_KEY
- NODE_ENV=production

## Certification Evidence Required

- API deploy builds successfully.
- API startup passes launch env validation.
- Worker emits worker_ready.
- Redis returns PONG.
- Neon connection works.
- Frontend can call API.
- Listing image upload works.
- TrustLayer status endpoint returns configured.
- Redis eviction policy is reviewed before production traffic.
