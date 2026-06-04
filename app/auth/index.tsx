import { useRouter, type Href } from 'expo-router';
import { Pressable, StyleSheet, Text } from 'react-native';

import { AuthShell } from '@/components/auth-shell';
import { palette } from '@/lib/theme';

export default function AuthEntryScreen() {
  const router = useRouter();

  return (
    <AuthShell
      eyebrow=""
      title="Welcome"
      subtitle="Choose your account type.">
        <Pressable
          onPress={() => router.push({ pathname: '/auth/login', params: { role: 'tenant' } } as Href)}
          style={styles.bottomAction}>
          <Text style={styles.bottomActionLabel}>Tenant sign in</Text>
        </Pressable>
        <Pressable
          onPress={() => router.push({ pathname: '/auth/login', params: { role: 'admin' } } as Href)}
          style={styles.bottomAction}>
          <Text style={styles.bottomActionLabel}>Admin sign in</Text>
        </Pressable>
    </AuthShell>
  );
}

const styles = StyleSheet.create({
  stack: {
    gap: 14,
  },
  highlightWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  highlightChip: {
    backgroundColor: 'rgba(76, 88, 103, 0.12)',
    borderColor: 'rgba(112, 124, 138, 0.18)',
    borderRadius: 18,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  highlightLabel: {
    color: palette.text,
    fontSize: 13,
    fontWeight: '700',
  },
  inlineNotice: {
    backgroundColor: 'rgba(255,255,255,0.38)',
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  inlineNoticeText: {
    color: '#40505C',
    fontSize: 13,
    lineHeight: 20,
  },
  bottomAction: {
    alignItems: 'center',
    backgroundColor: 'rgba(76, 88, 103, 0.12)',
    borderColor: 'rgba(112, 124, 138, 0.18)',
    borderRadius: 18,
    borderWidth: 1,
    justifyContent: 'center',
    marginBottom: 10,
    minHeight: 52,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  bottomActionLabel: {
    color: palette.primary,
    fontSize: 15,
    fontWeight: '800',
  },
  bottomActionHelper: {
    color: palette.mutedText,
    fontSize: 12,
    fontWeight: '600',
    marginTop: 4,
    textAlign: 'center',
  },
});
