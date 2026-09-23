import { ForgotPasswordForm } from "@/components/admin/forgot-password-form";

export default function ForgotPasswordPage() {
  return (
    <main className="admin-auth">
      <ForgotPasswordForm hintEmail={process.env.SEED_ADMIN_EMAIL ?? "admin@example.com"} />
    </main>
  );
}
