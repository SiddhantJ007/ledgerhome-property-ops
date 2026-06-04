import { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { backendAvailableForSession, subscribeToBackendAvailability } from '@/lib/backend-availability';
import { palette } from '@/lib/theme';

export function BackendStatusBanner() {
  const insets = useSafeAreaInsets();
  const [isAvailable, setIsAvailable] = useState(backendAvailableForSession());

  useEffect(() => subscribeToBackendAvailability(setIsAvailable), []);

  if (isAvailable) {
    return null;
  }

  return (
    <View pointerEvents="none" style={[styles.wrapper, { top: insets.top + 10 }]}>
      <View style={styles.banner}>
        <Text style={styles.title}>Connection interrupted</Text>
        <Text style={styles.body}>
          Live updates are temporarily unavailable. Reconnect to the internet and reopen the app to refresh the latest Supabase data.
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    left: 0,
    position: 'absolute',
    right: 0,
    zIndex: 120,
  },
  banner: {
    backgroundColor: palette.warningSoft,
    borderColor: palette.accent,
    borderRadius: 18,
    borderWidth: 1,
    marginHorizontal: 14,
    paddingHorizontal: 16,
    paddingVertical: 12,
    shadowColor: '#010C4A',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.1,
    shadowRadius: 14,
  },
  title: {
    color: palette.text,
    fontSize: 13,
    fontWeight: '800',
  },
  body: {
    color: palette.mutedText,
    fontSize: 12,
    lineHeight: 18,
    marginTop: 4,
  },
});
