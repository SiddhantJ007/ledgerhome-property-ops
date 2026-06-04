import { zodResolver } from '@hookform/resolvers/zod';
import { useLocalSearchParams, useRouter, type Href } from 'expo-router';
import { useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { z } from 'zod';

import { AuthShell } from '@/components/auth-shell';
import { PrimaryButton } from '@/components/primary-button';
import { TextField } from '@/components/text-field';
import { commonStyles, palette } from '@/lib/theme';
import { useAccess } from '@/providers/access-provider';
import { useAuth } from '@/providers/auth-provider';

const loginSchema = z.object({
  email: z
    .string()
    .trim()
    .min(1, 'Email is required.')
    .email('Enter a valid email address.'),
  password: z
    .string()
    .min(1, 'Password is required.')
    .min(8, 'Password must be at least 8 characters.'),
});

type LoginFormValues = z.infer<typeof loginSchema>;

export default function LoginScreen() {
  const router = useRouter();
  const { role } = useLocalSearchParams<{ role?: string }>();
  const expectedRole = role === 'admin' || role === 'tenant' ? role : undefined;
  const [authError, setAuthError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const { currentRole, routeReady, statusMessage } = useAccess();
  const { configError, isAuthenticated, isConfigured, signInWithPassword, signOut } = useAuth();
  const {
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormValues>({
    defaultValues: {
      email: '',
      password: '',
    },
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = handleSubmit(async (values) => {
    setAuthError(null);

    const { error } = await signInWithPassword({
      email: values.email.trim(),
      expectedRole,
      password: values.password,
    });

    if (error) {
      setAuthError(error.message);
    }
  });

  const mappingError = !isAuthenticated || currentRole ? null : routeReady ? statusMessage : null;

  return (
    <AuthShell
      eyebrow={expectedRole === 'admin' ? 'Admin Sign In' : expectedRole === 'tenant' ? 'Tenant Sign In' : 'Sign In'}
      title={
        expectedRole === 'admin'
          ? 'Sign in as admin'
          : expectedRole === 'tenant'
            ? 'Sign in as tenant'
            : 'Sign in to LedgerHome'
      }
      subtitle={
        expectedRole === 'admin'
          ? ''
          : expectedRole === 'tenant'
            ? ''
            : 'Use the email and password for your tenant or admin account.'
      }
      actionLabel="Back"
      onActionPress={() => router.replace('/auth')}
      footer="">
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
                placeholder="you@example.com"
                returnKeyType="next"
                value={value}
              />
            )}
          />

          <Controller
            control={control}
            name="password"
            render={({ field: { onBlur, onChange, value } }) => (
              <TextField
                autoCapitalize="none"
                autoComplete="password"
                error={errors.password?.message}
                label="Password"
                onBlur={onBlur}
                onChangeText={onChange}
                onSubmitEditing={() => void onSubmit()}
                placeholder="Enter your password"
                rightActionLabel={showPassword ? 'Hide' : 'Show'}
                onRightActionPress={() => setShowPassword((current) => !current)}
                returnKeyType="done"
                secureTextEntry={!showPassword}
                value={value}
              />
            )}
          />

          {configError ? <Text style={commonStyles.errorText}>{configError}</Text> : null}
          {authError ? <Text style={commonStyles.errorText}>{authError}</Text> : null}
          {mappingError ? <Text style={commonStyles.errorText}>{mappingError}</Text> : null}

          <View style={styles.buttonStack}>
            <Pressable onPress={() => router.push('/auth/forgot-password' as Href)} style={styles.forgotLink}>
              <Text style={styles.forgotLinkLabel}>Forgot password</Text>
            </Pressable>
            <PrimaryButton
              disabled={!isConfigured || isAuthenticated}
              label={isAuthenticated ? 'Signed in' : 'Sign in'}
              loading={isSubmitting}
              onPress={onSubmit}
            />
            {mappingError ? (
              <PrimaryButton label="Sign out" onPress={() => void signOut()} variant="secondary" />
            ) : null}
          </View>
        </View>
      </View>
    </AuthShell>
  );
}

const styles = StyleSheet.create({
  stack: {
    gap: 14,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  chip: {
    backgroundColor: 'rgba(76, 88, 103, 0.12)',
    borderColor: 'rgba(112, 124, 138, 0.18)',
    borderRadius: 18,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  chipLabel: {
    color: palette.text,
    fontSize: 13,
    fontWeight: '700',
  },
  formCard: {
    backgroundColor: 'rgba(255,255,255,0.54)',
    borderColor: 'rgba(112, 124, 138, 0.18)',
    borderRadius: 22,
    borderWidth: 1,
    padding: 16,
  },
  buttonStack: {
    gap: 10,
    marginTop: 8,
  },
  forgotLink: {
    alignSelf: 'flex-start',
  },
  forgotLinkLabel: {
    color: palette.primary,
    fontSize: 13,
    fontWeight: '700',
  },
  bottomAction: {
    alignItems: 'center',
    backgroundColor: 'rgba(76, 88, 103, 0.12)',
    borderColor: 'rgba(112, 124, 138, 0.18)',
    borderRadius: 18,
    borderWidth: 1,
    justifyContent: 'center',
    minHeight: 52,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  bottomActionLabel: {
    color: palette.primary,
    fontSize: 14,
    fontWeight: '800',
  },
});
