import type { Metadata } from "next";
import { GuidedForm } from "@/components/contact/guided-form";

export const metadata: Metadata = {
  title: "Start a project",
  description: "Tell us about your challenge. Eight short questions and we'll come back with the right way forward.",
};

export default function ContactPage() {
  return (
    <main>
      <GuidedForm />
    </main>
  );
}
