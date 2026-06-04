import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { StyleSheet, Text, View } from 'react-native';
import { z } from 'zod';

import { AuthShell } from '@/components/auth-shell';
import { PrimaryButton } from '@/components/primary-button';
import { TextField } from '@/components/text-field';
import { commonStyles } from '@/lib/theme';
import { useAuth } from '@/providers/auth-provider';

const forgotPasswordSchema = z.object({
  email: z.string().trim().min(1, 'Email is required.').email('Enter a valid email address.'),
});

type ForgotPasswordValues = z.infer<typeof forgotPasswordSchema>;

export default function ForgotPasswordScreen() {
  const router = useRouter();
  const { configError, isConfigured, requestPasswordReset } = useAuth();
  const [requestMessage, setRequestMessage] = useState<string | null>(null);
  const [requestError, setRequestError] = useState<string | null>(null);
  const {
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ForgotPasswordValues>({
    defaultValues: { email: '' },
    resolver: zodResolver(forgotPasswordSchema),
  });

  const onSubmit = handleSubmit(async (values) => {
    setRequestError(null);
    setRequestMessage(null);

    const { error } = await requestPasswordReset(values.email.trim());

    if (error) {
      setRequestError(error.message);
      return;
    }

    setRequestMessage('Reset instructions have been sent if this email is registered.');
  });

  return (
    <AuthShell
      eyebrow="Password Help"
      title="Reset your password."
      subtitle="Enter your email and we’ll send a secure reset link."
      actionLabel="Back"
      onActionPress={() => router.replace('/auth/login')}>
      <View style={styles.stack}>
        <View style={styles.formCard}>
          <Controller
            control={control}
            name="email"
            render={({ field: { onBlur, onChange, value } }) => (
              <TextField
                autoCapitalize="none"
                autoComplete="email"
                error={errors.email?.message}
                keyboardType="email-address"
                label="Email"
                onBlur={onBlur}
                onChangeText={onChange}
                onSubmitEditing={() => void onSubmit()}
                placeholder="you@example.com"
                returnKeyType="done"
                value={value}
              />
            )}
          />

          {configError ? <Text style={commonStyles.errorText}>{configError}</Text> : null}
          {requestError ? <Text style={commonStyles.errorText}>{requestError}</Text> : null}
          {requestMessage ? <Text style={styles.successText}>{requestMessage}</Text> : null}

          <PrimaryButton
            disabled={!isConfigured}
            label="Send reset link"
            loading={isSubmitting}
            onPress={onSubmit}
          />
        </View>
      </View>
    </AuthShell>
  );
}

const styles = StyleSheet.create({
  stack: {
    gap: 14,
  },
  formCard: {
    backgroundColor: 'rgba(255,255,255,0.54)',
    borderColor: 'rgba(112, 124, 138, 0.18)',
    borderRadius: 22,
    borderWidth: 1,
    gap: 10,
    padding: 16,
  },
  successText: {
    color: '#1D6E5B',
    fontSize: 13,
    fontWeight: '700',
  },
});
