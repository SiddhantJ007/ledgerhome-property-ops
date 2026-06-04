import { LegalDocumentScreen } from '@/components/legal-document-screen';
import { legalDocuments } from '@/lib/legal-documents';

export default function TermsScreen() {
  return <LegalDocumentScreen document={legalDocuments.terms} />;
}
