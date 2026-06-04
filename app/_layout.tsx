import { useEffect } from 'react';
import { Stack } from 'expo-router';
import 'react-native-reanimated';
import * as SystemUI from 'expo-system-ui';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { LoadingScreen } from '@/components/loading-screen';
import { palette } from '@/lib/theme';
import { AccessProvider, useAccess } from '@/providers/access-provider';
import { AuthProvider, useAuth } from '@/providers/auth-provider';
import { DemoRoleProvider } from '@/providers/demo-role-provider';
import { MasterDataProvider } from '@/providers/master-data-provider';
import { NotificationsProvider } from '@/providers/notifications-provider';
import { PrototypeProvider } from '@/providers/prototype-provider';

export default function RootLayout() {
  useEffect(() => {
    void SystemUI.setBackgroundColorAsync(palette.background);
  }, []);

  return (
    <SafeAreaProvider>
      <AuthProvider>
        <DemoRoleProvider>
          <AccessProvider>
            <PrototypeProvider>
              <MasterDataProvider>
                <NotificationsProvider>
                  <RootNavigator />
                </NotificationsProvider>
              </MasterDataProvider>
            </PrototypeProvider>
          </AccessProvider>
        </DemoRoleProvider>
      </AuthProvider>
    </SafeAreaProvider>
  );
}

function RootNavigator() {
  const { isAuthenticated, isLoading, isPasswordRecovery } = useAuth();
  const { isAccessLoading, isAdmin, isDemoMode, isTenant, routeReady } = useAccess();
  const authScreenGranted = isDemoMode
    ? false
    : isPasswordRecovery || !isAuthenticated || (routeReady && !isAdmin && !isTenant);

  if (!isDemoMode && (isLoading || isAccessLoading)) {
    return <LoadingScreen />;
  }

  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: palette.background },
        headerShadowVisible: false,
        headerTintColor: palette.text,
        headerTitleStyle: { fontWeight: '600' },
        contentStyle: { backgroundColor: palette.background },
      }}>
      <Stack.Screen name="index" options={{ headerShown: false }} />
      <Stack.Protected guard={authScreenGranted}>
        <Stack.Screen name="auth" options={{ headerShown: false }} />
      </Stack.Protected>
      <Stack.Screen name="legal/terms" options={{ headerShown: false }} />
      <Stack.Screen name="legal/privacy" options={{ headerShown: false }} />
      <Stack.Screen name="legal/disclaimer" options={{ headerShown: false }} />
      <Stack.Screen name="legal/cookies" options={{ headerShown: false }} />
      <Stack.Protected guard={isAdmin}>
        <Stack.Screen name="(admin)" options={{ headerShown: false }} />
      </Stack.Protected>
      <Stack.Protected guard={isTenant}>
        <Stack.Screen name="(tenant)" options={{ headerShown: false }} />
      </Stack.Protected>
    </Stack>
  );
}
