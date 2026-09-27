import { LegalPage, legalMetadata } from "@/components/site/legal-page";

export const metadata = legalMetadata("privacy");

export default function PrivacyPage() {
  return <LegalPage doc="privacy" />;
}
