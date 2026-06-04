import { Text, StyleSheet, View } from 'react-native';

import { ScreenContainer } from '@/components/screen-container';
import { SectionCard } from '@/components/section-card';
import { commonStyles } from '@/lib/theme';
import type { LegalDocument } from '@/lib/legal-documents';

type LegalDocumentScreenProps = {
  document: LegalDocument;
};

export function LegalDocumentScreen({ document }: LegalDocumentScreenProps) {
  return (
    <ScreenContainer
      eyebrow={document.eyebrow}
      title={document.title}
      subtitle={document.subtitle}>
      <SectionCard title="Document status">
        <Text style={commonStyles.helperText}>{document.updatedLabel}</Text>
      </SectionCard>

      {document.sections.map((section) => (
        <SectionCard key={section.heading} title={section.heading}>
          <View style={styles.paragraphStack}>
            {section.body.map((paragraph) => (
              <Text key={paragraph} style={commonStyles.bodyText}>
                {paragraph}
              </Text>
            ))}
          </View>
        </SectionCard>
      ))}
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  paragraphStack: {
    gap: 12,
  },
});
