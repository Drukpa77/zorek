import { SiteFooter } from "@/components/site/site-footer";
import { SiteHeader } from "@/components/site/site-header";
import { SiteRuntime } from "@/components/site/site-runtime";
import { getMainNav } from "@/lib/site-data";

export default async function SiteLayout({ children }: { children: React.ReactNode }) {
  const items = await getMainNav();

  return (
    <>
      <SiteRuntime />
      <SiteHeader items={items} />
      <div id="top" className="relative z-[2]">
        <div id="content">{children}</div>
      </div>
      <SiteFooter />
    </>
  );
}
