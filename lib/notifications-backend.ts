import { backendAvailableForSession, markBackendUnavailableForSession } from '@/lib/backend-availability';
import { DEMO_MODE } from '@/lib/demo-mode';
import { runtimeAuthSessionAvailable } from '@/lib/runtime-auth-state';
import { supabase, supabaseConfigError } from '@/lib/supabase';
import type { AppRole, Notification, NotificationPriority, NotificationType } from '@/types/domain';

type NotificationRow = {
  id: string;
  tenant_id: string | null;
  user_profile_id: string | null;
  role_target: AppRole | null;
  type: NotificationType;
  title: string;
  body: string;
  priority: NotificationPriority | null;
  created_at: string;
  updated_at: string | null;
  read_at: string | null;
  dismissed_at: string | null;
  action_label: string | null;
  route_target: string | null;
  entity_type: string | null;
  entity_id: string | null;
};

type NotificationRowLegacy = Omit<NotificationRow, 'dismissed_at'> & {
  dismissed_at?: string | null;
};

type NotificationRowBase = {
  id: string;
  tenant_id: string | null;
  type: NotificationType;
  title: string;
  body: string;
  created_at: string;
  read_at: string | null;
  action_label: string | null;
};

function normalizeBackendError(error: unknown) {
  const message =
    error instanceof Error
      ? error.message
      : typeof error === 'object' && error !== null && 'message' in error
        ? String((error as { message?: unknown }).message ?? '')
        : String(error);

  if (
    message.includes('ERR_NAME_NOT_RESOLVED') ||
    message.includes('Failed to fetch') ||
    message.includes('Network request failed') ||
    message.includes('fetch')
  ) {
    markBackendUnavailableForSession();
    return 'Supabase could not be reached from this device or browser.';
  }

  return message;
}

function requireSupabase() {
  if (!supabase) {
    throw new Error(notificationsBackendError());
  }

  return supabase;
}

function toNotification(row: NotificationRow): Notification {
  return {
    id: row.id,
    tenantId: row.tenant_id,
    userProfileId: row.user_profile_id,
    roleTarget: row.role_target,
    type: row.type,
    title: row.title,
    body: row.body,
    priority: row.priority ?? 'normal',
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    readAt: row.read_at,
    dismissedAt: row.dismissed_at,
    actionLabel: row.action_label,
    routeTarget: row.route_target,
    entityType: row.entity_type,
    entityId: row.entity_id,
  };
}

const SELECT_FIELDS_WITH_DISMISS = 'id, tenant_id, user_profile_id, role_target, type, title, body, priority, created_at, updated_at, read_at, dismissed_at, action_label, route_target, entity_type, entity_id';
const SELECT_FIELDS_LEGACY = 'id, tenant_id, user_profile_id, role_target, type, title, body, priority, created_at, updated_at, read_at, action_label, route_target, entity_type, entity_id';
const SELECT_FIELDS_BASE = 'id, tenant_id, type, title, body, created_at, read_at, action_label';

function isMissingDismissedColumnError(error: unknown) {
  return getErrorMessage(error).includes('dismissed_at');
}

function isMissingNotificationColumnError(error: unknown) {
  const message = getErrorMessage(error);
  return (
    message.includes('dismissed_at') ||
    message.includes('entity_id') ||
    message.includes('entity_type') ||
    message.includes('route_target') ||
    message.includes('role_target') ||
    message.includes('user_profile_id') ||
    message.includes('priority') ||
    message.includes('updated_at')
  );
}

function getErrorMessage(error: unknown) {
  const message =
    error instanceof Error
      ? error.message
      : typeof error === 'object' && error !== null && 'message' in error
        ? String((error as { message?: unknown }).message ?? '')
        : String(error);
  return message;
}

