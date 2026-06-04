import { LegalDocumentScreen } from '@/components/legal-document-screen';
import { legalDocuments } from '@/lib/legal-documents';

export default function DisclaimerScreen() {
  return <LegalDocumentScreen document={legalDocuments.disclaimer} />;
}
