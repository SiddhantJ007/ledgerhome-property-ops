import { useCallback, useEffect, useState } from 'react';
import { useFocusEffect, useRouter, type Href } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { DashboardNotificationTray } from '@/components/dashboard-notification-tray';
import { InAppNotificationBanner } from '@/components/in-app-notification-banner';
import { MetricCard } from '@/components/metric-card';
import { ScreenContainer } from '@/components/screen-container';
import { SectionCard } from '@/components/section-card';
import { TenantScoreCard } from '@/components/tenant-score-card';
import { DEMO_MODE } from '@/lib/demo-mode';
import { fetchLedgerRowsFromBackend, paymentsBackendEnabled } from '@/lib/payments-backend';
import { fetchSupplementalChargeRowsFromBackend } from '@/lib/property-charge-configs-backend';
import {
  StatusBadge,
  formatStatusLabel,
  formatRepairStatusLabel,
  maintenanceStatusTone,
  rentStatusTone,
} from '@/components/status-badge';
import { formatCurrency, formatShortDate } from '@/lib/prototype-ledger';
import { getDemoTenantContext, getLeaseLengthLabel } from '@/lib/tenant-demo';
import { calculateTenantScore } from '@/lib/tenant-score';
import { commonStyles, palette } from '@/lib/theme';
import { useAccess } from '@/providers/access-provider';
import { useMasterData } from '@/providers/master-data-provider';
import { useNotifications } from '@/providers/notifications-provider';
import { usePrototype } from '@/providers/prototype-provider';
import type { LedgerRow, SupplementalChargeRow } from '@/types/domain';

