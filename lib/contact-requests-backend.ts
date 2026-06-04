import { backendAvailableForSession, markBackendUnavailableForSession } from '@/lib/backend-availability';
import { DEMO_MODE } from '@/lib/demo-mode';
import { runtimeAuthSessionAvailable } from '@/lib/runtime-auth-state';
import { supabase, supabaseConfigError } from '@/lib/supabase';
import type { ContactRequest, ContactRequestCategory, ContactRequestStatus } from '@/types/domain';

type ContactRequestRow = {
  id: string;
  tenant_id: string;
  property_id: string;
  unit_id: string;
  subject: string;
  message: string;
  category: ContactRequestCategory;
  channel: ContactRequest['channel'];
  sender_role: ContactRequest['senderRole'];
  status: ContactRequestStatus;
  admin_reply: string | null;
  sent_at: string;
  responded_at: string | null;
  updated_at: string | null;
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
    throw new Error(contactRequestsBackendError());
  }

  return supabase;
}

function toContactRequest(row: ContactRequestRow): ContactRequest {
  return {
    id: row.id,
    tenantId: row.tenant_id,
    propertyId: row.property_id,
    unitId: row.unit_id,
    subject: row.subject,
    message: row.message,
    category: row.category ?? 'general',
    channel: row.channel ?? 'message',
    senderRole: row.sender_role ?? 'tenant',
    status: row.status ?? 'sent',
    sentAt: row.sent_at,
    adminReply: row.admin_reply,
    respondedAt: row.responded_at,
    updatedAt: row.updated_at,
  };
}

export function contactRequestsBackendEnabled() {
  return !DEMO_MODE && Boolean(supabase) && backendAvailableForSession() && runtimeAuthSessionAvailable();
}

export function contactRequestsBackendError() {
  return supabaseConfigError ?? 'Supabase contact backend is unavailable.';
}

export async function fetchContactRequestsFromBackend(filters?: {
  tenantId?: string;
  propertyId?: string;
  unitId?: string;
}) {
  try {
    const client = requireSupabase();
    let query = client
      .from('contact_requests')
      .select(
        'id, tenant_id, property_id, unit_id, subject, message, category, channel, sender_role, status, admin_reply, sent_at, responded_at, updated_at'
      )
      .order('sent_at', { ascending: false });

    if (filters?.tenantId) {
      query = query.eq('tenant_id', filters.tenantId);
    }

    if (filters?.propertyId) {
      query = query.eq('property_id', filters.propertyId);
    }

    if (filters?.unitId) {
      query = query.eq('unit_id', filters.unitId);
    }

    const { data, error } = await query;

    if (error) {
      throw error;
    }

    return {
      data: ((data ?? []) as ContactRequestRow[]).map(toContactRequest),
      error: null,
    };
  } catch (error) {
    return {
      data: [] as ContactRequest[],
      error: normalizeBackendError(error) || 'Unable to fetch contact requests.',
    };
  }
}

export async function createContactRequestInBackend(input: {
  tenantId: string;
  propertyId: string;
  unitId: string;
  subject: string;
  message: string;
  category?: ContactRequestCategory;
  channel?: ContactRequest['channel'];
}) {
  try {
    const client = requireSupabase();
    const timestamp = new Date().toISOString();
    const { data, error } = await client
      .from('contact_requests')
      .insert({
        tenant_id: input.tenantId,
        property_id: input.propertyId,
        unit_id: input.unitId,
        subject: input.subject,
        message: input.message,
        category: input.category ?? 'general',
        channel: input.channel ?? 'message',
        sender_role: 'tenant',
        status: 'sent',
        admin_reply: null,
        sent_at: timestamp,
        responded_at: null,
        updated_at: timestamp,
      })
      .select(
        'id, tenant_id, property_id, unit_id, subject, message, category, channel, sender_role, status, admin_reply, sent_at, responded_at, updated_at'
      )
      .single();

    if (error) {
      throw error;
    }

    return {
      request: toContactRequest(data as ContactRequestRow),
      error: null,
    };
  } catch (error) {
    return {
      request: null as ContactRequest | null,
      error: normalizeBackendError(error) || 'Unable to send inquiry.',
    };
  }
}

export async function replyToContactRequestInBackend(input: {
  requestId: string;
  reply: string;
  status?: ContactRequestStatus;
}) {
  try {
    const client = requireSupabase();
    const timestamp = new Date().toISOString();
    const { data, error } = await client
      .from('contact_requests')
      .update({
        status: input.status ?? 'responded',
        admin_reply: input.reply,
        responded_at: timestamp,
        updated_at: timestamp,
      })
      .eq('id', input.requestId)
      .select(
        'id, tenant_id, property_id, unit_id, subject, message, category, channel, sender_role, status, admin_reply, sent_at, responded_at, updated_at'
      )
      .single();

    if (error) {
      throw error;
    }

    return {
      request: toContactRequest(data as ContactRequestRow),
      error: null,
    };
  } catch (error) {
    return {
      request: null as ContactRequest | null,
      error: normalizeBackendError(error) || 'Unable to send admin reply.',
    };
  }
}
