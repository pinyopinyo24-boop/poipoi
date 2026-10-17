const app = require("./app.json");

module.exports = {
  ...app.expo,
  extra: {
    ...app.expo.extra,
    apiBaseUrl: process.env.EXPO_PUBLIC_API_URL || app.expo.extra.apiBaseUrl,
  },
};