export default function TenantHomeScreen() {
  const router = useRouter();
  const { currentTenant, currentTenantId } = useAccess();
  const { data, masterDataMessage } = useMasterData();
  const { notifications, unreadCount, markNotificationRead, dismissNotification } = useNotifications();
  const { ledgerRows, maintenanceRows } = usePrototype();
  const [backendRows, setBackendRows] = useState<LedgerRow[] | null>(null);
  const [supplementalCharges, setSupplementalCharges] = useState<SupplementalChargeRow[] | null>(null);
  const [backendMessage, setBackendMessage] = useState<string | null>(null);
  const effectiveLedgerRows = DEMO_MODE ? ledgerRows : backendRows ?? [];
  const context = getDemoTenantContext(
    data,
    effectiveLedgerRows,
    maintenanceRows,
    currentTenantId
  );
  const tenant = context.tenant ?? currentTenant;
  const fallbackRentRow =
    effectiveLedgerRows.find((item) => item.tenantId === tenant?.id) ??
    effectiveLedgerRows.find((item) => item.unitId === tenant?.unitId);
  const unit = context.unit ?? (tenant?.unitId ? data.units.find((item) => item.id === tenant.unitId) : null);
  const property =
    context.property ??
    (fallbackRentRow
      ? ({
          id: fallbackRentRow.propertyId,
          neighborhoodId: '',
          name: fallbackRentRow.propertyName,
          address: '',
          status: 'active',
          note: '',
          coverImageUrl: '',
        } as const)
      : null);
  const rentRow = context.rentRow ?? fallbackRentRow ?? null;
  const maintenance = context.maintenance;
  const lease = context.lease;
  const contactRequests = context.contactRequests;
  const tenantFirstName = tenant?.fullName ? tenant.fullName.split(' ')[0] : 'Tenant';
  const leaseLength = lease ? getLeaseLengthLabel(lease.startDate) : tenant ? getLeaseLengthLabel(tenant.moveInDate) : 'N/A';
  const recentUpdates = notifications
    .map((item) => ({
      id: item.id,
      title: item.title,
      body: item.body,
      createdAt: item.createdAt,
      actionLabel: item.actionLabel,
      href: (item.routeTarget as Href) ??
        (item.type === 'maintenance'
          ? ('/(tenant)/(tabs)/maintenance' as Href)
          : ('/(tenant)/contact-admin' as Href)),
      kind: item.type === 'maintenance' ? ('maintenance' as const) : ('notification' as const),
      readAt: item.readAt,
    }))
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .slice(0, 4);

  async function loadBackendLedger() {
    if (!paymentsBackendEnabled()) {
      return;
    }

    const result = await fetchLedgerRowsFromBackend();

    if (result.error) {
      setBackendRows([]);
      setBackendMessage(result.error);
      return;
    }

    setBackendRows(result.data);
    setBackendMessage(
      result.data.length > 0
        ? null
        : 'No rent charges are posted for this account yet.'
    );
  }

  useEffect(() => {
    let isActive = true;
    void (async () => {
      await loadBackendLedger();

      if (!isActive) {
        return;
      }
    })();

    return () => {
      isActive = false;
    };
  }, []);

  useFocusEffect(
    useCallback(() => {
      void loadBackendLedger();
      return undefined;
    }, [])
  );

  useEffect(() => {
    let isActive = true;

    async function loadSupplementalCharges() {
      if (!paymentsBackendEnabled()) {
        return;
      }

      const result = await fetchSupplementalChargeRowsFromBackend({
        tenantId: currentTenantId ?? undefined,
        unitId: tenant?.unitId,
      });

      if (!isActive || result.error) {
        return;
      }

      setSupplementalCharges(result.data);
    }

    void loadSupplementalCharges();

    return () => {
      isActive = false;
    };
  }, [currentTenantId, tenant?.unitId]);

  const supplementalDue = DEMO_MODE
    ? 0
    : (supplementalCharges ?? []).filter((item) => item.unitId === tenant?.unitId).reduce((sum, item) => sum + item.pendingAmount, 0);
  const currentBalanceHelper = rentRow
    ? `Due ${formatShortDate(rentRow.dueDate)}`
    : 'Next rent charge appears 7 days before the next due date';
  const tenantScore = calculateTenantScore({
    tenantStatus: tenant?.status,
    rentRows: effectiveLedgerRows.filter((item) => item.tenantId === tenant?.id || item.unitId === unit?.id),
    repairItems: maintenance,
    messages: contactRequests,
  });

  return (
    <>
      <InAppNotificationBanner />
      <ScreenContainer
      eyebrow="Tenant Portal"
      title={`Hi, ${tenantFirstName}`}
      subtitle="Renter's home screen with account status, lease details, and quick actions."
      headerAccessory={
        <DashboardNotificationTray
          notifications={notifications.filter((item) => !item.dismissedAt)}
          onOpenNotification={(item) => {
            void markNotificationRead(item.id);
          }}
          onDismissNotification={(item) => {
            void dismissNotification(item.id);
          }}
        />
      }>
      {masterDataMessage ? <Text style={commonStyles.helperText}>{masterDataMessage}</Text> : null}
      {backendMessage ? <Text style={commonStyles.helperText}>{backendMessage}</Text> : null}
      <View style={commonStyles.grid}>
        <MetricCard
          label="Monthly rent"
          value={formatCurrency(unit?.monthlyRent ?? rentRow?.expectedAmount ?? 0)}
          helper={property?.name ?? 'Assigned property'}
          onPress={() => router.push('/(tenant)/(tabs)/ledger' as Href)}
        />
        <MetricCard
          label="Amount owed"
          value={formatCurrency((rentRow?.pendingAmount ?? 0) + supplementalDue)}
          helper={currentBalanceHelper}
          onPress={() => router.push('/(tenant)/(tabs)/ledger' as Href)}
        />
        <MetricCard
          label="Lease term"
          value={leaseLength}
          helper={`Ends ${formatShortDate(lease?.endDate ?? tenant?.leaseEndDate ?? null)}`}
          onPress={() => router.push('/(tenant)/(tabs)/lease' as Href)}
        />
        <MetricCard
          label="Account score"
          value={`${tenantScore.score}`}
          helper={`${tenantScore.label} • reasons shown below`}
        />
        <MetricCard
          label="Address"
          value={property?.name ?? 'Property'}
          helper={
            unit?.label
              ? `${unit.label} • ${property?.address || rentRow?.propertyName || 'No address'}`
              : property?.address || rentRow?.unitLabel || 'No address'
          }
          onPress={() => router.push('/(tenant)/(tabs)/lease' as Href)}
        />
      </View>

      <SectionCard title="Resident summary">
        <Text style={styles.title}>{property?.name}</Text>
        <Text style={commonStyles.helperText}>
          {unit?.label} • {unit?.bedrooms} bed / {unit?.bathrooms} bath
        </Text>
        <Text style={commonStyles.helperText}>{property?.address}</Text>
        <Text style={commonStyles.helperText}>
          Lease {formatShortDate(lease?.startDate ?? tenant?.moveInDate ?? null)} to{' '}
          {formatShortDate(lease?.endDate ?? tenant?.leaseEndDate ?? null)}
        </Text>
        {rentRow ? (
          <StatusBadge label={formatStatusLabel(rentRow.status)} tone={rentStatusTone(rentRow.status)} />
        ) : null}
      </SectionCard>

      <SectionCard title="Account score" subtitle="Based on rent, repair, and message activity">
        <TenantScoreCard
          score={tenantScore}
          title="Account score"
          subtitle="Tap a factor to see what affected this month’s score."
        />
      </SectionCard>

      <SectionCard title="Quick actions">
        <View style={styles.actionGrid}>
          <QuickActionCard title="Rent & Payments" subtitle="Review current charges" onPress={() => router.push('/(tenant)/(tabs)/ledger' as Href)} />
          <QuickActionCard title="View History" subtitle="See recent payments" onPress={() => router.push('/(tenant)/payment-history' as Href)} />
          <QuickActionCard title="Request Repair" subtitle="Create a new request" onPress={() => router.push('/(tenant)/maintenance-request' as Href)} />
          <QuickActionCard title="Messages" subtitle="Send a message or callback request" onPress={() => router.push('/(tenant)/contact-admin' as Href)} />
        </View>
      </SectionCard>

      <SectionCard title="Open repairs">
        {maintenance.length > 0 ? (
          maintenance.slice(0, 3).map((item) => (
            <Pressable key={item.id} onPress={() => router.push('/(tenant)/(tabs)/maintenance' as Href)} style={styles.row}>
              <View style={styles.copy}>
                <Text style={styles.title}>{item.title}</Text>
                <Text style={commonStyles.helperText}>{item.unitLabel} • {item.note}</Text>
              </View>
              <StatusBadge label={formatRepairStatusLabel(item.status)} tone={maintenanceStatusTone(item.status)} />
            </Pressable>
          ))
        ) : (
          <Text style={commonStyles.helperText}>No open repair items right now.</Text>
        )}
      </SectionCard>

      <SectionCard
        title="Recent updates"
        subtitle={unreadCount > 0 ? `${unreadCount} unread alert${unreadCount === 1 ? '' : 's'}` : undefined}>
        {recentUpdates.length > 0 ? (
          recentUpdates.map((item) => (
            <Pressable
              key={item.id}
              onPress={() => {
                void markNotificationRead(item.id);
                router.push(item.href);
              }}
              style={styles.row}>
              <View style={styles.copy}>
                <Text style={styles.title}>{item.title}</Text>
                <Text style={commonStyles.helperText}>{item.body}</Text>
                <Pressable
                  onPress={() => {
                    void markNotificationRead(item.id);
                    router.push(item.href);
                  }}
                  style={styles.inlineAction}>
                  <Text style={styles.inlineActionLabel}>
                    {item.actionLabel ?? (item.kind === 'maintenance' ? 'Open repairs' : 'Open update')}
                  </Text>
                </Pressable>
              </View>
              <View style={styles.meta}>
                {!item.readAt ? <StatusBadge label="Active" tone="warning" /> : null}
                <Text style={styles.date}>{formatShortDate(item.createdAt)}</Text>
              </View>
            </Pressable>
          ))
        ) : (
          <Text style={commonStyles.helperText}>No account alerts right now.</Text>
        )}
      </SectionCard>
    </ScreenContainer>
    </>
  );
}

