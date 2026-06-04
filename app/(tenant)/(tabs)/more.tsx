import { useRouter, type Href } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { PrimaryButton } from '@/components/primary-button';
import { ActionLink } from '@/components/action-link';
import { ScreenContainer } from '@/components/screen-container';
import { SectionCard } from '@/components/section-card';
import { contactRequestsBackendEnabled, fetchContactRequestsFromBackend } from '@/lib/contact-requests-backend';
import { formatShortDate } from '@/lib/prototype-ledger';
import { getDemoTenantContext } from '@/lib/tenant-demo';
import { commonStyles, palette } from '@/lib/theme';
import { useAccess } from '@/providers/access-provider';
import { useAuth } from '@/providers/auth-provider';
import { useMasterData } from '@/providers/master-data-provider';
import { useNotifications } from '@/providers/notifications-provider';
import type { ContactRequest } from '@/types/domain';
import { useDemoRole } from '@/providers/demo-role-provider';
import { usePrototype } from '@/providers/prototype-provider';

export default function TenantMoreScreen() {
  const router = useRouter();
  const { signOut } = useAuth();
  const { currentTenantId, isDemoMode } = useAccess();
  const { clearSelectedRole } = useDemoRole();
  const { data, masterDataMessage } = useMasterData();
  const { notifications, notificationsMessage, markNotificationRead } = useNotifications();
  const { ledgerRows, maintenanceRows } = usePrototype();
  const { tenant, contactRequests } = getDemoTenantContext(data, ledgerRows, maintenanceRows, currentTenantId);
  const tenantId = tenant?.id ?? currentTenantId ?? null;
  const [backendRequests, setBackendRequests] = useState<ContactRequest[] | null>(null);

  useEffect(() => {
    let isActive = true;

    async function loadRequests() {
      if (!contactRequestsBackendEnabled() || !tenantId) {
        return;
      }

      const result = await fetchContactRequestsFromBackend({ tenantId });

      if (!isActive || result.error) {
        return;
      }

      setBackendRequests(result.data.length > 0 ? result.data : null);
    }

    void loadRequests();

    return () => {
      isActive = false;
    };
  }, [tenantId]);

  const inquiries = backendRequests ?? contactRequests;

  return (
    <ScreenContainer
      eyebrow="Tenant Portal"
      title="More"
      subtitle="Tenant support shortcuts and recent message history">
      {masterDataMessage ? <Text style={commonStyles.helperText}>{masterDataMessage}</Text> : null}

      <SectionCard title="Need help?">
        <View style={styles.stack}>
          <PrimaryButton label="Messages" onPress={() => router.push('/(tenant)/contact-admin' as Href)} />
          <PrimaryButton label="View payment history" onPress={() => router.push('/(tenant)/payment-history' as Href)} variant="secondary" />
          {isDemoMode ? (
            <PrimaryButton
              label="Back to Home Page"
              onPress={() => {
                clearSelectedRole();
                router.replace('/');
              }}
              variant="secondary"
            />
          ) : null}
          {!isDemoMode ? (
            <PrimaryButton
              label="Log out"
              onPress={() => void signOut()}
              variant="secondary"
            />
          ) : null}
        </View>
      </SectionCard>

      <SectionCard title="Recent messages">
        {inquiries.length > 0 ? (
          inquiries.slice(0, 2).map((inquiry) => (
            <Pressable
              key={inquiry.id}
              onPress={() => router.push('/(tenant)/contact-admin' as Href)}
              style={styles.inquiryCard}>
              <Text style={styles.inquiryTitle}>{inquiry.subject}</Text>
              <Text style={commonStyles.helperText}>{inquiry.message}</Text>
              <Text style={commonStyles.helperText}>Sent {formatShortDate(inquiry.sentAt)}</Text>
              <Text style={styles.linkHint}>Open contact thread</Text>
            </Pressable>
          ))
        ) : (
          <Text style={commonStyles.helperText}>No recent messages yet.</Text>
        )}
      </SectionCard>

      <SectionCard title="Recent account updates">
        {notificationsMessage ? <Text style={commonStyles.helperText}>{notificationsMessage}</Text> : null}
        {notifications.length > 0 ? (
          notifications.slice(0, 2).map((item) => (
            <Pressable
              key={item.id}
              onPress={() => {
                void markNotificationRead(item.id);
                router.push((item.routeTarget as Href) ?? ('/(tenant)/contact-admin' as Href));
              }}
              style={styles.inquiryCard}>
              <Text style={styles.inquiryTitle}>{item.title}</Text>
              <Text style={commonStyles.helperText}>{item.body}</Text>
              <Text style={styles.linkHint}>{item.actionLabel ?? 'Open update'}</Text>
            </Pressable>
          ))
        ) : (
          <Text style={commonStyles.helperText}>No account alerts right now.</Text>
        )}
      </SectionCard>

      <SectionCard title="Legal & policies" subtitle="Reference documents for your current app access.">
        <ActionLink href="/legal/terms" label="Terms of Service" />
        <ActionLink href="/legal/privacy" label="Privacy Policy" />
        <ActionLink href="/legal/disclaimer" label="Disclaimer" />
        <ActionLink href="/legal/cookies" label="Cookie Policy" />
      </SectionCard>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  stack: {
    gap: 10,
  },
  inquiryCard: {
    backgroundColor: palette.surfaceMuted,
    borderColor: palette.border,
    borderRadius: 18,
    borderWidth: 1,
    marginBottom: 10,
    padding: 14,
  },
  inquiryTitle: {
    color: palette.text,
    fontSize: 15,
    fontWeight: '700',
  },
  linkHint: {
    color: palette.primary,
    fontSize: 12,
    fontWeight: '700',
    marginTop: 8,
  },
});
