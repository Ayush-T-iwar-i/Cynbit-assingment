# Cynbit Lead Form

An accessible, validated quote/lead form for Cynbit, with a Node + Express + MongoDB backend, an admin view, and dark/light mode.

## Problem

Audit of cynbit.in (Chrome DevTools) found 12 form fields without labels, 4 fields missing `autocomplete`,
a 404 on a hero image, a lazy image without dimensions, and 108 requests on first load.
The form is the main conversion path, so this prototype fixes it end to end.

## Features

- Labeled inputs, correct `autocomplete`, inline errors, `aria-live` status, 44px touch targets
- Server-side validation, honeypot spam trap, rate limiting, Helmet security headers
- MongoDB storage with Mongoose schema
- `/admin.html`: leads list with status updates, protected by an admin key
- Dark/light mode (follows system, remembers choice) and a header that hides on scroll down
- Respects `prefers-reduced-motion`

## Run locally

```bash
npm install
cp .env.example .env   # fill in MONGODB_URI and ADMIN_KEY
npm run dev
```

Open http://localhost:3000 and http://localhost:3000/admin.html

## Deploy (Render + MongoDB Atlas)

1. Create a free Atlas cluster, copy the connection string, allow access from anywhere (0.0.0.0/0).
2. Push to GitHub. On Render, create a Web Service from the repo: build `npm install`, start `npm start`.
3. Add env vars `MONGODB_URI` and `ADMIN_KEY`.

## Results (fill in after testing)

| Metric                      | Before (cynbit.in form) | After (this prototype) |
| --------------------------- | ----------------------- | ---------------------- |
| Lighthouse Accessibility    | _                       | _                      |
| Unlabeled fields            | 12                      | 0                      |
| Fields missing autocomplete | 4                       | 0                      |

## What I would do next

Email notification on new lead (Nodemailer), CSV export, Next.js integration into the real site, automated tests.

## Advanced features

- Streaming AI support chatbot (Claude API) with conversation logging
- AI lead triage: category, priority and one-line summary for every new lead
- Admin: token sign-in (8h expiry), search, filters, pagination, notes, CSV export, 7-day chart
- Email notification on new leads (Nodemailer, optional)
- Automated API tests: `npm tes`

# Cynbit Lead Form

An accessible, validated quote/lead form for Cynbit, with a Node + Express + MongoDB backend, an admin view, and dark/light mode.

## Problem

Audit of cynbit.in (Chrome DevTools) found 12 form fields without labels, 4 fields missing `autocomplete`,
a 404 on a hero image, a lazy image without dimensions, and 108 requests on first load.
The form is the main conversion path, so this prototype fixes it end to end.

## Features

- Labeled inputs, correct `autocomplete`, inline errors, `aria-live` status, 44px touch targets
- Server-side validation, honeypot spam trap, rate limiting, Helmet security headers
- MongoDB storage with Mongoose schema
- `/admin.html`: leads list with status updates, protected by an admin key
- Dark/light mode (follows system, remembers choice) and a header that hides on scroll down
- Respects `prefers-reduced-motion`

## Run locally

```bash
npm install
cp .env.example .env   # fill in MONGODB_URI and ADMIN_KEY
npm run dev
```

Open http://localhost:3000 and http://localhost:3000/admin.html

## Deploy (Render + MongoDB Atlas)

1. Create a free Atlas cluster, copy the connection string, allow access from anywhere (0.0.0.0/0).
2. Push to GitHub. On Render, create a Web Service from the repo: build `npm install`, start `npm start`.
3. Add env vars `MONGODB_URI` and `ADMIN_KEY`.

## Results (fill in after testing)

| Metric                      | Before (cynbit.in form) | After (this prototype) |
| --------------------------- | ----------------------- | ---------------------- |
| Lighthouse Accessibility    | _                       | _                      |
| Unlabeled fields            | 12                      | 0                      |
| Fields missing autocomplete | 4                       | 0                      |

## What I would do next

Email notification on new lead (Nodemailer), CSV export, Next.js integration into the real site, automated tests.
