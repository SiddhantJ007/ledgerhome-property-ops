import { Pressable, StyleSheet, Text, View } from 'react-native';

import { palette } from '@/lib/theme';

type MetricCardProps = {
  label: string;
  value: string;
  helper?: string;
  onPress?: () => void;
};

export function MetricCard({ label, value, helper, onPress }: MetricCardProps) {
  const content = (
    <>
      <Text style={styles.label}>{label}</Text>
      <Text style={styles.value}>{value}</Text>
      {helper ? <Text style={styles.helper}>{helper}</Text> : null}
    </>
  );

  if (onPress) {
    return (
      <Pressable
        accessibilityRole="button"
        onPress={onPress}
        style={({ pressed }) => [styles.card, styles.clickableCard, pressed && styles.pressedCard]}>
        {content}
        <Text style={styles.openHint}>Open</Text>
      </Pressable>
    );
  }

  return (
    <View style={styles.card}>
      {content}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: palette.cardSurfaceStrong,
    borderColor: palette.border,
    borderRadius: 20,
    borderWidth: 1,
    flexBasis: '48%',
    flexGrow: 1,
    minHeight: 108,
    minWidth: 150,
    padding: 16,
    shadowColor: '#010C4A',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.04,
    shadowRadius: 18,
  },
  label: {
    color: palette.mutedText,
    fontSize: 13,
    fontWeight: '600',
  },
  value: {
    color: palette.text,
    fontSize: 24,
    fontWeight: '800',
    marginTop: 10,
  },
  helper: {
    color: palette.mutedText,
    fontSize: 12,
    lineHeight: 18,
    marginTop: 8,
  },
  clickableCard: {
    justifyContent: 'space-between',
  },
  pressedCard: {
    opacity: 0.82,
  },
  openHint: {
    color: palette.primary,
    fontSize: 12,
    fontWeight: '800',
    marginTop: 10,
  },
});
