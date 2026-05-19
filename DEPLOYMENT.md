# Render.com.gh Staging Deployment

## Architecture

- Frontend: Vercel
- Backend: Railway
- Database: Neon PostgreSQL
- Source Control: GitHub

## Frontend Deployment (Vercel)

1. Connect the GitHub repository to Vercel.
2. Set the root directory to `apps/web`.
3. Use:
   - Install Command: `pnpm install --ignore-scripts`
   - Build Command: `pnpm build:next`
4. Add environment variable:
   - `NEXT_PUBLIC_API_URL=https://api-staging.render.com.gh`

## Backend Deployment (Railway)

1. Connect the GitHub repository to Railway.
2. Set the root directory to `apps/api`.
3. Use:
   - Build Command: `pnpm build`
   - Start Command: `pnpm start`
4. Add environment variables:
   - `DATABASE_URL`
   - `JWT_SECRET`
   - `TRUSTLAYER_API_KEY`
   - Notification provider credentials

## Suggested Staging Domains

- Frontend: `staging.render.com.gh`
- API: `api-staging.render.com.gh`

## Verification Checklist

- Homepage loads
- Listings page loads
- Listing detail page loads
- Login page loads
- Verification page loads
- Messaging page loads
- API health endpoint responds
- Database connection succeeds
- Environment variables are present

## Production Promotion

Once staging is stable:
1. Point production domains.
2. Copy production environment variables.
3. Enable monitoring and alerts.
4. Launch beta.
