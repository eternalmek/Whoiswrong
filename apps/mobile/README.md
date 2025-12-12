# WhoIsWrong Mobile (Expo)

This directory contains the Expo-powered mobile client for WhoIsWrong. The app uses the same Supabase backend as the web experience and is configured for Expo Router and EAS builds.

## Getting started

1. Install dependencies:

```bash
cd apps/mobile
npm install
```

2. Create a `.env` file based on `.env.example` and provide the Supabase URL and anon key.

3. Run the app locally:

```bash
npm run start
```

Use the Expo Go app or an emulator to load the development server.

## Authentication

- Email/password login and signup are powered by Supabase.
- Sessions are persisted using Expo Secure Store so users stay signed in between launches.

## Building with EAS

An `eas.json` file is included with a production profile. Update `extra.eas.projectId` inside `app.config.ts` with your EAS project ID before running cloud builds.
