import { draftMode } from "next/headers";
import { NextResponse } from "next/server";
import { auth } from "@/auth";

// Preview unpublished content: signed-in staff only, and only content paths,
// so this can't be used as an open redirect. ?exit=1 turns preview off.

const PREVIEWABLE = /^\/(work|insights|services|industries)\/[a-z0-9-]+$/;

export async function GET(request: Request) {
  const url = new URL(request.url);
  const path = url.searchParams.get("path") ?? "/";
  const safePath = PREVIEWABLE.test(path) ? path : "/";
  const mode = await draftMode();

  if (url.searchParams.get("exit") === "1") {
    mode.disable();
    return NextResponse.redirect(new URL(safePath, url.origin));
  }

  const session = await auth();
  if (!session?.user?.role) return NextResponse.redirect(new URL("/admin/login", url.origin));
  if (!PREVIEWABLE.test(path)) return new NextResponse("That page can't be previewed.", { status: 400 });

  mode.enable();
  return NextResponse.redirect(new URL(safePath, url.origin));
}