function QuickActionCard({
  title,
  subtitle,
  onPress,
}: {
  title: string;
  subtitle: string;
  onPress: () => void;
}) {
  return (
    <Pressable onPress={onPress} style={styles.actionCard}>
      <Text style={styles.actionTitle}>{title}</Text>
      <Text style={styles.actionSubtitle}>{subtitle}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  actionGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  actionCard: {
    backgroundColor: palette.surfaceMuted,
    borderColor: palette.border,
    borderRadius: 18,
    borderWidth: 1,
    flexBasis: '47%',
    flexGrow: 1,
    minWidth: '47%',
    padding: 14,
  },
  actionTitle: {
    color: palette.text,
    fontSize: 15,
    fontWeight: '700',
  },
  actionSubtitle: {
    color: palette.mutedText,
    fontSize: 12,
    lineHeight: 18,
    marginTop: 6,
  },
  row: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 10,
  },
  copy: {
    flex: 1,
    paddingRight: 12,
  },
  title: {
    color: palette.text,
    fontSize: 15,
    fontWeight: '700',
  },
  date: {
    color: palette.mutedText,
    fontSize: 12,
    fontWeight: '700',
  },
  meta: {
    alignItems: 'flex-end',
    gap: 6,
  },
  linkHint: {
    color: palette.primary,
    fontSize: 12,
    fontWeight: '700',
    marginTop: 6,
  },
  inlineAction: {
    alignSelf: 'flex-start',
    backgroundColor: palette.primarySoft,
    borderRadius: 999,
    marginTop: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  inlineActionLabel: {
    color: palette.primary,
    fontSize: 12,
    fontWeight: '800',
  },
});
