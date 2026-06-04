import { Stack } from 'expo-router';
import { View } from 'react-native';

import { BackendStatusBanner } from '@/components/backend-status-banner';
import { palette } from '@/lib/theme';

export default function TenantLayout() {
  return (
    <View style={{ flex: 1 }}>
      <BackendStatusBanner />
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: palette.background },
          headerShadowVisible: false,
          headerTintColor: palette.text,
          headerTitleStyle: { fontWeight: '600' },
          contentStyle: { backgroundColor: palette.background },
        }}>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="payment-history" options={{ title: 'Payment History' }} />
        <Stack.Screen name="contact-admin" options={{ title: 'Messages' }} />
        <Stack.Screen name="pay-rent" options={{ title: 'Pay Rent' }} />
        <Stack.Screen name="maintenance-request" options={{ title: 'New Repair Request' }} />
      </Stack>
    </View>
  );
}
