import Link from "next/link";
import { companyName } from "@/lib/brand";

export function Logo() {
  return (
    <Link href="/" aria-label={`${companyName} home`} className="logo">
      {/* 192 for standard displays, 512 for retina — the two files in public. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/web-app-manifest-192x192.png"
        srcSet="/web-app-manifest-192x192.png 1x, /web-app-manifest-512x512.png 2x"
        alt=""
        width={36}
        height={36}
        className="logo-mark"
      />
      <span className="text-[15px] font-semibold tracking-[-0.02em]">{companyName}</span>
    </Link>
  );
}
