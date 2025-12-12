import fs from 'fs';
import path from 'path';
import type { ExpoConfig } from '@expo/config';

const ICON_BASE64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAusB9oWTBiwAAAAASUVORK5CYII=';
const ADAPTIVE_ICON_BASE64 = ICON_BASE64;

function ensureAsset(fileName: string, base64: string): string {
  const assetsDir = path.join(__dirname, 'assets');
  if (!fs.existsSync(assetsDir)) {
    fs.mkdirSync(assetsDir, { recursive: true });
  }

  const filePath = path.join(assetsDir, fileName);
  if (!fs.existsSync(filePath)) {
    fs.writeFileSync(filePath, Buffer.from(base64, 'base64'));
  }
  return filePath;
}

export default (): ExpoConfig => {
  const iconPath = ensureAsset('icon.png', ICON_BASE64);
  const adaptiveIconPath = ensureAsset('adaptive-icon.png', ADAPTIVE_ICON_BASE64);

  return {
    name: 'WhoIsWrong',
    slug: 'whoiswrong-mobile',
    scheme: 'whoiswrong',
    version: '1.0.0',
    orientation: 'portrait',
    icon: iconPath,
    splash: {
      resizeMode: 'contain',
      backgroundColor: '#0a0a0a',
    },
    assetBundlePatterns: ['**/*'],
    ios: {
      supportsTablet: false,
      bundleIdentifier: 'com.gwendal.whoswrong',
    },
    android: {
      package: 'com.gwendal.whoswrong',
      adaptiveIcon: {
        foregroundImage: adaptiveIconPath,
        backgroundColor: '#0a0a0a',
      },
    },
    extra: {
      eas: {
        projectId: '',
      },
    },
  };
};
