import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

import { palette } from '@/lib/theme';

export function LoadingScreen() {
  return (
    <View style={styles.container}>
      <ActivityIndicator color={palette.primary} size="large" />
      <Text style={styles.text}>Checking session...</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    backgroundColor: palette.background,
    flex: 1,
    gap: 12,
    justifyContent: 'center',
    padding: 24,
  },
  text: {
    color: palette.mutedText,
    fontSize: 14,
  },
});
