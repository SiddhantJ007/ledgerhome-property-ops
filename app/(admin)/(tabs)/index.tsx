import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect, useRouter, type Href } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { MetricCard } from '@/components/metric-card';
import { DashboardNotificationTray } from '@/components/dashboard-notification-tray';
import { InAppNotificationBanner } from '@/components/in-app-notification-banner';
import { ScreenContainer } from '@/components/screen-container';
import { SectionCard } from '@/components/section-card';
import { StatusBadge, maintenanceStatusTone, rentStatusTone } from '@/components/status-badge';
import { contactRequestsBackendEnabled, fetchContactRequestsFromBackend } from '@/lib/contact-requests-backend';
import { DEMO_MODE } from '@/lib/demo-mode';
import { fetchMaintenanceRowsFromBackend, maintenanceBackendEnabled } from '@/lib/maintenance-backend';
import { createNotificationInBackend, notificationsBackendEnabled } from '@/lib/notifications-backend';
import { fetchLedgerRowsFromBackend, paymentsBackendEnabled } from '@/lib/payments-backend';
import {
  fetchPropertyChargeConfigsFromBackend,
  fetchSupplementalChargeRowsFromBackend,
  monthlyEquivalentAmount,
} from '@/lib/property-charge-configs-backend';
import { formatCurrency, formatShortDate, getTodayDateString } from '@/lib/prototype-ledger';
import { commonStyles, palette } from '@/lib/theme';
import { useAccess } from '@/providers/access-provider';
import { useAuth } from '@/providers/auth-provider';
import { useMasterData } from '@/providers/master-data-provider';
import { useNotifications } from '@/providers/notifications-provider';
import { usePrototype } from '@/providers/prototype-provider';
import type { ContactRequest, LedgerRow, MaintenanceRow, PropertyChargeConfig, SupplementalChargeRow } from '@/types/domain';

const OPENED_MESSAGE_STORAGE_PREFIX = 'ledgerhome:admin-opened-messages';
const MESSAGE_VISIBILITY_WINDOW_MS = 2 * 24 * 60 * 60 * 1000;

function isWithinVisibilityWindow(value: string | null | undefined) {
  if (!value) {
    return false;
  }

  const timestamp = new Date(value).getTime();
  return !Number.isNaN(timestamp) && Date.now() - timestamp <= MESSAGE_VISIBILITY_WINDOW_MS;
}

