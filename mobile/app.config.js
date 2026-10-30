const app = require("./app.json");

module.exports = {
  ...app.expo,
  icon: "./assets/poipoi-ai-icon.png",
  newArchEnabled: true,
  updates: {
    ...app.expo.updates,
    url: "https://u.expo.dev/3d840495-8cd2-4f5f-8965-1f7c28a34401",
  },
  runtimeVersion: {
    policy: "appVersion",
  },
  plugins: [...(app.expo.plugins || []), ["expo-build-properties", { android: { usesCleartextTraffic: true, newArchEnabled: true } }]],
  extra: {
    ...app.expo.extra,
    eas: {
      ...app.expo.extra?.eas,
      projectId: "3d840495-8cd2-4f5f-8965-1f7c28a34401",
    },
    apiBaseUrl: process.env.EXPO_PUBLIC_API_URL?.trim() || app.expo.extra.apiBaseUrl || '',
  },
};
