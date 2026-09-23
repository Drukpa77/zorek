import { SignInForm } from "@/components/admin/sign-in-form";

export default function LoginPage() {
  return (
    <main className="admin-auth">
      <SignInForm
        hintEmail={process.env.SEED_ADMIN_EMAIL ?? "admin@example.com"}
        hintPassword={process.env.SEED_ADMIN_PASSWORD ?? "demopassword"}
      />
    </main>
  );
}
