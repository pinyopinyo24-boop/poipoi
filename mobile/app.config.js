const app = require("./app.json");

module.exports = {
  ...app.expo,
  newArchEnabled: true,
  plugins: [...(app.expo.plugins || []), ["expo-build-properties", { android: { newArchEnabled: true } }]],
  extra: {
    ...app.expo.extra,
    eas: {
      ...app.expo.extra?.eas,
      projectId: "3d840495-8cd2-4f5f-8965-1f7c28a34401",
    },
    apiBaseUrl: app.expo.extra.apiBaseUrl,
  },
};
