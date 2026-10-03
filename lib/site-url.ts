export function siteOrigin() {
  const configured = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "");
  const hosted = process.env.VERCEL === "1";
  if (hosted && (!configured || /localhost|127\.0\.0\.1/.test(configured))) {
    throw new Error("Set NEXT_PUBLIC_SITE_URL on the host to the public site origin, for example https://example.com.");
  }
  if (configured) return configured;
  if (process.env.NODE_ENV === "production") {
    throw new Error("Set NEXT_PUBLIC_SITE_URL to the public site origin, for example https://example.com.");
  }
  return "http://localhost:3000";
}
