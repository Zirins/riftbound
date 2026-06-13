import type { CapacitorConfig } from '@capacitor/cli';
import { APP } from './src/constants/gameConfig';

/** Capacitor shell config — version tracked via APP.VERSION in gameConfig.ts (1.1.0). */
const config: CapacitorConfig = {
  appId: APP.ID,
  appName: APP.NAME,
  webDir: APP.WEB_DIR,
  android: {
    allowMixedContent: true,
  },
};

export default config;
export { APP };
