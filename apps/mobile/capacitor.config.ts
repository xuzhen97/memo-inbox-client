import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "com.xuzhen97.memoInboxClient",
  appName: "记忆收件箱",
  webDir: "dist",
  bundledWebRuntime: false,
  server: {
    cleartext: true,
    androidScheme: "http"
  },
  plugins: {
    CapacitorHttp: {
      enabled: true
    }
  }
};

export default config;
