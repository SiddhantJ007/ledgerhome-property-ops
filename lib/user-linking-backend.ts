import { backendAvailableForSession, markBackendUnavailableForSession } from '@/lib/backend-availability';
import { DEMO_MODE } from '@/lib/demo-mode';
import { runtimeAuthSessionAvailable } from '@/lib/runtime-auth-state';
import { supabase, supabaseConfigError } from '@/lib/supabase';

export type TenantUserLink = {
  userProfileId: string;
  tenantId: string;
  email: string | null;
  displayName: string;
  role: 'tenant';
};

type UserProfileLinkRow = {
  id: string;
  tenant_id: string | null;
  email: string | null;
  display_name: string | null;
  role: 'tenant' | 'admin';
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
    throw new Error(userLinkingBackendError());
  }

  return supabase;
}

function mapTenantUserLink(row: UserProfileLinkRow): TenantUserLink {
  return {
    userProfileId: row.id,
    tenantId: row.tenant_id ?? '',
    email: row.email,
    displayName: row.display_name ?? '',
    role: 'tenant',
  };
}

export function userLinkingBackendEnabled() {
  return !DEMO_MODE && Boolean(supabase) && backendAvailableForSession() && runtimeAuthSessionAvailable();
}

export function userLinkingBackendError() {
  return supabaseConfigError ?? 'Supabase user-linking backend is unavailable.';
}

export async function fetchTenantUserLinkFromBackend(tenantId: string) {
  try {
    const client = requireSupabase();
    const { data, error } = await client
      .from('user_profiles')
      .select('id, tenant_id, email, display_name, role')
      .eq('tenant_id', tenantId)
      .eq('role', 'tenant')
      .maybeSingle();

    if (error) {
      throw error;
    }

    return {
      link: data ? mapTenantUserLink(data as UserProfileLinkRow) : null,
      error: null,
    };
  } catch (error) {
    return {
      link: null as TenantUserLink | null,
      error: normalizeBackendError(error) || 'Unable to fetch tenant login link.',
    };
  }
}

export async function linkTenantUserByEmailInBackend(input: { tenantId: string; email: string }) {
  try {
    const client = requireSupabase();
    const normalizedEmail = input.email.trim().toLowerCase();
    const { data, error } = await client.rpc('link_tenant_user_by_email', {
      target_tenant_id: input.tenantId,
      target_email: normalizedEmail,
    });

    if (!error && data) {
      return {
        link: mapTenantUserLink(data as UserProfileLinkRow),
        error: null,
      };
    }

    const { data: existingProfile, error: existingProfileError } = await client
      .from('user_profiles')
      .select('id, tenant_id, email, display_name, role')
      .eq('email', normalizedEmail)
      .maybeSingle();

    if (existingProfileError) {
      throw error ?? existingProfileError;
    }

    if (!existingProfile) {
      throw error ?? new Error(`No authenticated user exists for ${normalizedEmail}.`);
    }

    const existingRow = existingProfile as UserProfileLinkRow;

    if (existingRow.role === 'admin') {
      throw new Error('This authenticated user is already linked as an admin.');
    }

    if (existingRow.tenant_id && existingRow.tenant_id !== input.tenantId) {
      throw new Error('This authenticated user is already linked to another tenant.');
    }

    const { data: updatedProfile, error: updateError } = await client
      .from('user_profiles')
      .update({
        tenant_id: input.tenantId,
        role: 'tenant',
        email: normalizedEmail,
        updated_at: new Date().toISOString(),
      })
      .eq('id', existingRow.id)
      .select('id, tenant_id, email, display_name, role')
      .single();

    if (updateError) {
      throw updateError;
    }

    return {
      link: mapTenantUserLink(updatedProfile as UserProfileLinkRow),
      error: null,
    };
  } catch (error) {
    return {
      link: null as TenantUserLink | null,
      error: normalizeBackendError(error) || 'Unable to link the tenant login.',
    };
  }
}

export async function unlinkTenantUserInBackend(tenantId: string) {
  try {
    const client = requireSupabase();
    const { error } = await client.rpc('unlink_tenant_user', {
      target_tenant_id: tenantId,
    });

    if (error) {
      throw error;
    }

    return { error: null };
  } catch (error) {
    return {
      error: normalizeBackendError(error) || 'Unable to unlink the tenant login.',
    };
  }
}