export default function DashboardScreen() {
  const router = useRouter();
  const { profile } = useAccess();
  const { isAuthenticated, isLoading: isAuthLoading } = useAuth();
  const { data, masterDataMessage } = useMasterData();
  const { notifications, unreadCount, markNotificationRead, dismissNotification, refreshNotifications } = useNotifications();
  const { dashboard, recentActivity, reminders } = usePrototype();
  const [backendRequests, setBackendRequests] = useState<ContactRequest[] | null>(null);
  const [backendLedgerRows, setBackendLedgerRows] = useState<LedgerRow[] | null>(null);
  const [backendMaintenanceRows, setBackendMaintenanceRows] = useState<MaintenanceRow[] | null>(null);
  const [propertyChargeConfigs, setPropertyChargeConfigs] = useState<PropertyChargeConfig[] | null>(null);
  const [backendSupplementalCharges, setBackendSupplementalCharges] = useState<SupplementalChargeRow[] | null>(null);
  const [openedInquiryIds, setOpenedInquiryIds] = useState<Record<string, string>>({});
  const [alertActionMessage, setAlertActionMessage] = useState<Record<string, string>>({});
  const openedMessageStorageKey = `${OPENED_MESSAGE_STORAGE_PREFIX}:${profile?.id ?? 'admin'}`;

  useEffect(() => {
    let isActive = true;

    async function loadOpenedMessages() {
      try {
        const stored = await AsyncStorage.getItem(openedMessageStorageKey);

        if (!isActive) {
          return;
        }

        if (!stored) {
          setOpenedInquiryIds({});
          return;
        }

        const parsed = JSON.parse(stored) as Record<string, string>;
        const cleaned = Object.fromEntries(
          Object.entries(parsed ?? {}).filter(([, openedAt]) => isWithinVisibilityWindow(openedAt))
        );
        setOpenedInquiryIds(cleaned);

        if (Object.keys(cleaned).length !== Object.keys(parsed ?? {}).length) {
          await AsyncStorage.setItem(openedMessageStorageKey, JSON.stringify(cleaned));
        }
      } catch {
        if (isActive) {
          setOpenedInquiryIds({});
        }
      }
    }

    void loadOpenedMessages();

    return () => {
      isActive = false;
    };
  }, [openedMessageStorageKey]);

  useEffect(() => {
    void AsyncStorage.setItem(openedMessageStorageKey, JSON.stringify(openedInquiryIds));
  }, [openedInquiryIds, openedMessageStorageKey]);

  const loadDashboardData = useCallback(async () => {
    if (DEMO_MODE) {
      return;
    }

    if (isAuthLoading || !isAuthenticated) {
      return;
    }

    const [requestsResult, ledgerResult, maintenanceResult, propertyChargeConfigsResult, supplementalChargesResult] = await Promise.all([
      contactRequestsBackendEnabled() ? fetchContactRequestsFromBackend() : Promise.resolve({ data: [], error: null }),
      paymentsBackendEnabled() ? fetchLedgerRowsFromBackend() : Promise.resolve({ data: [], error: null }),
      maintenanceBackendEnabled() ? fetchMaintenanceRowsFromBackend() : Promise.resolve({ data: [], error: null }),
      fetchPropertyChargeConfigsFromBackend(),
      fetchSupplementalChargeRowsFromBackend(),
    ]);

    if (!requestsResult.error) {
      setBackendRequests(requestsResult.data);
    }

    if (!ledgerResult.error) {
      setBackendLedgerRows(ledgerResult.data);
    }

    if (!maintenanceResult.error) {
      setBackendMaintenanceRows(maintenanceResult.data);
    }

    if (!propertyChargeConfigsResult.error) {
      setPropertyChargeConfigs(propertyChargeConfigsResult.data);
    }

    if (!supplementalChargesResult.error) {
      setBackendSupplementalCharges(supplementalChargesResult.data);
    }
  }, [isAuthLoading, isAuthenticated]);

  useEffect(() => {
    let isActive = true;

    void (async () => {
      await loadDashboardData();
      if (!isActive) {
        return;
      }
    })();

    return () => {
      isActive = false;
    };
  }, [isAuthenticated, isAuthLoading, loadDashboardData]);

  useFocusEffect(
    useCallback(() => {
      void loadDashboardData();
      return undefined;
    }, [loadDashboardData])
  );

  const residentMessages = useMemo(() => {
    const requests = (DEMO_MODE ? data.contactRequests : backendRequests ?? [])
      .filter((request) => request.status !== 'responded' && !request.adminReply)
      .filter((request) => isWithinVisibilityWindow(request.sentAt))
      .filter((request) => !openedInquiryIds[request.id])
      .sort((a, b) => b.sentAt.localeCompare(a.sentAt))
      .slice(0, 4);

    return requests.map((request) => {
      const tenant = data.tenants.find((item) => item.id === request.tenantId);
      const unit = data.units.find((item) => item.id === request.unitId);
      const property = data.properties.find((item) => item.id === request.propertyId);

      return {
        ...request,
        tenantName: tenant?.fullName ?? 'Resident',
        unitLabel: unit?.label ?? 'Unit',
        propertyName: property?.name ?? 'Property',
      };
    });
  }, [backendRequests, data.contactRequests, data.properties, data.tenants, data.units, openedInquiryIds]);

  const summary = useMemo(() => {
    if (DEMO_MODE) {
      return {
        ...dashboard,
        configuredPropertyCosts: 0,
        supplementalPendingAmount: 0,
        supplementalOverdueCount: 0,
        rentOutstandingAmount: dashboard.pendingAmount,
        totalToCollectAmount: dashboard.pendingAmount,
      };
    }

    const ledgerRows = backendLedgerRows ?? [];
    const maintenanceRows = backendMaintenanceRows ?? [];
    const currentMonth = getTodayDateString().slice(0, 7);
    const seenPaymentIds = new Set<string>();
    const collectedThisMonth = ledgerRows.reduce((sum, row) => {
      return (
        sum +
        row.recentPayments.reduce((paymentSum, payment) => {
          if (!payment.id || seenPaymentIds.has(payment.id) || !payment.paymentDate.startsWith(currentMonth)) {
            return paymentSum;
          }

          seenPaymentIds.add(payment.id);
          return paymentSum + payment.amount;
        }, 0)
      );
    }, 0);
    const dueNowOutstanding = ledgerRows.reduce(
      (sum, row) => sum + (row.dueDate <= getTodayDateString() ? row.pendingAmount + row.priorBalanceAmount : 0),
      0
    );

    return {
      totalProperties: data.properties.length,
      totalUnits: data.units.length,
      occupiedUnits: data.units.filter((unit) => unit.occupancyStatus === 'occupied').length,
      vacantUnits: data.units.filter((unit) => unit.occupancyStatus !== 'occupied').length,
      expectedMonthlyRent: ledgerRows.reduce((sum, row) => sum + row.expectedAmount, 0),
      collectedThisMonth,
      pendingAmount: dueNowOutstanding,
      rentOutstandingAmount: dueNowOutstanding,
      overdueCount: ledgerRows.filter((row) => row.status === 'overdue' && row.dueDate <= getTodayDateString()).length,
      openMaintenanceCount: maintenanceRows.filter(
        (row) => row.status === 'open' || row.status === 'in_progress' || row.status === 'deferred'
      ).length,
      completedMaintenanceCount: maintenanceRows.filter((row) => row.status === 'completed').length,
      supplementalPendingAmount: (backendSupplementalCharges ?? []).reduce((sum, row) => sum + row.pendingAmount, 0),
      supplementalOverdueCount: (backendSupplementalCharges ?? []).filter((row) => row.status === 'overdue').length,
      totalToCollectAmount:
        dueNowOutstanding + (backendSupplementalCharges ?? []).reduce((sum, row) => sum + row.pendingAmount, 0),
      configuredPropertyCosts: (propertyChargeConfigs ?? [])
        .filter((item) => item.isActive)
        .reduce((sum, item) => sum + monthlyEquivalentAmount(item), 0),
    };
  }, [backendLedgerRows, backendMaintenanceRows, backendSupplementalCharges, dashboard, data.properties.length, data.units, propertyChargeConfigs]);

  const portfolioPulseCards = useMemo(() => {
    if (DEMO_MODE) {
      return data.properties.map((property) => {
        const units = data.units.filter((unit) => unit.propertyId === property.id);
        return {
          id: property.id,
          name: property.name,
          totalUnits: units.length,
          occupiedUnits: units.filter((unit) => unit.occupancyStatus === 'occupied').length,
          expectedRent: dashboard.expectedMonthlyRent,
          overdueCount: dashboard.overdueCount,
        };
      });
    }

    return data.properties.map((property) => {
      const units = data.units.filter((unit) => unit.propertyId === property.id);
      const rows = (backendLedgerRows ?? []).filter((row) => row.propertyId === property.id);

      return {
        id: property.id,
        name: property.name,
        totalUnits: units.length,
        occupiedUnits: units.filter((unit) => unit.occupancyStatus === 'occupied').length,
        expectedRent: rows.reduce((sum, row) => sum + row.expectedAmount, 0),
        overdueCount: rows.filter((row) => row.status === 'overdue').length,
      };
    });
  }, [backendLedgerRows, dashboard.expectedMonthlyRent, dashboard.overdueCount, data.properties, data.units]);

  const effectiveRecentActivity = useMemo(() => {
    if (DEMO_MODE) {
      return recentActivity;
    }

    const paymentItems =
      (backendLedgerRows ?? [])
        .flatMap((row) =>
          row.recentPayments.slice(0, 1).map((payment) => ({
            id: payment.id,
            kind: 'payment' as const,
            title: `${row.propertyName} • ${row.unitLabel}`,
            detail: payment.note || payment.method,
            amountLabel: formatCurrency(payment.amount),
            date: payment.paymentDate,
          }))
        );

    const maintenanceItems =
      (backendMaintenanceRows ?? []).slice(0, 3).map((row) => ({
        id: row.id,
        kind: 'maintenance' as const,
        title: `${row.propertyName} • ${row.title}`,
        detail: row.note,
        amountLabel: row.cost ? formatCurrency(row.cost) : undefined,
        date: row.nextActionDate ?? row.serviceDate,
      }));

    return [...paymentItems, ...maintenanceItems]
      .sort((a, b) => b.date.localeCompare(a.date))
      .slice(0, 6);
  }, [backendLedgerRows, backendMaintenanceRows, recentActivity]);

  const effectiveReminders = useMemo(() => {
    if (DEMO_MODE) {
      return reminders.map((item) => ({ ...item, kind: item.title.toLowerCase().includes('maintenance') ? 'maintenance' as const : 'payment' as const }));
    }

    const chargeReminders = (backendLedgerRows ?? [])
      .filter((row) => row.status === 'overdue' || row.status === 'partial')
      .map((row) => ({
        id: row.chargeId,
        title: `${row.propertyName} • ${row.unitLabel}`,
        detail: `${row.status} balance of ${formatCurrency(row.pendingAmount + row.priorBalanceAmount)}`,
        date: row.dueDate,
        kind: 'payment' as const,
      }));

    const maintenanceReminders = (backendMaintenanceRows ?? [])
      .filter((row) => row.status === 'open' || row.status === 'in_progress' || row.status === 'deferred')
      .map((row) => ({
        id: row.id,
        title: `${row.propertyName} • ${row.title}`,
        detail: `Next action: ${row.status.replace('_', ' ')}`,
        date: row.nextActionDate ?? row.serviceDate,
        kind: 'maintenance' as const,
      }));

    const supplementalReminders = (backendSupplementalCharges ?? [])
      .filter((row) => row.status === 'overdue' || row.status === 'partial' || row.status === 'pending')
      .map((row) => ({
        id: `fee-${row.chargeId}`,
        title: `${row.propertyName} • ${row.unitLabel}`,
        detail: `${row.description} ${row.status === 'overdue' ? 'overdue' : 'pending'} at ${formatCurrency(row.pendingAmount)}`,
        date: row.dueDate,
        kind: 'payment' as const,
      }));

    return [...chargeReminders, ...supplementalReminders, ...maintenanceReminders]
      .sort((a, b) => a.date.localeCompare(b.date))
      .slice(0, 5);
  }, [backendLedgerRows, backendMaintenanceRows, backendSupplementalCharges, reminders]);

  function getTenantRecordHrefForAlert(item: { entityId?: string | null; entityType?: string | null; routeTarget?: string | null }) {
    if (item.routeTarget?.startsWith('/tenants/')) {
      return item.routeTarget as Href;
    }

    if (item.entityType === 'rent_charge' && item.entityId) {
      const ledgerRow = (backendLedgerRows ?? []).find((row) => row.chargeId === item.entityId);
      if (ledgerRow?.tenantId) {
        return `/tenants/${ledgerRow.tenantId}` as Href;
      }

      const supplementalRow = (backendSupplementalCharges ?? []).find((row) => row.chargeId === item.entityId);
      if (supplementalRow?.tenantId) {
        return `/tenants/${supplementalRow.tenantId}` as Href;
      }
    }

    return null;
  }

  function getAdminDashboardRoute(kind: 'payment' | 'maintenance'): Href {
    return kind === 'payment'
      ? ('/(admin)/(tabs)/payments' as Href)
      : ('/(admin)/(tabs)/maintenance' as Href);
  }

  function getNotificationStatusLabel(item: { id: string; readAt: string | null; priority?: 'low' | 'normal' | 'high' }) {
    if (item.id.startsWith('derived-rent-') || item.id.startsWith('derived-fee-') || item.id.startsWith('derived-maintenance-')) {
      return item.priority === 'high' ? 'Action needed' : 'Active';
    }

    return item.readAt ? 'Read' : 'Unread';
  }

  function getNotificationStatusTone(item: { id: string; readAt: string | null; priority?: 'low' | 'normal' | 'high' }) {
    if (item.id.startsWith('derived-rent-') || item.id.startsWith('derived-fee-') || item.id.startsWith('derived-maintenance-')) {
      return item.priority === 'high' ? 'warning' : 'success';
    }

    return item.readAt ? 'neutral' : item.priority === 'high' ? 'warning' : 'success';
  }

  const notificationTrayItems = notifications.filter((item) => !item.dismissedAt);

  return (
    <>
      <InAppNotificationBanner />
      <ScreenContainer
      eyebrow="Operations"
      title="Dashboard"
      subtitle="Live portfolio snapshot for rent collection, occupancy, repairs, and tenant messages."
      headerAccessory={
        <DashboardNotificationTray
          notifications={notificationTrayItems}
          onOpenNotification={(item) => {
            void markNotificationRead(item.id);
          }}
          onDismissNotification={(item) => {
            void dismissNotification(item.id);
          }}
          onActionPress={async (item) => {
            if (
              item.actionLabel === 'Notify tenant' &&
              item.entityType === 'rent_charge' &&
              item.entityId &&
              notificationsBackendEnabled()
            ) {
              const ledgerRow = (backendLedgerRows ?? []).find((row) => row.chargeId === item.entityId);
              const supplementalRow = (backendSupplementalCharges ?? []).find((row) => row.chargeId === item.entityId);

              if (ledgerRow?.tenantId) {
                const tenantFirstName = ledgerRow.tenantName.split(' ')[0] || 'there';
                const outstandingAmount = formatCurrency(ledgerRow.pendingAmount + ledgerRow.priorBalanceAmount);
                const result = await createNotificationInBackend({
                  tenantId: ledgerRow.tenantId,
                  roleTarget: 'tenant',
                  type: 'message',
                  title: `Checking in about this month's rent`,
                  body: `Hey ${tenantFirstName}, hope you're doing well. Wanted to follow up regarding this month's rent for ${ledgerRow.unitLabel} at ${ledgerRow.propertyName}. There is still ${outstandingAmount} outstanding. Please review Rent & Payments when you can, and reach out if you need anything.`,
                  priority: 'normal',
                  actionLabel: 'Open rent',
                  routeTarget: '/(tenant)/(tabs)/ledger',
                  entityType: 'rent_charge',
                  entityId: ledgerRow.chargeId,
                });

                if (!result.error) {
                  await refreshNotifications();
                  return 'Tenant notified.';
                }

                return result.error ?? 'Unable to notify tenant.';
              }

              if (supplementalRow?.tenantId) {
                const tenantFirstName = supplementalRow.tenantName.split(' ')[0] || 'there';
                const outstandingAmount = formatCurrency(supplementalRow.pendingAmount);
                const result = await createNotificationInBackend({
                  tenantId: supplementalRow.tenantId,
                  roleTarget: 'tenant',
                  type: 'message',
                  title: `Checking in about ${supplementalRow.description.toLowerCase()}`,
                  body: `Hey ${tenantFirstName}, hope you're doing well. Wanted to follow up regarding ${supplementalRow.description.toLowerCase()} for ${supplementalRow.unitLabel} at ${supplementalRow.propertyName}. There is still ${outstandingAmount} outstanding. Please review Rent & Payments when you can, and let us know if you have any questions.`,
                  priority: 'normal',
                  actionLabel: 'Open rent',
                  routeTarget: '/(tenant)/(tabs)/ledger',
                  entityType: 'rent_charge',
                  entityId: supplementalRow.chargeId,
                });

                if (!result.error) {
                  await refreshNotifications();
                  return 'Tenant notified.';
                }

                return result.error ?? 'Unable to notify tenant.';
              }
            }

            return undefined;
          }}
        />
      }>
      {masterDataMessage ? <Text style={commonStyles.helperText}>{masterDataMessage}</Text> : null}
      <View style={commonStyles.grid}>
        <MetricCard
          label="Properties"
          value={`${summary.totalProperties}`}
          helper="Portfolio records"
          onPress={() => router.push('/(admin)/(tabs)/properties' as Href)}
        />
        <MetricCard
          label="Occupied units"
          value={`${summary.occupiedUnits}`}
          helper={`${summary.vacantUnits} vacant or turning`}
          onPress={() => router.push('/units' as Href)}
        />
        <MetricCard
          label="Expected rent"
          value={formatCurrency(summary.expectedMonthlyRent)}
          helper="Full charge for current cycle"
          onPress={() => router.push('/(admin)/(tabs)/payments' as Href)}
        />
        <MetricCard
          label="Amount owed"
          value={formatCurrency(summary.rentOutstandingAmount)}
          helper="Open rent balance"
          onPress={() => router.push('/(admin)/(tabs)/payments' as Href)}
        />
        <MetricCard
          label="Collected"
          value={formatCurrency(summary.collectedThisMonth)}
          helper={`${formatCurrency(summary.rentOutstandingAmount)} rent still outstanding`}
          onPress={() => router.push('/(admin)/(tabs)/payments' as Href)}
        />
        <MetricCard
          label="Overdue units"
          value={`${summary.overdueCount}`}
          helper="Priority follow-up"
          onPress={() => router.push('/(admin)/(tabs)/payments' as Href)}
        />
        <MetricCard
          label="Repairs"
          value={`${summary.openMaintenanceCount} open`}
          helper={`${summary.completedMaintenanceCount} completed this cycle`}
          onPress={() => router.push('/(admin)/(tabs)/maintenance' as Href)}
        />
      </View>

      <SectionCard title="Properties" subtitle="Tap a property to open units, tenants, rent, and repairs">
        {portfolioPulseCards.map((property) => (
          <Pressable
            key={property.id}
            onPress={() =>
              router.push({
                pathname: '/properties/[propertyId]',
                params: { propertyId: property.id },
              } as Href)
            }
            style={styles.pulseRow}>
            <View style={styles.pulseMain}>
              <Text style={styles.pulseTitle}>{property.name}</Text>
              <Text style={commonStyles.helperText}>
                {property.occupiedUnits}/{property.totalUnits} occupied • {formatCurrency(property.expectedRent)} expected
              </Text>
              <Text style={styles.linkHint}>Open property record</Text>
            </View>
            <StatusBadge
              label={property.overdueCount > 0 ? `${property.overdueCount} overdue` : 'stable'}
              tone={property.overdueCount > 0 ? rentStatusTone('overdue') : maintenanceStatusTone('completed')}
            />
          </Pressable>
        ))}
      </SectionCard>

      <SectionCard
        title="Alerts"
        collapsible
        subtitle={unreadCount > 0 ? `${unreadCount} unread notification${unreadCount === 1 ? '' : 's'}` : 'No unread notifications'}>
        {notifications.length > 0 ? (
          notifications.slice(0, 4).map((item) => (
            <View key={item.id} style={styles.messageRow}>
              <View style={styles.activityCopy}>
                <Text style={styles.activityTitle}>{item.title}</Text>
                <Text style={commonStyles.helperText}>{item.body}</Text>
                <View style={styles.inlineActionRow}>
                  {item.routeTarget ? (
                    <Pressable
                      onPress={async () => {
                        if (
                          item.actionLabel === 'Notify tenant' &&
                          item.entityType === 'rent_charge' &&
                          item.entityId &&
                          notificationsBackendEnabled()
                        ) {
                          const ledgerRow = (backendLedgerRows ?? []).find((row) => row.chargeId === item.entityId);
                          const supplementalRow = (backendSupplementalCharges ?? []).find((row) => row.chargeId === item.entityId);

                          if (ledgerRow?.tenantId) {
                            const tenantFirstName = ledgerRow.tenantName.split(' ')[0] || 'there';
                            const outstandingAmount = formatCurrency(ledgerRow.pendingAmount + ledgerRow.priorBalanceAmount);
                            const result = await createNotificationInBackend({
                              tenantId: ledgerRow.tenantId,
                              roleTarget: 'tenant',
                              type: 'message',
                              title: `Checking in about this month's rent`,
                              body: `Hey ${tenantFirstName}, hope you're doing well. Wanted to follow up regarding this month's rent for ${ledgerRow.unitLabel} at ${ledgerRow.propertyName}. There is still ${outstandingAmount} outstanding. Please review Rent & Payments when you can, and reach out if you need anything.`,
                              priority: 'normal',
                              actionLabel: 'Open rent',
                              routeTarget: '/(tenant)/(tabs)/ledger',
                              entityType: 'rent_charge',
                              entityId: ledgerRow.chargeId,
                            });

                            if (!result.error) {
                              setAlertActionMessage((current) => ({
                                ...current,
                                [item.id]: 'Tenant notified.',
                              }));
                              await refreshNotifications();
                              return;
                            }

                            setAlertActionMessage((current) => ({
                              ...current,
                              [item.id]: result.error ?? 'Unable to notify tenant.',
                            }));
                            return;
                          }

                          if (supplementalRow?.tenantId) {
                            const tenantFirstName = supplementalRow.tenantName.split(' ')[0] || 'there';
                            const outstandingAmount = formatCurrency(supplementalRow.pendingAmount);
                            const result = await createNotificationInBackend({
                              tenantId: supplementalRow.tenantId,
                              roleTarget: 'tenant',
                              type: 'message',
                              title: `Checking in about ${supplementalRow.description.toLowerCase()}`,
                              body: `Hey ${tenantFirstName}, hope you're doing well. Wanted to follow up regarding ${supplementalRow.description.toLowerCase()} for ${supplementalRow.unitLabel} at ${supplementalRow.propertyName}. There is still ${outstandingAmount} outstanding. Please review Rent & Payments when you can, and let us know if you have any questions.`,
                              priority: 'normal',
                              actionLabel: 'Open rent',
                              routeTarget: '/(tenant)/(tabs)/ledger',
                              entityType: 'rent_charge',
                              entityId: supplementalRow.chargeId,
                            });

                            if (!result.error) {
                              setAlertActionMessage((current) => ({
                                ...current,
                                [item.id]: 'Tenant notified.',
                              }));
                              await refreshNotifications();
                              return;
                            }

                            setAlertActionMessage((current) => ({
                              ...current,
                              [item.id]: result.error ?? 'Unable to notify tenant.',
                            }));
                            return;
                          }
                        }

                        void markNotificationRead(item.id);
                        if (item.routeTarget) {
                          router.push(item.routeTarget as Href);
                        }
                      }}
                      style={styles.inlineAction}>
                      <Text style={styles.inlineActionLabel}>{item.actionLabel ?? 'Open alert'}</Text>
                    </Pressable>
                  ) : null}
                  {getTenantRecordHrefForAlert(item) ? (
                    <Pressable
                      onPress={() => {
                        void markNotificationRead(item.id);
                        router.push(getTenantRecordHrefForAlert(item)!);
                      }}
                      style={styles.inlineSecondaryAction}>
                      <Text style={styles.inlineSecondaryActionLabel}>Open tenant record</Text>
                    </Pressable>
                  ) : null}
                </View>
                {alertActionMessage[item.id] ? (
                  <Text style={styles.inlineActionFeedback}>{alertActionMessage[item.id]}</Text>
                ) : null}
              </View>
              <View style={styles.activityMeta}>
                <StatusBadge
                  label={getNotificationStatusLabel(item)}
                  tone={getNotificationStatusTone(item)}
                />
                <Text style={styles.activityDate}>{formatShortDate(item.createdAt)}</Text>
              </View>
            </View>
          ))
        ) : (
          <Text style={commonStyles.helperText}>No in-app admin alerts are active right now.</Text>
        )}
      </SectionCard>

      <SectionCard title="Resident messages" subtitle="Fresh tenant questions that need admin attention" collapsible defaultCollapsed>
        {residentMessages.length > 0 ? (
          residentMessages.map((message) => (
            <Pressable
              key={message.id}
              onPress={() => {
                setOpenedInquiryIds((current) => ({
                  ...current,
                  [message.id]: new Date().toISOString(),
                }));
                router.push({
                  pathname: '/tenants/[tenantId]',
                  params: { tenantId: message.tenantId },
                } as Href);
              }}
              style={styles.messageRow}>
              <View style={styles.activityCopy}>
                <Text style={styles.activityTitle}>{message.subject}</Text>
                <Text style={commonStyles.helperText}>
                  {message.tenantName} • {message.propertyName} • {message.unitLabel}
                </Text>
                <Text style={commonStyles.helperText}>{message.message}</Text>
              </View>
              <View style={styles.activityMeta}>
                <StatusBadge
                  label={message.adminReply ? 'Replied' : 'New'}
                  tone={message.adminReply ? 'success' : 'warning'}
                />
                <Text style={styles.activityDate}>{formatShortDate(message.sentAt)}</Text>
              </View>
            </Pressable>
          ))
        ) : (
          <Text style={commonStyles.helperText}>No new resident messages are waiting on the dashboard.</Text>
        )}
      </SectionCard>

      <SectionCard title="Recent activity" subtitle="Latest rent and repair updates" collapsible defaultCollapsed>
        {effectiveRecentActivity.length > 0 ? effectiveRecentActivity.map((item) => (
          <Pressable
            key={item.id}
            onPress={() => router.push(getAdminDashboardRoute(item.kind))}
            style={styles.activityRow}>
            <View style={styles.activityCopy}>
              <Text style={styles.activityTitle}>{item.title}</Text>
              <Text style={commonStyles.helperText}>{item.detail}</Text>
              <Text style={styles.linkHint}>
                {item.kind === 'payment' ? 'Open payments' : 'Open repairs'}
              </Text>
            </View>
            <View style={styles.activityMeta}>
              {item.amountLabel ? <Text style={styles.activityAmount}>{item.amountLabel}</Text> : null}
              <Text style={styles.activityDate}>{formatShortDate(item.date)}</Text>
            </View>
          </Pressable>
        )) : (
          <Text style={commonStyles.helperText}>No recent admin activity is available yet.</Text>
        )}
      </SectionCard>

      <SectionCard title="Upcoming reminders" subtitle="Immediate follow-up items for the super admin" collapsible defaultCollapsed>
        {effectiveReminders.length > 0 ? effectiveReminders.map((reminder) => (
          <Pressable
            key={reminder.id}
            onPress={() => router.push(getAdminDashboardRoute(reminder.kind))}
            style={styles.reminderRow}>
            <View style={styles.reminderBullet} />
            <View style={styles.reminderCopy}>
              <Text style={styles.reminderTitle}>{reminder.title}</Text>
              <Text style={commonStyles.helperText}>{reminder.detail}</Text>
              <Text style={styles.linkHint}>
                {reminder.kind === 'maintenance' ? 'Open repairs' : 'Open payments'}
              </Text>
            </View>
            <Text style={styles.activityDate}>{formatShortDate(reminder.date)}</Text>
          </Pressable>
        )) : (
          <Text style={commonStyles.helperText}>No reminders are currently due.</Text>
        )}
      </SectionCard>
    </ScreenContainer>
    </>
  );
}

