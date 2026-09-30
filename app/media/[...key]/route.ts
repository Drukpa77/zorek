import { getObject, storageConfigured } from "@/lib/storage";

// Serves media from the private bucket. Only processed files under media/ are
// reachable; keys are unique per upload, so responses are cached forever.

export const runtime = "nodejs";

const SAFE_SEGMENT = /^[\w.-]+$/;

export async function GET(request: Request, { params }: { params: Promise<{ key: string[] }> }) {
  const { key: segments } = await params;
  if (
    !storageConfigured() ||
    segments.length < 2 ||
    !segments.every((segment) => SAFE_SEGMENT.test(segment) && segment !== "." && segment !== "..")
  ) {
    return new Response("Not found", { status: 404 });
  }

  const key = ["media", ...segments].join("/");
  try {
    const object = await getObject(key);
    if (!object.Body) return new Response("Not found", { status: 404 });
    const etag = object.ETag ?? undefined;
    if (etag && request.headers.get("if-none-match") === etag) return new Response(null, { status: 304 });

    const headers = new Headers({
      "Content-Type": object.ContentType ?? "application/octet-stream",
      "Cache-Control": "public, max-age=31536000, immutable",
      "X-Content-Type-Options": "nosniff",
      "Content-Disposition": "inline",
      // PDFs render in the browser's viewer; forbid any script inside them.
      "Content-Security-Policy": "default-src 'none'; img-src 'self'; media-src 'self'; style-src 'unsafe-inline'; sandbox",
    });
    if (object.ContentLength) headers.set("Content-Length", String(object.ContentLength));
    if (etag) headers.set("ETag", etag);
    return new Response(object.Body.transformToWebStream(), { headers });
  } catch (error) {
    const status = (error as { $metadata?: { httpStatusCode?: number } }).$metadata?.httpStatusCode;
    if (status === 404 || (error as Error).name === "NoSuchKey") return new Response("Not found", { status: 404 });
    console.error("[media] Failed to serve", key, error);
    return new Response("Unavailable", { status: 502 });
  }
}
