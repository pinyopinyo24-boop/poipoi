export const ENV = {
  // Local authentication configuration
  appId: "local-app", // Local app identifier (no Manus dependency)
  cookieSecret: process.env.JWT_SECRET ?? "local-secret-key",
  jwtSecret: process.env.JWT_SECRET ?? "local-secret-key",
  databaseUrl: process.env.DATABASE_URL ?? "",
  isProduction: process.env.NODE_ENV === "production",
};
