# WhoIsWrong Mobile App

This folder contains the Expo (React Native) mobile application for WhoIsWrong. It reuses the existing production backend endpoints and does not modify or depend on the web app implementation. The website in `/public` continues to build and deploy as before.

## Getting Started locally

```bash
# from the repository root
npm install
npm --workspace apps/mobile start
```

Copy `.env.example` to `.env` inside `apps/mobile` to override the default production API base or to add Supabase credentials.

## Building with EAS

```bash
# from the repository root
eas build -p ios --profile production
```

The root `eas.json` points the CLI at `apps/mobile`, so you can trigger builds from the monorepo root without hitting the "Failed to read \"/eas.json\"" error. The Expo config uses the bundle identifier `com.gwendal.whoswrong` so it matches EAS submissions. Icons are generated at build time from a tiny inline base64 image, so no binary assets live in Git. When using Expo's "Build from GitHub" UI, set the base directory to `apps/mobile` and pick the desired build profile.
