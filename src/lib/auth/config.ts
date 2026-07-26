function required(name: string): string {
  const val = process.env[name];
  if (!val) throw new Error(`Missing env var: ${name}`);
  return val;
}

export const authConfig = {
  jwtSecret: required("AUTH_JWT_SECRET"),
  jwtExpiry: Number(process.env.AUTH_JWT_EXPIRY ?? 3600),
  refreshExpiry: Number(process.env.AUTH_REFRESH_EXPIRY ?? 60 * 60 * 24 * 30),
  resetTokenExpiry: Number(process.env.AUTH_RESET_TOKEN_EXPIRY ?? 3600),
  confirmTokenExpiry: Number(process.env.AUTH_CONFIRM_TOKEN_EXPIRY ?? 86400),
  sessionCookie: process.env.AUTH_SESSION_COOKIE ?? "session",
  refreshCookie: process.env.AUTH_REFRESH_COOKIE ?? "refresh_token",
  secureCookies: process.env.NODE_ENV === "production",
};