function toNotificationSafe(row: NotificationRow | NotificationRowLegacy | NotificationRowBase): Notification {
  if (!('created_at' in row)) {
    throw new Error('Invalid notification row.');
  }

  return {
    id: row.id,
    tenantId: row.tenant_id ?? null,
    userProfileId: 'user_profile_id' in row ? (row.user_profile_id ?? null) : null,
    roleTarget: 'role_target' in row ? (row.role_target ?? null) : null,
    type: row.type,
    title: row.title,
    body: row.body,
    priority: 'priority' in row ? (row.priority ?? 'normal') : 'normal',
    createdAt: row.created_at,
    updatedAt: 'updated_at' in row ? (row.updated_at ?? null) : null,
    readAt: row.read_at ?? null,
    dismissedAt: 'dismissed_at' in row ? (row.dismissed_at ?? null) : null,
    actionLabel: row.action_label ?? null,
    routeTarget: 'route_target' in row ? (row.route_target ?? null) : null,
    entityType: 'entity_type' in row ? (row.entity_type ?? null) : null,
    entityId: 'entity_id' in row ? (row.entity_id ?? null) : null,
  };
}

export function notificationsBackendEnabled() {
  return !DEMO_MODE && Boolean(supabase) && backendAvailableForSession() && runtimeAuthSessionAvailable();
}

export function notificationsBackendError() {
  return supabaseConfigError ?? 'Supabase notifications backend is unavailable.';
}

export async function fetchNotificationsFromBackend(filters: {
  role: AppRole;
  tenantId?: string | null;
  userProfileId?: string | null;
}) {
  try {
    const client = requireSupabase();
    const buildQuery = (mode: 'full' | 'legacy' | 'base') => {
      let query = client
        .from('notifications')
        .select(mode === 'full' ? SELECT_FIELDS_WITH_DISMISS : mode === 'legacy' ? SELECT_FIELDS_LEGACY : SELECT_FIELDS_BASE)
        .order('created_at', { ascending: false });

      if (mode === 'full') {
        query = query.is('dismissed_at', null);
      }

      query = query.is('read_at', null);

      if (filters.role === 'tenant') {
        if (!filters.tenantId) {
          return null;
        }

        query = query.eq('tenant_id', filters.tenantId);
      } else if (mode === 'base') {
        return null;
      } else if (filters.userProfileId) {
        query = query.or(`role_target.eq.admin,user_profile_id.eq.${filters.userProfileId}`);
      } else {
        query = query.eq('role_target', 'admin');
      }

      return query;
    };

    const primaryQuery = buildQuery('full');

    if (!primaryQuery) {
      return { data: [] as Notification[], error: null };
    }

    const primaryResult = await primaryQuery;
    let data: unknown = primaryResult.data;
    let error: unknown = primaryResult.error;

    if (error && isMissingNotificationColumnError(error)) {
      const legacyQuery = buildQuery('legacy');

      if (!legacyQuery) {
        const baseQuery = buildQuery('base');
        if (!baseQuery) {
          return { data: [] as Notification[], error: null };
        }
        const baseResult = await baseQuery;
        data = baseResult.data as unknown;
        error = baseResult.error;
      } else {
        const legacyResult = await legacyQuery;
        data = legacyResult.data as unknown;
        error = legacyResult.error;
      }
    }

    if (error && isMissingNotificationColumnError(error)) {
      const baseQuery = buildQuery('base');
      if (!baseQuery) {
        return { data: [] as Notification[], error: null };
      }
      const baseResult = await baseQuery;
      data = baseResult.data as unknown;
      error = baseResult.error;
    }

    if (error) {
      throw error;
    }

    return {
      data: ((data ?? []) as unknown as (NotificationRow | NotificationRowLegacy | NotificationRowBase)[]).map(toNotificationSafe),
      error: null,
    };
  } catch (error) {
    return {
      data: [] as Notification[],
      error: normalizeBackendError(error) || 'Unable to fetch notifications.',
    };
  }
}

