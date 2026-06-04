import AsyncStorage from '@react-native-async-storage/async-storage';
import type { PropsWithChildren } from 'react';
import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { AppState } from 'react-native';

import { contactRequestsBackendEnabled, fetchContactRequestsFromBackend } from '@/lib/contact-requests-backend';
import { DEMO_MODE } from '@/lib/demo-mode';
import { fetchMaintenanceRowsFromBackend, maintenanceBackendEnabled } from '@/lib/maintenance-backend';
import {
  dismissNotificationInBackend,
  fetchNotificationsFromBackend,
  markNotificationReadInBackend,
  notificationsBackendEnabled,
} from '@/lib/notifications-backend';
import { fetchSupplementalChargeRowsFromBackend } from '@/lib/property-charge-configs-backend';
import { daysUntilIsoDate, fetchLedgerRowsFromBackend, getRentReminderCopy, paymentsBackendEnabled } from '@/lib/payments-backend';
import { useAccess } from '@/providers/access-provider';
import { usePrototype } from '@/providers/prototype-provider';
import type { ContactRequest, Notification } from '@/types/domain';

type NotificationsContextValue = {
  notifications: Notification[];
  unreadCount: number;
  bannerNotification: Notification | null;
  notificationsMessage: string | null;
  markNotificationRead: (notificationId: string) => Promise<void>;
  dismissNotification: (notificationId: string) => Promise<void>;
  hideBanner: (notificationId: string) => void;
  refreshNotifications: () => Promise<void>;
};

const NotificationsContext = createContext<NotificationsContextValue | undefined>(undefined);
const RENT_REMINDER_WINDOW_DAYS = 7;
const SUPPLEMENTAL_REMINDER_WINDOW_DAYS = 5;
const REPAIR_COMPLETE_WINDOW_DAYS = 30;
const NOTIFICATIONS_REFRESH_INTERVAL_MS = 15000;
const MAINTENANCE_BANNER_STORAGE_PREFIX = 'ledgerhome:maintenance-banner-seen';
const HIDDEN_DERIVED_STORAGE_PREFIX = 'ledgerhome:hidden-derived-notifications';
const ADMIN_MESSAGE_NOTIFICATION_WINDOW_DAYS = 2;

function appendUniqueId(current: string[], notificationId: string) {
  return current.includes(notificationId) ? current : [...current, notificationId];
}

function sortNotifications(items: Notification[]) {
  function priorityRank(priority?: Notification['priority']) {
    switch (priority) {
      case 'high':
        return 3;
      case 'normal':
        return 2;
      case 'low':
      default:
        return 1;
    }
  }

  function typeRank(type: Notification['type']) {
    switch (type) {
      case 'rent':
        return 4;
      case 'message':
        return 3;
      case 'maintenance':
        return 2;
      case 'lease':
        return 1;
      case 'general':
      default:
        return 0;
    }
  }

  return items
    .filter((item) => !item.dismissedAt)
    .slice()
    .sort((a, b) => {
      const priorityDelta = priorityRank(b.priority) - priorityRank(a.priority);

      if (priorityDelta !== 0) {
        return priorityDelta;
      }

      const typeDelta = typeRank(b.type) - typeRank(a.type);

      if (typeDelta !== 0) {
        return typeDelta;
      }

      return b.createdAt.localeCompare(a.createdAt);
    });
}

function dedupeNotifications(items: Notification[]) {
  const seen = new Set<string>();

  return items.filter((item) => {
    const scope = item.roleTarget ?? (item.userProfileId ? 'admin' : item.tenantId ? 'tenant' : 'global');
    const dedupeKey =
      item.entityType && item.entityId
        ? `${scope}:${item.type}:${item.entityType}:${item.entityId}`
        : `${scope}:${item.id}`;

    if (seen.has(dedupeKey)) {
      return false;
    }

    seen.add(dedupeKey);
    return true;
  });
}

