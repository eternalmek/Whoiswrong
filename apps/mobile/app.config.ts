import type { ExpoConfig } from 'expo/config';

const config: ExpoConfig = {
  name: 'Whoiswrong',
  slug: 'whoiswrong',
  scheme: 'whoiswrong',
  version: '1.0.0',
  orientation: 'portrait',
  platforms: ['ios', 'android'],
  owner: 'gwendalpirious-organization',
  ios: {
    bundleIdentifier: 'com.whoiswrong.app',
  },
  android: {
    package: 'com.whoiswrong.app',
  },
  cli: {
    appVersionSource: 'remote',
  },
  extra: {
    eas: {
      projectId: 'bae50967-da38-424a-ba03-98ee2814e3d7',
    },
    supabaseUrl: process.env.EXPO_PUBLIC_SUPABASE_URL,
    supabaseAnonKey: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY,
  },
  experiments: {
    typedRoutes: true,
  },
};

export default config;
