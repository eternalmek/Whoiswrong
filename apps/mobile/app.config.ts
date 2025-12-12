import type { ExpoConfig } from 'expo/config';

const config: ExpoConfig = {
  name: 'WhoIsWrong Mobile',
  slug: 'whoiswrong-mobile',
  scheme: 'whoiswrong',
  version: '1.0.0',
  orientation: 'portrait',
  platforms: ['ios', 'android'],
  ios: {
    bundleIdentifier: 'io.whoiswrong.app',
  },
  extra: {
    eas: {
      projectId: 'REPLACE_WITH_EAS_PROJECT_ID',
    },
    supabaseUrl: process.env.EXPO_PUBLIC_SUPABASE_URL,
    supabaseAnonKey: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY,
  },
  experiments: {
    typedRoutes: true,
  },
};

export default config;
