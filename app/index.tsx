import { Redirect, useRouter, type Href } from 'expo-router';
import { Image, ImageBackground, StyleSheet, Text, View } from 'react-native';

import { PrimaryButton } from '@/components/primary-button';
import { DEMO_MODE } from '@/lib/demo-mode';
import { palette } from '@/lib/theme';
import { useAccess } from '@/providers/access-provider';
import { useDemoRole } from '@/providers/demo-role-provider';

export default function IndexScreen() {
  const { routeReady, routeTarget } = useAccess();
  const { setSelectedRole } = useDemoRole();
  const router = useRouter();

  if (!DEMO_MODE) {
    if (!routeReady) {
      return null;
    }

    return <Redirect href={routeTarget as Href} />;
  }

  return (
    <ImageBackground
      source={{
        uri: 'https://unsplash.com/photos/gray-wooden-house-178j8tJrNlc?auto=format&fit=crop&w=1400&q=80',
      }}
      style={styles.background}>
      <View style={styles.overlay}>
        <View style={styles.content}>
          <View style={styles.heroBlock}>
            <Image source={require('@/assets/images/brand-logo-source.png')} style={styles.logo} resizeMode="contain" />
            <Text style={styles.brandName}>LedgerHome</Text>
            <Text style={styles.subtitle}>
              Clear rent, repairs, documents, and messages for every rental account.
            </Text>
          </View>

          <View style={styles.card}>
            <Text style={styles.cardTitle}>Who are you?</Text>
            <View style={styles.buttonStack}>
              <PrimaryButton
                label="Tenant sign in"
                onPress={() => {
                  setSelectedRole('tenant');
                  router.push('/(tenant)/(tabs)' as Href);
                }}
                variant="secondary"
              />
              <PrimaryButton
                label="Admin sign in"
                onPress={() => {
                  setSelectedRole('admin');
                  router.push('/(admin)/(tabs)' as Href);
                }}
              />
            </View>
          </View>
        </View>
      </View>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  background: {
    flex: 1,
  },
  overlay: {
    backgroundColor: 'rgba(1, 12, 74, 0.16)',
    flex: 1,
  },
  content: {
    flex: 1,
    justifyContent: 'space-between',
    maxWidth: 1180,
    padding: 24,
    paddingBottom: 36,
    paddingTop: 72,
    width: '100%',
  },
  heroBlock: {
    backgroundColor: 'rgba(255, 251, 239, 0.86)',
    borderColor: 'rgba(191,139,52,0.22)',
    borderRadius: 28,
    borderWidth: 1,
    maxWidth: 560,
    padding: 24,
    shadowColor: '#010C4A',
    shadowOffset: { width: 0, height: 14 },
    shadowOpacity: 0.08,
    shadowRadius: 24,
  },
  logo: {
    alignSelf: 'flex-start',
    aspectRatio: 345 / 446,
    height: 110,
    marginBottom: 14,
    width: 85,
  },
  brandName: {
    color: palette.text,
    fontSize: 26,
    fontWeight: '800',
    marginBottom: 6,
  },
  subtitle: {
    color: palette.mutedText,
    fontSize: 16,
    lineHeight: 24,
    marginTop: 12,
    maxWidth: 460,
  },
  card: {
    alignSelf: 'center',
    backgroundColor: 'rgba(255,254,250,0.97)',
    borderColor: 'rgba(191,139,52,0.18)',
    borderRadius: 24,
    borderWidth: 1,
    maxWidth: 720,
    padding: 20,
    shadowColor: '#010C4A',
    shadowOffset: { width: 0, height: 16 },
    shadowOpacity: 0.06,
    shadowRadius: 24,
    width: '100%',
  },
  cardTitle: {
    color: palette.text,
    fontSize: 20,
    fontWeight: '800',
  },
  cardText: {
    color: palette.mutedText,
    fontSize: 14,
    lineHeight: 21,
    marginTop: 8,
  },
  buttonStack: {
    gap: 10,
    marginTop: 20,
  },
});
