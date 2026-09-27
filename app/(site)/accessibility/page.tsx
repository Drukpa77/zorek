import { LegalPage, legalMetadata } from "@/components/site/legal-page";

export const metadata = legalMetadata("accessibility");

export default function AccessibilityPage() {
  return <LegalPage doc="accessibility" />;
}
