import { StyleSheet, Text, View } from 'react-native';

import { PrimaryButton } from '@/components/primary-button';
import { ScreenContainer } from '@/components/screen-container';
import { SectionCard } from '@/components/section-card';
import { commonStyles } from '@/lib/theme';
import { useRouter } from 'expo-router';

export default function PayRentScreen() {
  const router = useRouter();

  return (
    <ScreenContainer
      eyebrow="Tenant Portal"
      title="Online Payments"
      subtitle="Online rent payments are not enabled for this account yet.">
      <SectionCard title="Payment availability">
        <Text style={commonStyles.bodyText}>Please review Rent & Payments and contact the property team if you need help with your balance.</Text>
        <Text style={commonStyles.helperText}>
          This tenant account can still view dues, payment history, and statements while online payments remain disabled.
        </Text>
        <View style={styles.buttonRow}>
          <PrimaryButton label="Back to dues" onPress={() => router.back()} />
        </View>
      </SectionCard>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  buttonRow: {
    marginTop: 16,
  },
});
