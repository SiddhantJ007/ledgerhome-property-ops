import { LegalDocumentScreen } from '@/components/legal-document-screen';
import { legalDocuments } from '@/lib/legal-documents';

export default function CookiePolicyScreen() {
  return <LegalDocumentScreen document={legalDocuments.cookies} />;
}