function firstOfNextMonth(dateString: string) {
  const date = new Date(`${dateString}T12:00:00`);

  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return new Date(date.getFullYear(), date.getMonth() + 1, 1, 12).toISOString().slice(0, 10);
}

export function NotificationsProvider({ children }: PropsWithChildren) {
  const { currentRole, currentTenantId, isAccessLoading, isDemoMode, profile } = useAccess();
  const { data } = usePrototype();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [notificationsMessage, setNotificationsMessage] = useState<string | null>(null);
  const [hiddenBannerIds, setHiddenBannerIds] = useState<string[]>([]);
  const [hiddenNotificationIds, setHiddenNotificationIds] = useState<string[]>([]);
  const [hiddenDerivedNotificationIds, setHiddenDerivedNotificationIds] = useState<string[]>([]);
  const [maintenanceBannerSeenIds, setMaintenanceBannerSeenIds] = useState<string[]>([]);
  const visibleNotifications = useMemo(
    () =>
      notifications.filter(
        (item) =>
          !hiddenNotificationIds.includes(item.id) &&
          !(item.id.startsWith('derived-') && hiddenDerivedNotificationIds.includes(item.id))
      ),
    [hiddenDerivedNotificationIds, hiddenNotificationIds, notifications]
  );
  const maintenanceBannerStorageKey = useMemo(
    () => `${MAINTENANCE_BANNER_STORAGE_PREFIX}:${currentRole ?? 'guest'}:${profile?.id ?? currentTenantId ?? 'anonymous'}`,
    [currentRole, currentTenantId, profile?.id]
  );
  const hiddenDerivedStorageKey = useMemo(
    () => `${HIDDEN_DERIVED_STORAGE_PREFIX}:${currentRole ?? 'guest'}:${profile?.id ?? currentTenantId ?? 'anonymous'}`,
    [currentRole, currentTenantId, profile?.id]
  );

  const demoNotifications = useMemo(() => {
    if (currentRole === 'tenant') {
      return sortNotifications(data.notifications.filter((item) => item.tenantId === currentTenantId));
    }

    if (currentRole === 'admin') {
      return sortNotifications(
        data.contactRequests
          .filter((request) => !request.adminReply)
          .map((request) => ({
            id: `admin-alert-${request.id}`,
            tenantId: request.tenantId,
            roleTarget: 'admin' as const,
            type: 'message' as const,
            title: `New resident message: ${request.subject}`,
            body: request.message,
            priority: 'high' as const,
            createdAt: request.sentAt,
            updatedAt: request.updatedAt,
            readAt: null,
            dismissedAt: null,
            actionLabel: 'Open tenant record',
            routeTarget: `/tenants/${request.tenantId}`,
            entityType: 'contact_request',
            entityId: request.id,
            userProfileId: null,
          }))
      );
    }

    return [];
  }, [currentRole, currentTenantId, data.contactRequests, data.notifications]);

  function buildDerivedRentNotifications(role: NonNullable<typeof currentRole>, ledgerRows: Awaited<ReturnType<typeof fetchLedgerRowsFromBackend>>['data']) {
    const relevantRows = ledgerRows.filter((row) => {
      const balance = row.pendingAmount + row.priorBalanceAmount;
      const dueInDays = daysUntilIsoDate(row.dueDate);
      const isOverdue = row.status === 'overdue' || dueInDays < 0;
      const isDueSoon = !isOverdue && dueInDays <= RENT_REMINDER_WINDOW_DAYS;

      if (balance <= 0 || row.tenantName === 'Vacant') {
        return false;
      }

      if (role === 'tenant') {
        return row.tenantId === currentTenantId && row.status !== 'paid' && (isDueSoon || isOverdue || row.status === 'partial');
      }

      return Boolean(row.tenantId) && row.status !== 'paid' && isOverdue;
    });
    const notifications = relevantRows.map((row) => {
      const dueInDays = daysUntilIsoDate(row.dueDate);
      const isOverdue = row.status === 'overdue' || dueInDays < 0;
      const isDueSoon = !isOverdue && dueInDays <= RENT_REMINDER_WINDOW_DAYS;
      const copy = getRentReminderCopy(
        {
          ...row,
          status: isOverdue ? 'overdue' : row.status,
        },
        role === 'tenant' ? 'tenant' : 'admin'
      );
      const derivedId = `derived-rent-${role}-${isOverdue ? 'overdue' : isDueSoon ? 'due-soon' : 'active'}-${row.chargeId}`;
      const title =
        role === 'tenant'
          ? isOverdue
            ? `Rent overdue for ${row.unitLabel}`
            : dueInDays === 0
              ? `Monthly rent due today`
              : `Monthly rent payment pending`
          : isOverdue
            ? `Notify tenant: ${row.tenantName}`
            : `Balance reminder: ${row.tenantName}`;
      const body =
        isDueSoon && !isOverdue
          ? role === 'tenant'
            ? `Your balance of ${formatCurrency(row.pendingAmount + row.priorBalanceAmount)} is due ${dueInDays === 0 ? 'today' : `in ${dueInDays} day${dueInDays === 1 ? '' : 's'}`}.`
            : `${row.tenantName} at ${row.propertyName} ${row.unitLabel} has ${formatCurrency(
                row.pendingAmount + row.priorBalanceAmount
              )} due ${dueInDays === 0 ? 'today' : `in ${dueInDays} day${dueInDays === 1 ? '' : 's'}`}.`
          : copy.body;

      return {
        id: derivedId,
        tenantId: role === 'tenant' ? currentTenantId ?? null : null,
        userProfileId: role === 'admin' ? profile?.id ?? null : null,
        roleTarget: role,
        type: 'rent' as const,
        title,
        body,
        priority:
          role === 'tenant'
            ? isOverdue || row.status === 'partial'
              ? ('high' as const)
              : ('low' as const)
            : isOverdue || isDueSoon || row.status === 'partial'
              ? ('high' as const)
              : ('normal' as const),
        createdAt: row.dueDate,
        updatedAt: row.lastPaymentDate ?? row.dueDate,
        readAt: null,
        dismissedAt: null,
        actionLabel: role === 'tenant' ? 'Open rent' : 'Notify tenant',
        routeTarget:
          role === 'tenant'
            ? '/(tenant)/(tabs)/ledger'
            : row.tenantId
              ? `/tenants/${row.tenantId}`
              : '/(admin)/(tabs)/payments',
        entityType: 'rent_charge',
        entityId: row.chargeId,
      } satisfies Notification;
    });

    if (role !== 'tenant' || relevantRows.length > 0 || !currentTenantId) {
      return notifications;
    }

    const tenantRows = ledgerRows
      .filter((row) => row.tenantId === currentTenantId)
      .sort((a, b) => b.dueDate.localeCompare(a.dueDate));
    const latestPaidRow = tenantRows.find((row) => row.status === 'paid');
    const nextDueDate = latestPaidRow ? firstOfNextMonth(latestPaidRow.dueDate) : null;

    if (!latestPaidRow || !nextDueDate) {
      return notifications;
    }

    const dueInDays = daysUntilIsoDate(nextDueDate);

    if (dueInDays > RENT_REMINDER_WINDOW_DAYS) {
      return notifications;
    }

    const isOverdue = dueInDays < 0;
    const fallbackBalance = latestPaidRow.expectedAmount;

    return [
      ...notifications,
      {
        id: `derived-rent-tenant-fallback-${currentTenantId}-${nextDueDate}`,
        tenantId: currentTenantId,
        userProfileId: null,
        roleTarget: 'tenant' as const,
        type: 'rent' as const,
        title: isOverdue ? `Rent overdue for ${latestPaidRow.unitLabel}` : 'Monthly rent payment pending',
        body: isOverdue
          ? `Your rent balance of ${formatCurrency(fallbackBalance)} is overdue. Review Rent & Payments and contact admin if you need help.`
          : `Your next rent payment of ${formatCurrency(fallbackBalance)} is due ${dueInDays === 0 ? 'today' : `in ${dueInDays} day${dueInDays === 1 ? '' : 's'}`}.`,
        priority: isOverdue ? ('high' as const) : ('low' as const),
        createdAt: nextDueDate,
        updatedAt: nextDueDate,
        readAt: null,
        dismissedAt: null,
        actionLabel: 'Open rent',
        routeTarget: '/(tenant)/(tabs)/ledger',
        entityType: 'rent_charge',
        entityId: `fallback-${currentTenantId}-${nextDueDate}`,
      } satisfies Notification,
    ];
  }

  function buildDerivedMaintenanceNotifications(
    role: NonNullable<typeof currentRole>,
    maintenanceRows: Awaited<ReturnType<typeof fetchMaintenanceRowsFromBackend>>['data']
  ) {
    const relevantRows = maintenanceRows.filter((row) => {
      if (role === 'tenant') {
        const completedRecently =
          row.status === 'completed' && daysSinceIsoDate(row.serviceDate) <= REPAIR_COMPLETE_WINDOW_DAYS;
        return row.tenantId === currentTenantId && (row.status === 'in_progress' || row.status === 'deferred' || completedRecently);
      }

      return row.status === 'open' || row.status === 'in_progress' || row.status === 'deferred';
    });

    return relevantRows.map((row) => {
      const derivedId = `derived-maintenance-${role}-${row.id}`;
      const isOpenRequest = row.status === 'open';
      const isComplete = row.status === 'completed';
      const title =
        role === 'admin'
          ? isOpenRequest
            ? `New repair request: ${row.title}`
            : `Repair follow-up: ${row.title}`
          : isComplete
            ? `Repair complete: ${row.title}`
            : `Repair in process: ${row.title}`;
      const body =
        role === 'admin'
          ? `${row.propertyName} • ${row.unitLabel} • ${row.note}`
          : `${row.propertyName} • ${row.unitLabel} • ${row.note}`;

      return {
        id: derivedId,
        tenantId: role === 'tenant' ? currentTenantId ?? null : row.tenantId ?? null,
        userProfileId: role === 'admin' ? profile?.id ?? null : null,
        roleTarget: role,
        type: 'maintenance' as const,
        title,
        body,
        priority: isComplete ? ('low' as const) : ('normal' as const),
        createdAt: row.serviceDate,
        updatedAt: row.nextActionDate ?? row.serviceDate ?? null,
        readAt: null,
        dismissedAt: null,
        actionLabel: 'Open repairs',
        routeTarget: role === 'tenant' ? '/(tenant)/(tabs)/maintenance' : '/(admin)/(tabs)/maintenance',
        entityType: 'maintenance_request',
        entityId: row.id,
      } satisfies Notification;
    });
  }

  function buildDerivedSupplementalNotifications(
    role: NonNullable<typeof currentRole>,
    chargeRows: Awaited<ReturnType<typeof fetchSupplementalChargeRowsFromBackend>>['data']
  ) {
      const relevantRows = chargeRows.filter((row) => {
      const dueInDays = daysUntilIsoDate(row.dueDate);
      const isOverdue = row.status === 'overdue' || dueInDays < 0;

      if (row.pendingAmount <= 0 || row.tenantName === 'Unassigned') {
        return false;
      }

      if (role === 'tenant') {
        return row.tenantId === currentTenantId && dueInDays <= SUPPLEMENTAL_REMINDER_WINDOW_DAYS;
      }

      return Boolean(row.tenantId) && isOverdue;
    });

    return relevantRows.map((row) => {
      const dueInDays = daysUntilIsoDate(row.dueDate);
      const isOverdue = row.status === 'overdue' || dueInDays < 0;
      const isDueSoon = !isOverdue && dueInDays <= SUPPLEMENTAL_REMINDER_WINDOW_DAYS;
      const title =
        role === 'tenant'
          ? isOverdue
            ? `${row.description} overdue for ${row.unitLabel}`
            : dueInDays === 0
              ? `${row.description} due today for ${row.unitLabel}`
              : `${row.description} due soon for ${row.unitLabel}`
          : isOverdue
            ? `Notify tenant: ${row.tenantName}`
            : `${row.description} follow-up: ${row.tenantName}`;
      const body =
        role === 'tenant'
          ? `Your ${row.description.toLowerCase()} balance of ${formatCurrency(row.pendingAmount)} is ${
              dueInDays === 0 ? 'due today' : isOverdue ? 'overdue' : `due in ${dueInDays} day${dueInDays === 1 ? '' : 's'}`
            }. Review Rent & Payments for the full bill.`
          : `${row.tenantName} at ${row.propertyName} ${row.unitLabel} has ${formatCurrency(row.pendingAmount)} outstanding for ${row.description.toLowerCase()}.`;

      return {
        id: `derived-fee-${role}-${isOverdue ? 'overdue' : 'due-soon'}-${row.chargeId}`,
        tenantId: role === 'tenant' ? currentTenantId ?? null : row.tenantId,
        userProfileId: role === 'admin' ? profile?.id ?? null : null,
        roleTarget: role,
        type: 'rent' as const,
        title,
        body,
        priority: isOverdue || isDueSoon ? ('high' as const) : ('normal' as const),
        createdAt: row.dueDate,
        updatedAt: row.dueDate,
        readAt: null,
        dismissedAt: null,
        actionLabel: role === 'tenant' ? 'Open rent' : 'Notify tenant',
        routeTarget: role === 'tenant' ? '/(tenant)/(tabs)/ledger' : row.tenantId ? `/tenants/${row.tenantId}` : '/(admin)/(tabs)/payments',
        entityType: 'rent_charge',
        entityId: row.chargeId,
      } satisfies Notification;
    });
  }

  function buildDerivedContactNotifications(
    role: NonNullable<typeof currentRole>,
    requests: ContactRequest[]
  ) {
    if (role === 'admin') {
      return requests
        .filter((request) => {
          if (request.senderRole !== 'tenant' || request.status === 'responded' || request.adminReply) {
            return false;
          }

          return daysSinceIsoDate(request.sentAt) <= ADMIN_MESSAGE_NOTIFICATION_WINDOW_DAYS;
        })
        .map((request) => ({
          id: `derived-contact-admin-${request.id}`,
          tenantId: request.tenantId,
          userProfileId: profile?.id ?? null,
          roleTarget: 'admin' as const,
          type: 'message' as const,
          title: `Resident message: ${request.subject}`,
          body: request.message,
          priority: 'normal' as const,
          createdAt: request.sentAt,
          updatedAt: request.updatedAt,
          readAt: null,
          dismissedAt: null,
          actionLabel: 'Open tenant record',
          routeTarget: `/tenants/${request.tenantId}`,
          entityType: 'contact_request',
          entityId: request.id,
        } satisfies Notification));
    }

    if (role === 'tenant') {
      return requests
        .filter((request) => request.tenantId === currentTenantId && Boolean(request.adminReply))
        .map((request) => ({
          id: `derived-contact-tenant-reply-${request.id}`,
          tenantId: request.tenantId,
          userProfileId: null,
          roleTarget: 'tenant' as const,
          type: 'message' as const,
          title: `Admin replied: ${request.subject}`,
          body: request.adminReply ?? '',
          priority: 'normal' as const,
          createdAt: request.respondedAt ?? request.updatedAt ?? request.sentAt,
          updatedAt: request.updatedAt,
          readAt: null,
          dismissedAt: null,
          actionLabel: 'Open contact thread',
          routeTarget: '/(tenant)/contact-admin',
          entityType: 'contact_request',
          entityId: request.id,
        } satisfies Notification));
    }

    return [];
  }

  function formatStatusWord(status: string) {
    return status.replace('_', ' ');
  }

  function daysSinceIsoDate(value: string | null) {
    if (!value) {
      return Number.POSITIVE_INFINITY;
    }

    const date = new Date(`${value}T12:00:00`);

    if (Number.isNaN(date.getTime())) {
      return Number.POSITIVE_INFINITY;
    }

    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 12);
    return Math.floor((startOfToday.getTime() - date.getTime()) / 86_400_000);
  }

  async function persistMaintenanceBannerSeen(ids: string[]) {
    try {
      await AsyncStorage.setItem(maintenanceBannerStorageKey, JSON.stringify(ids));
    } catch {
      // Ignore local persistence failures; banner behavior should not break notifications.
    }
  }

  async function persistHiddenDerivedNotificationIds(ids: string[]) {
    try {
      await AsyncStorage.setItem(hiddenDerivedStorageKey, JSON.stringify(ids));
    } catch {
      // Ignore local persistence failures; notification rendering should still work.
    }
  }

  function markMaintenanceBannerSeen(notificationId: string) {
    setMaintenanceBannerSeenIds((current) => {
      if (current.includes(notificationId)) {
        return current;
      }

      const next = [...current, notificationId];
      void persistMaintenanceBannerSeen(next);
      return next;
    });
  }

  const refreshNotifications = async () => {
    if (isDemoMode || DEMO_MODE) {
      setNotifications(demoNotifications);
      setNotificationsMessage(null);
      return;
    }

    if (isAccessLoading || !currentRole) {
      return;
    }

    const [result, ledgerResult, maintenanceResult, supplementalResult, contactResult] = await Promise.all([
      notificationsBackendEnabled()
        ? fetchNotificationsFromBackend({
            role: currentRole,
            tenantId: currentTenantId,
            userProfileId: profile?.id,
          })
        : Promise.resolve({ data: [] as Notification[], error: notificationsBackendEnabled() ? null : 'Stored notifications are unavailable right now.' }),
      paymentsBackendEnabled() ? fetchLedgerRowsFromBackend() : Promise.resolve({ data: [], error: null }),
      maintenanceBackendEnabled() ? fetchMaintenanceRowsFromBackend() : Promise.resolve({ data: [], error: null }),
      paymentsBackendEnabled() ? fetchSupplementalChargeRowsFromBackend({ tenantId: currentRole === 'tenant' ? currentTenantId ?? undefined : undefined }) : Promise.resolve({ data: [], error: null }),
      contactRequestsBackendEnabled()
        ? fetchContactRequestsFromBackend(currentRole === 'tenant' ? { tenantId: currentTenantId ?? undefined } : undefined)
        : Promise.resolve({ data: [] as ContactRequest[], error: null }),
    ]);

    const derivedRentNotifications = ledgerResult.error ? [] : buildDerivedRentNotifications(currentRole, ledgerResult.data);
    const derivedMaintenanceNotifications = maintenanceResult.error
      ? []
      : buildDerivedMaintenanceNotifications(currentRole, maintenanceResult.data);
    const derivedSupplementalNotifications = supplementalResult.error
      ? []
      : buildDerivedSupplementalNotifications(currentRole, supplementalResult.data);
    const derivedContactNotifications = contactResult.error
      ? []
      : buildDerivedContactNotifications(currentRole, contactResult.data);
    const combinedNotifications = sortNotifications(dedupeNotifications([
      ...result.data,
      ...derivedRentNotifications,
      ...derivedSupplementalNotifications,
      ...derivedMaintenanceNotifications,
      ...derivedContactNotifications,
    ]));
    const activeDerivedIds = new Set(
      combinedNotifications.filter((item) => item.id.startsWith('derived-')).map((item) => item.id)
    );
    const anyRefreshError = Boolean(result.error || ledgerResult.error || maintenanceResult.error || supplementalResult.error || contactResult.error);

    setHiddenDerivedNotificationIds((current) => {
      const next = current.filter((id) => activeDerivedIds.has(id));

      if (next.length !== current.length) {
        void persistHiddenDerivedNotificationIds(next);
      }

      return next;
    });

    if (anyRefreshError && combinedNotifications.length === 0) {
      setNotificationsMessage(result.error ?? ledgerResult.error ?? supplementalResult.error ?? maintenanceResult.error ?? contactResult.error ?? null);
      return;
    }

    setNotifications(combinedNotifications);

    if (combinedNotifications.length > 0) {
      setNotificationsMessage(
        result.error &&
          derivedRentNotifications.length +
            derivedMaintenanceNotifications.length +
            derivedSupplementalNotifications.length +
            derivedContactNotifications.length >
            0
          ? result.error
          : null
      );
      return;
    }

    if (result.error) {
      setNotificationsMessage(result.error);
      return;
    }

    if (ledgerResult.error || maintenanceResult.error || supplementalResult.error || contactResult.error) {
      setNotificationsMessage(ledgerResult.error ?? supplementalResult.error ?? maintenanceResult.error ?? contactResult.error ?? null);
      return;
    }

    setNotificationsMessage(null);
  };

  useEffect(() => {
    void refreshNotifications();
  }, [currentRole, currentTenantId, isAccessLoading, isDemoMode, profile?.id, demoNotifications]);

  useEffect(() => {
    if (!currentRole) {
      setHiddenBannerIds([]);
      setHiddenNotificationIds([]);
      setHiddenDerivedNotificationIds([]);
      setMaintenanceBannerSeenIds([]);
    }
  }, [currentRole]);

  useEffect(() => {
    let isActive = true;

    async function loadMaintenanceBannerSeenIds() {
      try {
        const stored = await AsyncStorage.getItem(maintenanceBannerStorageKey);

        if (!isActive) {
          return;
        }

        if (!stored) {
          setMaintenanceBannerSeenIds([]);
          return;
        }

        const parsed = JSON.parse(stored);
        setMaintenanceBannerSeenIds(Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === 'string') : []);
      } catch {
        if (isActive) {
          setMaintenanceBannerSeenIds([]);
        }
      }
    }

    void loadMaintenanceBannerSeenIds();

    return () => {
      isActive = false;
    };
  }, [maintenanceBannerStorageKey]);

  useEffect(() => {
    let isActive = true;

    async function loadHiddenDerivedIds() {
      try {
        const stored = await AsyncStorage.getItem(hiddenDerivedStorageKey);

        if (!isActive) {
          return;
        }

        if (!stored) {
          setHiddenDerivedNotificationIds([]);
          return;
        }

        const parsed = JSON.parse(stored);
        setHiddenDerivedNotificationIds(Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === 'string') : []);
      } catch {
        if (isActive) {
          setHiddenDerivedNotificationIds([]);
        }
      }
    }

    void loadHiddenDerivedIds();

    return () => {
      isActive = false;
    };
  }, [hiddenDerivedStorageKey]);

  useEffect(() => {
    if (isDemoMode || DEMO_MODE || !currentRole) {
      return;
    }

    const intervalId = setInterval(() => {
      void refreshNotifications();
    }, NOTIFICATIONS_REFRESH_INTERVAL_MS);

    return () => clearInterval(intervalId);
  }, [currentRole, currentTenantId, isDemoMode, profile?.id]);

  useEffect(() => {
    if (isDemoMode || DEMO_MODE || !currentRole) {
      return;
    }

    const subscription = AppState.addEventListener('change', (nextState) => {
      if (nextState === 'active') {
        void refreshNotifications();
      }
    });

    return () => subscription.remove();
  }, [currentRole, currentTenantId, isDemoMode, profile?.id]);

  const bannerNotification = useMemo(
    () => {
      const visibleItems = notifications.filter(
        (item) => !item.readAt && !hiddenBannerIds.includes(item.id) && !item.dismissedAt
      );

      const urgentPrimary =
        visibleItems.find(
          (item) => item.priority === 'high' && (item.type === 'rent' || item.type === 'message')
        ) ?? null;

      if (urgentPrimary) {
        return urgentPrimary;
      }

      if (currentRole === 'admin') {
        return (
          visibleItems.find(
            (item) =>
              item.type === 'maintenance' &&
              !maintenanceBannerSeenIds.includes(item.id)
          ) ?? null
        );
      }

      return null;
    },
    [currentRole, hiddenBannerIds, maintenanceBannerSeenIds, notifications]
  );

  useEffect(() => {
    if (!bannerNotification) {
      return;
    }

    if (bannerNotification.type === 'maintenance') {
      markMaintenanceBannerSeen(bannerNotification.id);
    }

    const timeoutMs =
      bannerNotification.priority === 'high'
        ? 8500
        : bannerNotification.priority === 'low'
          ? 5000
          : 6500;
    const timeoutId = setTimeout(() => {
      setHiddenBannerIds((current) => appendUniqueId(current, bannerNotification.id));
    }, timeoutMs);

    return () => clearTimeout(timeoutId);
  }, [bannerNotification?.id, bannerNotification?.priority]);

  const value = useMemo<NotificationsContextValue>(
    () => ({
      notifications: visibleNotifications,
      unreadCount: visibleNotifications.filter((item) => !item.readAt).length,
      bannerNotification,
      notificationsMessage,
      markNotificationRead: async (notificationId) => {
        if (notificationId.startsWith('derived-')) {
          const timestamp = new Date().toISOString();
          setNotifications((current) =>
            current.map((item) =>
              item.id === notificationId ? { ...item, readAt: item.readAt ?? timestamp } : item
            )
          );
          return;
        }

        setNotifications((current) =>
          current.map((item) =>
            item.id === notificationId ? { ...item, readAt: item.readAt ?? new Date().toISOString() } : item
          )
        );

        if (!isDemoMode && !DEMO_MODE && notificationsBackendEnabled()) {
          await markNotificationReadInBackend(notificationId);
        }
      },
      dismissNotification: async (notificationId) => {
        setHiddenBannerIds((current) => appendUniqueId(current, notificationId));
        setHiddenNotificationIds((current) => appendUniqueId(current, notificationId));

        const notification = notifications.find((item) => item.id === notificationId);

        if (notification?.type === 'maintenance') {
          markMaintenanceBannerSeen(notificationId);
        }

        if (notificationId.startsWith('derived-')) {
          const timestamp = new Date().toISOString();
          setHiddenDerivedNotificationIds((current) => {
            const next = appendUniqueId(current, notificationId);
            void persistHiddenDerivedNotificationIds(next);
            return next;
          });
          setNotifications((current) =>
            current.map((item) =>
              item.id === notificationId
                ? { ...item, readAt: item.readAt ?? timestamp, dismissedAt: item.dismissedAt ?? timestamp }
                : item
            )
          );
          return;
        }

        const timestamp = new Date().toISOString();

        if (notification?.type === 'message') {
          setNotifications((current) =>
            current.map((item) =>
              item.id === notificationId
                ? { ...item, readAt: item.readAt ?? timestamp, dismissedAt: item.dismissedAt ?? timestamp }
                : item
            )
          );

          if (!isDemoMode && !DEMO_MODE && notificationsBackendEnabled()) {
            await markNotificationReadInBackend(notificationId);
          }

          return;
        }

        setNotifications((current) =>
          current.map((item) =>
            item.id === notificationId ? { ...item, dismissedAt: timestamp } : item
          )
        );

        if (!isDemoMode && !DEMO_MODE && notificationsBackendEnabled()) {
          await dismissNotificationInBackend(notificationId);
        }
      },
      hideBanner: (notificationId) => {
        setHiddenBannerIds((current) => appendUniqueId(current, notificationId));
        const notification = notifications.find((item) => item.id === notificationId);

        if (notification?.type === 'maintenance') {
          markMaintenanceBannerSeen(notificationId);
        }
      },
      refreshNotifications,
    }),
    [bannerNotification, isDemoMode, notifications, notificationsMessage, visibleNotifications]
  );

  return <NotificationsContext.Provider value={value}>{children}</NotificationsContext.Provider>;
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(value);
}

export function useNotifications() {
  const context = useContext(NotificationsContext);

  if (!context) {
    throw new Error('useNotifications must be used within a NotificationsProvider.');
  }

  return context;
}
