import { signOut } from "@/auth";
import { requireRole } from "@/lib/require-role";

export default async function AdminPage() {
  const user = await requireRole("AUTHOR");

  return (
    <main className="page-shell">
      <p className="type-mono text-label">Admin · Overview</p>
      <h1 className="mt-4 text-[clamp(30px,3.4vw,44px)] font-semibold tracking-[-0.04em]">
        Signed in as {user.name}
      </h1>
      <p className="mt-3 max-w-xl text-[15px] leading-normal text-muted">
        {user.email} · {user.role.replaceAll("_", " ")}
      </p>
      <form
        className="mt-8"
        action={async () => {
          "use server";
          await signOut({ redirectTo: "/admin/login" });
        }}
      >
        <button type="submit" className="min-h-12 rounded-[4px] bg-ink px-4 text-base text-on-dark">
          Sign out
        </button>
      </form>
    </main>
  );
}
