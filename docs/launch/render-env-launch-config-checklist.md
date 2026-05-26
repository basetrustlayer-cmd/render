# Render Environment Launch Config Checklist

Status: ACTIVE

## Required API Runtime Variables
- DATABASE_URL
- JWT_SECRET
- JWT_REFRESH_SECRET
- TRUSTLAYER_API_KEY
- TRUSTLAYER_API_URL
- TRUSTLAYER_WEBHOOK_SECRET
- REDIS_URL
- PORT
- HOST

## Required Web Runtime Variables
- NEXT_PUBLIC_API_URL
- NEXT_PUBLIC_CLOUDINARY_API_KEY

## Optional Observability
- SENTRY_DSN
- SENTRY_TRACES_SAMPLE_RATE
- SENTRY_RELEASE
- RENDER_GIT_COMMIT

## Pass Criteria
- `.env.example` documents all launch-critical API and web variables.
- Web has `NEXT_PUBLIC_API_URL`.
- Listing image upload flows have `NEXT_PUBLIC_CLOUDINARY_API_KEY`.
- Queue-backed operations have `REDIS_URL`.
- TrustLayer projection and webhook flows have API and webhook secrets.
