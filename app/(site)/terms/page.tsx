import { LegalPage, legalMetadata } from "@/components/site/legal-page";

export const metadata = legalMetadata("terms");

export default function TermsPage() {
  return <LegalPage title="Terms" />;
}
