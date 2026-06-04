import { LegalDocumentScreen } from '@/components/legal-document-screen';
import { legalDocuments } from '@/lib/legal-documents';

export default function PrivacyScreen() {
  return <LegalDocumentScreen document={legalDocuments.privacy} />;
}
