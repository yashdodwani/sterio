/** Shared cookie configuration for Crossmint session cookies. */
export const SESSION_COOKIE_OPTS = {
  httpOnly: true,
  path: "/",
  sameSite: "Lax" as const,
}

export const COOKIE_NAMES = {
  jwt: "crossmint-jwt",
  refreshToken: "crossmint-refresh-token",
  email: "crossmint-email",
} as const
