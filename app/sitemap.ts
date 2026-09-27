import type { MetadataRoute } from "next";
import { siteOrigin } from "@/lib/site-url";

const paths = [
  "/",
  "/work",
  "/services/custom-software",
  "/about",
  "/insights",
  "/industries",
  "/contact",
  "/privacy",
  "/terms",
  "/accessibility",
];

export default function sitemap(): MetadataRoute.Sitemap {
  const origin = siteOrigin();
  const lastModified = new Date("2026-09-27");
  return paths.map((path) => ({
    url: path === "/" ? `${origin}/` : `${origin}${path}`,
    lastModified,
  }));
}
