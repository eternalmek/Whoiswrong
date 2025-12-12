# WhoIsWrong Mobile App

This folder contains the standalone Expo (React Native) mobile application for WhoIsWrong. It reuses the existing production backend endpoints and does not modify or depend on the web app implementation. Changes here do not affect the website build or deployment.

## Getting Started

```bash
cd mobile-app
npm install
npx expo start --tunnel
```

## Environment Variables

Copy `.env.example` to `.env` and update the values as needed for your Supabase project.

## Building and Submitting (iOS)

```bash
cd mobile-app
eas build -p ios
eas submit -p ios
```

The app is configured with the bundle identifier `io.whoiswrong.app` for App Store submission via Expo EAS.