const styles = StyleSheet.create({
  pulseRow: {
    alignItems: 'center',
    borderBottomColor: palette.border,
    borderBottomWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 12,
  },
  pulseMain: {
    flex: 1,
    paddingRight: 12,
  },
  pulseTitle: {
    color: palette.text,
    fontSize: 15,
    fontWeight: '700',
  },
  activityRow: {
    alignItems: 'flex-start',
    borderBottomColor: palette.border,
    borderBottomWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 12,
  },
  messageRow: {
    alignItems: 'flex-start',
    backgroundColor: palette.surfaceMuted,
    borderColor: palette.border,
    borderRadius: 18,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 12,
    marginBottom: 10,
    padding: 14,
  },
  activityCopy: {
    flex: 1,
    paddingRight: 12,
  },
  activityTitle: {
    color: palette.text,
    fontSize: 15,
    fontWeight: '700',
  },
  activityMeta: {
    alignItems: 'flex-end',
    minWidth: 78,
  },
  activityAmount: {
    color: palette.text,
    fontSize: 14,
    fontWeight: '700',
  },
  activityDate: {
    color: palette.mutedText,
    fontSize: 12,
    fontWeight: '600',
    marginTop: 4,
  },
  reminderRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 10,
    paddingVertical: 10,
  },
  reminderBullet: {
    backgroundColor: palette.accent,
    borderRadius: 999,
    height: 8,
    width: 8,
  },
  reminderCopy: {
    flex: 1,
  },
  reminderTitle: {
    color: palette.text,
    fontSize: 14,
    fontWeight: '700',
  },
  linkHint: {
    color: palette.primary,
    fontSize: 12,
    fontWeight: '700',
    marginTop: 4,
  },
  inlineAction: {
    alignSelf: 'flex-start',
    backgroundColor: palette.primarySoft,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  inlineActionRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 10,
  },
  inlineActionLabel: {
    color: palette.primary,
    fontSize: 12,
    fontWeight: '800',
  },
  inlineSecondaryAction: {
    alignSelf: 'flex-start',
    backgroundColor: palette.surface,
    borderColor: palette.border,
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  inlineSecondaryActionLabel: {
    color: palette.text,
    fontSize: 12,
    fontWeight: '800',
  },
  inlineActionFeedback: {
    color: palette.primary,
    fontSize: 12,
    fontWeight: '700',
    marginTop: 8,
  },
});
