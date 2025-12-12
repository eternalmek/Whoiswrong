# WhoisWrong Mobile App

This is the official iOS mobile app for WhoisWrong.io, built with React Native and Expo.

## 🎯 Features

- **Celebrity Judges**: Choose from AI-powered versions of celebrities, intellectuals, and cultural icons
- **Instant Verdicts**: Get quick, witty AI judgments on any debate
- **Community Feed**: Browse and vote on public debates from around the world
- **Onboarding Flow**: Smooth introduction to the app's features
- **Real-time Sync**: Connected to the same Supabase backend as whoiswrong.io

## 📱 Requirements

- Node.js 18 or higher
- Expo CLI
- iOS Simulator (for local development) or EAS Build account (for cloud builds)

## 🚀 Getting Started

### Install Dependencies

```bash
npm install
```

### Set Up Environment Variables

The `.env` file is already configured with the production Supabase credentials:

```
EXPO_PUBLIC_SUPABASE_URL=https://fhezhjqfgnuyfosoippg.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### Run the App Locally

```bash
# Start the Expo development server
npm start

# Run on iOS Simulator
npm run ios

# Run on Android Emulator
npm run android
```

## 🏗️ Building for iOS (EAS Build)

This app is configured to build with Expo Application Services (EAS) in the cloud.

### Prerequisites

1. Install EAS CLI:
```bash
npm install -g eas-cli
```

2. Login to your Expo account:
```bash
eas login
```

### Build for iOS

```bash
# Build for iOS App Store
eas build --platform ios --profile production

# Build for iOS Simulator
eas build --platform ios --profile development

# Build for TestFlight (internal testing)
eas build --platform ios --profile preview
```

## 📦 Project Structure

```
mobile/
├── App.tsx                 # Main app entry point
├── app.json               # Expo configuration
├── eas.json               # EAS Build configuration
├── metro.config.js        # Metro bundler config
├── package.json           # Dependencies
├── tsconfig.json          # TypeScript config
├── assets/                # App icons and splash screens
│   ├── icon.png          # App icon (1024x1024)
│   ├── adaptive-icon.png # Android adaptive icon
│   ├── splash.png        # Splash screen
│   └── favicon.png       # Web favicon
└── src/
    ├── api/              # API service layer
    │   ├── judges.ts    # Judges API
    │   ├── verdict.ts   # Verdict submission
    │   └── debates.ts   # Debates feed
    ├── components/       # Reusable UI components
    ├── lib/             # Utility libraries
    │   └── supabase.ts  # Supabase client
    ├── navigation/      # Navigation setup
    │   └── AppNavigator.tsx
    ├── screens/         # App screens
    │   ├── WelcomeScreen.tsx
    │   ├── OnboardingScreen.tsx
    │   ├── HomeScreen.tsx
    │   ├── FeedScreen.tsx
    │   └── ProfileScreen.tsx
    └── types/           # TypeScript types
        └── index.ts
```

## 🔧 Configuration

### Bundle Identifier

- iOS: `com.whoiswrong.app`
- Android: `com.whoiswrong.app`

### Supabase Integration

The app connects to the same Supabase database as the web app, with tables:
- `judges` - Celebrity judge profiles
- `debates` - User debates and verdicts
- `votes` - Community voting
- `comments` - Debate comments

### API Endpoints

The app uses the following backend endpoints from whoiswrong.io:
- `GET /api/judges` - Fetch all judges
- `POST /api/judge` - Submit verdict request

## 🎨 Design System

### Colors
- Primary: `#0f172a` (Slate 900)
- Secondary: `#64748b` (Slate 500)
- Background: `#f8fafc` (Slate 50)
- Surface: `#ffffff` (White)
- Border: `#e2e8f0` (Slate 200)

### Typography
- Headings: System Bold (700)
- Body: System Regular (400)
- Labels: System Semibold (600)

## 📝 License

MIT License - Same as the main WhoisWrong.io project

## 🔗 Related Links

- Website: https://whoiswrong.io
- GitHub: https://github.com/eternalmek/Whoiswrong

## 📱 App Store Submission

Before submitting to the App Store:

1. Update version in `app.json`
2. Build with production profile: `eas build --platform ios --profile production`
3. Test the build thoroughly
4. Submit via App Store Connect

## 🐛 Troubleshooting

### Common Issues

**Metro bundler issues:**
```bash
npx expo start --clear
```

**iOS build fails:**
- Check that bundle identifier matches in `app.json`
- Verify provisioning profiles in EAS

**Supabase connection errors:**
- Verify `.env` file exists and has correct values
- Check network connectivity

## 🤝 Contributing

This mobile app mirrors the functionality of the web app. When making changes:
1. Test on both iOS and Android
2. Ensure API compatibility with the backend
3. Follow the existing code style
4. Update documentation

## 📞 Support

For issues or questions, please open an issue on GitHub or contact support@whoiswrong.io
