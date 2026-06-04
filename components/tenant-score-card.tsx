import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { commonStyles, palette } from '@/lib/theme';
import type { TenantScoreResult } from '@/lib/tenant-score';

type TenantScoreCardProps = {
  score: TenantScoreResult;
  title: string;
  subtitle: string;
};

export function TenantScoreCard({ score, title, subtitle }: TenantScoreCardProps) {
  const [selectedLabel, setSelectedLabel] = useState(score.components[0]?.label ?? '');
  const selectedComponent = score.components.find((component) => component.label === selectedLabel) ?? score.components[0];

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <View style={styles.scoreRing}>
          <Text style={styles.scoreValue}>{score.score}</Text>
          <Text style={styles.scoreOutOf}>/100</Text>
        </View>
        <View style={styles.headerCopy}>
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.label}>{score.label}</Text>
          <Text style={styles.subtitle}>{subtitle}</Text>
          <Text style={commonStyles.helperText}>{score.helper}</Text>
        </View>
      </View>

      <View style={styles.componentList}>
        {score.components.map((component) => {
          const isSelected = component.label === selectedComponent?.label;
          const widthPercent = `${Math.round((component.value / component.max) * 100)}%` as const;

          return (
            <Pressable
              accessibilityRole="button"
              key={component.label}
              onPress={() => setSelectedLabel(component.label)}
              style={[styles.componentCard, isSelected && styles.componentCardSelected]}>
              <View style={styles.componentHeader}>
                <Text style={styles.componentLabel}>{component.label}</Text>
                <Text style={styles.componentValue}>
                  {component.value}/{component.max}
                </Text>
              </View>
              <View style={styles.track}>
                <View style={[styles.fill, { width: widthPercent }]} />
              </View>
            </Pressable>
          );
        })}
      </View>

      {selectedComponent ? (
        <View style={styles.reasonCard}>
          <Text style={styles.reasonTitle}>{selectedComponent.label}</Text>
          <Text style={commonStyles.helperText}>{selectedComponent.reason}</Text>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: 14,
  },
  header: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 14,
  },
  scoreRing: {
    alignItems: 'center',
    backgroundColor: '#F3EEE5',
    borderColor: '#D7C7AD',
    borderRadius: 42,
    borderWidth: 1,
    height: 84,
    justifyContent: 'center',
    width: 84,
  },
  scoreValue: {
    color: palette.text,
    fontSize: 30,
    fontWeight: '800',
  },
  scoreOutOf: {
    color: palette.mutedText,
    fontSize: 11,
    fontWeight: '800',
  },
  headerCopy: {
    flex: 1,
  },
  title: {
    color: palette.text,
    fontSize: 17,
    fontWeight: '800',
  },
  label: {
    color: '#1D6E5B',
    fontSize: 13,
    fontWeight: '800',
    marginTop: 4,
  },
  subtitle: {
    color: palette.mutedText,
    fontSize: 12,
    lineHeight: 18,
    marginTop: 4,
  },
  componentList: {
    gap: 10,
  },
  componentCard: {
    backgroundColor: palette.surfaceMuted,
    borderColor: palette.border,
    borderRadius: 14,
    borderWidth: 1,
    padding: 12,
  },
  componentCardSelected: {
    borderColor: palette.accent,
  },
  componentHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  componentLabel: {
    color: palette.text,
    fontSize: 13,
    fontWeight: '800',
  },
  componentValue: {
    color: palette.mutedText,
    fontSize: 13,
    fontWeight: '800',
  },
  track: {
    backgroundColor: '#E7DED1',
    borderRadius: 999,
    height: 8,
    marginTop: 8,
    overflow: 'hidden',
  },
  fill: {
    backgroundColor: '#1D6E5B',
    borderRadius: 999,
    height: '100%',
  },
  reasonCard: {
    backgroundColor: '#FFFFFF',
    borderColor: palette.border,
    borderRadius: 14,
    borderWidth: 1,
    padding: 12,
  },
  reasonTitle: {
    color: palette.text,
    fontSize: 13,
    fontWeight: '800',
    marginBottom: 4,
  },
});
