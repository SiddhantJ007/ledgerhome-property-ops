import { Stack } from 'expo-router';
import { View } from 'react-native';

import { BackendStatusBanner } from '@/components/backend-status-banner';
import { palette } from '@/lib/theme';

export default function AdminLayout() {
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
        <Stack.Screen name="neighborhoods/index" options={{ title: 'Neighborhoods' }} />
        <Stack.Screen name="neighborhoods/add" options={{ title: 'Add neighborhood' }} />
        <Stack.Screen name="neighborhoods/[neighborhoodId]" options={{ title: 'Neighborhood details' }} />
        <Stack.Screen name="properties/add" options={{ title: 'Add property' }} />
        <Stack.Screen name="properties/[propertyId]" options={{ title: 'Property details' }} />
        <Stack.Screen name="units/index" options={{ title: 'Units' }} />
        <Stack.Screen name="units/add" options={{ title: 'Add unit' }} />
        <Stack.Screen name="units/[unitId]" options={{ title: 'Unit details' }} />
        <Stack.Screen name="tenants/index" options={{ title: 'Tenants' }} />
        <Stack.Screen name="tenants/add" options={{ title: 'Add tenant' }} />
        <Stack.Screen name="tenants/[tenantId]" options={{ title: 'Tenant details' }} />
        <Stack.Screen name="payments/record" options={{ title: 'Record payment' }} />
        <Stack.Screen name="payments/history" options={{ title: 'Payment history' }} />
        <Stack.Screen name="maintenance/add" options={{ title: 'Add repair' }} />
      </Stack>
    </View>
  );
}
