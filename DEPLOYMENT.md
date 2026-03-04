# FutureMart Deployment Guide

## 1. Recommended low-cost setup

### Option A (easy + cheap/free)
1. Backend API: Render Web Service
2. Frontend: Render Static Site or Cloudflare Pages
3. Database: Managed MySQL (Aiven free tier, Railway MySQL, or any MySQL host)

### Option B (best frontend free tier)
1. Frontend: Cloudflare Pages
2. Backend: Render Web Service
3. Database: Managed MySQL

This repo is already prepared for both.

---

## 2. Files added for deployment

1. [render.yaml](./render.yaml): Render blueprint for backend + static frontend
2. [frontend/public/_redirects](./frontend/public/_redirects): SPA route fallback
3. [backend/.env.production.example](./backend/.env.production.example): production backend env template
4. [frontend/.env.production.example](./frontend/.env.production.example): production frontend env template
5. [package.json](./package.json): `check:deploy` validation script

---

## 3. Backend environment variables (required)

Copy [backend/.env.production.example](./backend/.env.production.example) values into your hosting dashboard:

1. `DB_HOST`, `DB_USER`, `DB_PASSWORD`, `DB_NAME`
2. `JWT_SECRET` (strong random secret)
3. `CORS_ORIGIN` (your frontend URL)
4. `COOKIE_SECURE=true`
5. `COOKIE_SAME_SITE=none` (for separate frontend/backend domains)
6. OTP email vars:
   1. `EMAIL_PROVIDER=resend` or `EMAIL_PROVIDER=brevo`
   2. `EMAIL_FROM`
   3. `RESEND_API_KEY` or `BREVO_API_KEY`

Notes:
1. `EMAIL_PROVIDER=console` is for development only.
2. If frontend/backend are on the same domain/subdomain strategy, you can tune cookie settings differently.

---

## 4. Frontend environment variables (required)

Set:
1. `VITE_API_BASE_URL=https://<your-backend-domain>`

Use [frontend/.env.production.example](./frontend/.env.production.example) as template.

---

## 5. Database setup

Run [backend/database/schema.sql](./backend/database/schema.sql) once on your production MySQL database.

This includes:
1. core commerce tables
2. account/profile tables
3. OTP verification table (`auth_email_otps`)

The API also creates OTP/profile/order-checkout tables at runtime if missing.

---

## 6. Render deployment (Blueprint)

1. Push this repository to GitHub.
2. In Render: `New` -> `Blueprint`.
3. Select this repo (Render reads [render.yaml](./render.yaml)).
4. Fill all `sync: false` env vars in Render dashboard.
5. Deploy both services.
6. Set:
   1. Frontend `VITE_API_BASE_URL` to backend public URL
   2. Backend `CORS_ORIGIN` to frontend public URL

---

## 7. Cloudflare Pages deployment (frontend only)

If using Cloudflare Pages instead of Render static:

1. Build command: `npm install && npm run build`
2. Build output: `dist`
3. Root directory: `frontend`
4. Environment variable:
   1. `VITE_API_BASE_URL=https://<your-backend-domain>`

Then update backend:
1. `CORS_ORIGIN=https://<your-cloudflare-domain>`

---

## 8. Health checks

Backend health endpoint:
1. `GET /api/health`

Use this for uptime monitors and platform health checks.

---

## 9. Pre-deploy validation

From repo root:

```bash
npm run check:deploy
```

This runs:
1. backend tests
2. frontend production build

---

## 10. Post-deploy smoke test checklist

1. Register account -> email OTP received -> verify works
2. Forgot password -> reset OTP received -> password reset works
3. Login/logout works from desktop and mobile
4. Account page loads profile + purchase history
5. Checkout places order and appears in account history
6. Cart/wishlist counts are user-unique after account switch
