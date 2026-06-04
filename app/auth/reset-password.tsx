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

const resetPasswordSchema = z
  .object({
    password: z.string().min(8, 'Password must be at least 8 characters.'),
    confirmPassword: z.string().min(1, 'Confirm your new password.'),
  })
  .refine((values) => values.password === values.confirmPassword, {
    message: 'Passwords do not match.',
    path: ['confirmPassword'],
  });

type ResetPasswordValues = z.infer<typeof resetPasswordSchema>;

export default function ResetPasswordScreen() {
  const router = useRouter();
  const { configError, isConfigured, isPasswordRecovery, updatePassword } = useAuth();
  const [resetError, setResetError] = useState<string | null>(null);
  const [resetMessage, setResetMessage] = useState<string | null>(null);
  const {
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ResetPasswordValues>({
    defaultValues: {
      password: '',
      confirmPassword: '',
    },
    resolver: zodResolver(resetPasswordSchema),
  });

  const onSubmit = handleSubmit(async (values) => {
    setResetError(null);
    setResetMessage(null);

    const { error } = await updatePassword(values.password);

    if (error) {
      setResetError(error.message);
      return;
    }

    setResetMessage('Password updated. You can now continue into the app or sign in again later.');
  });

  return (
    <AuthShell
      eyebrow="Password Reset"
      title="Create a new password."
      subtitle="Use a secure password you can reuse for your app access going forward."
      actionLabel="Back"
      onActionPress={() => router.replace('/auth/login')}>
      <View style={styles.stack}>
        <View style={styles.formCard}>
          {!isPasswordRecovery ? (
            <Text style={commonStyles.helperText}>
              Open this screen from the password-reset link sent to your email.
            </Text>
          ) : null}

          <Controller
            control={control}
            name="password"
            render={({ field: { onBlur, onChange, value } }) => (
              <TextField
                autoCapitalize="none"
                autoComplete="password"
                error={errors.password?.message}
                label="New password"
                onBlur={onBlur}
                onChangeText={onChange}
                placeholder="Enter a new password"
                returnKeyType="next"
                secureTextEntry
                value={value}
              />
            )}
          />

          <Controller
            control={control}
            name="confirmPassword"
            render={({ field: { onBlur, onChange, value } }) => (
              <TextField
                autoCapitalize="none"
                autoComplete="password"
                error={errors.confirmPassword?.message}
                label="Confirm password"
                onBlur={onBlur}
                onChangeText={onChange}
                onSubmitEditing={() => void onSubmit()}
                placeholder="Re-enter the new password"
                returnKeyType="done"
                secureTextEntry
                value={value}
              />
            )}
          />

          {configError ? <Text style={commonStyles.errorText}>{configError}</Text> : null}
          {resetError ? <Text style={commonStyles.errorText}>{resetError}</Text> : null}
          {resetMessage ? <Text style={styles.successText}>{resetMessage}</Text> : null}

          <PrimaryButton
            disabled={!isConfigured || !isPasswordRecovery}
            label="Update password"
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
