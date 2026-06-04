import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { ActionLink } from '@/components/action-link';
import { PrimaryButton } from '@/components/primary-button';
import { ScreenContainer } from '@/components/screen-container';
import { SectionCard } from '@/components/section-card';
import { commonStyles } from '@/lib/theme';
import { useAuth } from '@/providers/auth-provider';
import { useMasterData } from '@/providers/master-data-provider';

export default function MoreScreen() {
  const [logoutError, setLogoutError] = useState<string | null>(null);
  const { signOut } = useAuth();
  const { data, masterDataMessage } = useMasterData();

  const handleLogout = async () => {
    setLogoutError(null);

    const { error } = await signOut();

    if (error) {
      setLogoutError(error.message);
    }
  };

  return (
    <ScreenContainer
      eyebrow="Admin"
      title="More">

      <SectionCard title="Account">
        <View style={styles.buttonStack}>
          <PrimaryButton label="Log out" onPress={handleLogout} variant="secondary" />
        </View>
        {logoutError ? <Text style={commonStyles.errorText}>{logoutError}</Text> : null}
      </SectionCard>

      <SectionCard title="Property, unit, and tenant records">
        {masterDataMessage ? <Text style={commonStyles.helperText}>{masterDataMessage}</Text> : null}
        <ActionLink href="/tenants" label="Open tenants" />
        <ActionLink href="/units" label="Open units" />
        <ActionLink href="/(admin)/(tabs)/properties" label="Open properties" />
        <Text style={commonStyles.helperText}>
          Open any tenant record to link or provision their app login.
        </Text>
      </SectionCard>

      <SectionCard title="Operations snapshot">
        <Text style={commonStyles.helperText}>
          {data.properties.length} properties • {data.units.length} units
        </Text>
        <Text style={commonStyles.helperText}>
          {data.tenants.length} tenant records
        </Text>
      </SectionCard>

      <SectionCard title="Legal & policies" subtitle="Reference documents for the current private release.">
        <ActionLink href="/legal/terms" label="Terms of Service" />
        <ActionLink href="/legal/privacy" label="Privacy Policy" />
        <ActionLink href="/legal/disclaimer" label="Disclaimer" />
        <ActionLink href="/legal/cookies" label="Cookie Policy" />
      </SectionCard>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  buttonStack: {
    gap: 10,
    marginTop: 12,
  },
});
