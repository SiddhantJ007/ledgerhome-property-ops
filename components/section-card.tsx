import type { PropsWithChildren } from 'react';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { palette } from '@/lib/theme';

type SectionCardProps = PropsWithChildren<{
  title: string;
  subtitle?: string;
  collapsible?: boolean;
  defaultCollapsed?: boolean;
}>;

export function SectionCard({
  title,
  subtitle,
  children,
  collapsible = false,
  defaultCollapsed = false,
}: SectionCardProps) {
  const [isCollapsed, setIsCollapsed] = useState(defaultCollapsed);
  const header = (
    <View style={styles.headerRow}>
      <View style={styles.headerCopy}>
        <Text style={styles.title}>{title}</Text>
        {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
      </View>
      {collapsible ? <Text style={styles.toggleLabel}>{isCollapsed ? 'Show' : 'Hide'}</Text> : null}
    </View>
  );

  return (
    <View style={styles.card}>
      {collapsible ? (
        <Pressable
          accessibilityRole="button"
          onPress={() => setIsCollapsed((current) => !current)}
          style={styles.headerButton}>
          {header}
        </Pressable>
      ) : (
        header
      )}
      {!isCollapsed ? <View style={styles.body}>{children}</View> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: palette.cardSurface,
    borderColor: palette.border,
    borderRadius: 20,
    borderWidth: 1,
    marginBottom: 14,
    padding: 16,
    shadowColor: '#010C4A',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.03,
    shadowRadius: 16,
  },
  headerButton: {
    borderRadius: 12,
  },
  headerRow: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    gap: 12,
    justifyContent: 'space-between',
  },
  headerCopy: {
    flex: 1,
  },
  title: {
    color: palette.text,
    fontSize: 16,
    fontWeight: '700',
  },
  toggleLabel: {
    color: palette.primary,
    fontSize: 13,
    fontWeight: '800',
    marginTop: 2,
  },
  subtitle: {
    color: palette.mutedText,
    fontSize: 13,
    marginTop: 4,
  },
  body: {
    marginTop: 10,
  },
});
