import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.riftboundsigils.game',
  appName: 'Riftbound Sigils',
  webDir: 'dist',
  android: {
    allowMixedContent: true,
  },
};

export default config;
