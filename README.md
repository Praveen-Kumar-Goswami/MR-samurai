# RONIN — The Path Never Ends

A cinematic interactive Samurai experience built with React, Vite, GSAP,
Lenis, Canvas 2D, and native video.

## Run locally

Requires Node.js 22.13 or newer.

```bash
npm ci
npm run dev
```

Use `npm run lint`, `npm run build`, and `npm test` to validate the project.

## Deploy with AWS Amplify

1. Push this folder to a GitHub repository.
2. In AWS Amplify Hosting, choose **New app → Host web app**.
3. Connect the repository and branch.
4. Amplify will read `amplify.yml`; accept the detected settings and deploy.

The site is a static Vite build, so it needs no server, database, environment
variables, or platform adapter.