export async function createNotificationInBackend(input: {
  tenantId?: string | null;
  userProfileId?: string | null;
  roleTarget?: AppRole | null;
  type: NotificationType;
  title: string;
  body: string;
  priority?: NotificationPriority;
  actionLabel?: string | null;
  routeTarget?: string | null;
  entityType?: string | null;
  entityId?: string | null;
}) {
  try {
    const client = requireSupabase();
    const timestamp = new Date().toISOString();
    const fullInsert = {
      tenant_id: input.tenantId ?? null,
      user_profile_id: input.userProfileId ?? null,
      role_target: input.roleTarget ?? null,
      type: input.type,
      title: input.title,
      body: input.body,
      priority: input.priority ?? 'normal',
      created_at: timestamp,
      updated_at: timestamp,
      read_at: null,
      action_label: input.actionLabel ?? null,
      route_target: input.routeTarget ?? null,
      entity_type: input.entityType ?? null,
      entity_id: input.entityId ?? null,
    };
    const baseInsert = {
      tenant_id: input.tenantId ?? null,
      type: input.type,
      title: input.title,
      body: input.body,
      created_at: timestamp,
      read_at: null,
      action_label: input.actionLabel ?? null,
    };

    const primaryResult = await client
      .from('notifications')
      .insert({
        ...fullInsert,
        dismissed_at: null,
      })
      .select(SELECT_FIELDS_WITH_DISMISS)
      .single();
    let data: unknown = primaryResult.data;
    let error: unknown = primaryResult.error;

    if (error && isMissingNotificationColumnError(error)) {
      const legacyResult = await client
        .from('notifications')
        .insert(fullInsert)
        .select(SELECT_FIELDS_LEGACY)
        .single();

      data = legacyResult.data as unknown;
      error = legacyResult.error;
    }

    if (error && isMissingNotificationColumnError(error)) {
      const baseResult = await client
        .from('notifications')
        .insert(baseInsert)
        .select(SELECT_FIELDS_BASE)
        .single();

      data = baseResult.data as unknown;
      error = baseResult.error;
    }

    if (error) {
      throw error;
    }

    return { notification: toNotificationSafe(data as NotificationRow | NotificationRowLegacy | NotificationRowBase), error: null };
  } catch (error) {
    return { notification: null as Notification | null, error: normalizeBackendError(error) };
  }
}

export async function markNotificationReadInBackend(notificationId: string) {
  try {
    const client = requireSupabase();
    const timestamp = new Date().toISOString();
    const primaryResult = await client
      .from('notifications')
      .update({
        read_at: timestamp,
        updated_at: timestamp,
      })
      .eq('id', notificationId)
      .select(SELECT_FIELDS_WITH_DISMISS)
      .single();
    let data: unknown = primaryResult.data;
    let error: unknown = primaryResult.error;

    if (error && isMissingNotificationColumnError(error)) {
      const legacyResult = await client
        .from('notifications')
        .update({
          read_at: timestamp,
          updated_at: timestamp,
        })
        .eq('id', notificationId)
        .select(SELECT_FIELDS_LEGACY)
        .single();

      data = legacyResult.data as unknown;
      error = legacyResult.error;
    }

    if (error && isMissingNotificationColumnError(error)) {
      const baseResult = await client
        .from('notifications')
        .update({
          read_at: timestamp,
        })
        .eq('id', notificationId)
        .select(SELECT_FIELDS_BASE)
        .single();

      data = baseResult.data as unknown;
      error = baseResult.error;
    }

    if (error) {
      throw error;
    }

    return { notification: toNotificationSafe(data as NotificationRow | NotificationRowLegacy | NotificationRowBase), error: null };
  } catch (error) {
    return { notification: null as Notification | null, error: normalizeBackendError(error) };
  }
}

export async function dismissNotificationInBackend(notificationId: string) {
  try {
    const client = requireSupabase();
    const timestamp = new Date().toISOString();
    const primaryResult = await client
      .from('notifications')
      .update({
        dismissed_at: timestamp,
        updated_at: timestamp,
      })
      .eq('id', notificationId)
      .select(SELECT_FIELDS_WITH_DISMISS)
      .single();
    let data: unknown = primaryResult.data;
    let error: unknown = primaryResult.error;

    if (error && isMissingNotificationColumnError(error)) {
      const legacyResult = await client
        .from('notifications')
        .update({
          read_at: timestamp,
          updated_at: timestamp,
        })
        .eq('id', notificationId)
        .select(SELECT_FIELDS_LEGACY)
        .single();

      data = legacyResult.data as unknown;
      error = legacyResult.error;
    }

    if (error && isMissingNotificationColumnError(error)) {
      const baseResult = await client
        .from('notifications')
        .update({
          read_at: timestamp,
        })
        .eq('id', notificationId)
        .select(SELECT_FIELDS_BASE)
        .single();

      data = baseResult.data as unknown;
      error = baseResult.error;
    }

    if (error) {
      throw error;
    }

    return { notification: toNotificationSafe(data as NotificationRow | NotificationRowLegacy | NotificationRowBase), error: null };
  } catch (error) {
    return { notification: null as Notification | null, error: normalizeBackendError(error) };
  }
}
