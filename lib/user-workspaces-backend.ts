import { backendAvailableForSession, markBackendUnavailableForSession } from '@/lib/backend-availability';
import { DEMO_MODE } from '@/lib/demo-mode';
import { runtimeAuthSessionAvailable } from '@/lib/runtime-auth-state';
import { supabase, supabaseConfigError } from '@/lib/supabase';
import type {
  UserWorkspace,
  UserWorkspaceBoardData,
  UserWorkspaceCollectionItem,
  UserWorkspaceFact,
} from '@/types/domain';

type UserWorkspaceRow = {
  id: string;
  title: string | null;
  body: string | null;
  data?: unknown;
  updated_at: string | null;
};

function toCollectionItems(value: unknown): UserWorkspaceCollectionItem[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.flatMap((item) => {
    if (!item || typeof item !== 'object') {
      return [];
    }

    const candidate = item as Record<string, unknown>;
    return [
      {
        id: typeof candidate.id === 'string' ? candidate.id : `${Date.now()}-${Math.random()}`,
        title: typeof candidate.title === 'string' ? candidate.title : '',
        amount: Number(candidate.amount ?? 0),
        targetType:
          candidate.targetType === 'tenant' ||
          candidate.targetType === 'unit' ||
          candidate.targetType === 'property' ||
          candidate.targetType === 'general'
            ? candidate.targetType
            : 'general',
        targetLabel: typeof candidate.targetLabel === 'string' ? candidate.targetLabel : '',
        status:
          candidate.status === 'open' || candidate.status === 'parked' || candidate.status === 'resolved'
            ? candidate.status
            : 'open',
      },
    ];
  });
}

function toFacts(value: unknown): UserWorkspaceFact[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.flatMap((item) => {
    if (!item || typeof item !== 'object') {
      return [];
    }

    const candidate = item as Record<string, unknown>;
    return [
      {
        id: typeof candidate.id === 'string' ? candidate.id : `${Date.now()}-${Math.random()}`,
        label: typeof candidate.label === 'string' ? candidate.label : '',
        value: typeof candidate.value === 'string' ? candidate.value : '',
      },
    ];
  });
}

function normalizeBoardData(value: unknown): UserWorkspaceBoardData {
  if (!value || typeof value !== 'object') {
    return {
      collectionItems: [],
      facts: [],
    };
  }

  const candidate = value as Record<string, unknown>;
  return {
    collectionItems: toCollectionItems(candidate.collectionItems),
    facts: toFacts(candidate.facts),
  };
}

function isMissingColumnError(error: unknown, columnName: string) {
  const message = normalizeBackendError(error);
  return (
    (message.includes(`'${columnName}'`) && message.includes('schema cache')) ||
    message.includes(`column ${columnName} does not exist`) ||
    message.includes(`column user_workspaces.${columnName} does not exist`)
  );
}

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
    throw new Error(userWorkspacesBackendError());
  }

  return supabase;
}

function toWorkspace(row: UserWorkspaceRow | null, userId: string): UserWorkspace {
  return {
    id: row?.id ?? userId,
    title: row?.title?.trim() || 'Workspace',
    body: row?.body ?? '',
    data: normalizeBoardData(row?.data),
    updatedAt: row?.updated_at ?? null,
  };
}

export function userWorkspacesBackendEnabled() {
  return !DEMO_MODE && Boolean(supabase) && backendAvailableForSession() && runtimeAuthSessionAvailable();
}

export function userWorkspacesBackendError() {
  return supabaseConfigError ?? 'Supabase notes workspace backend is unavailable.';
}

export async function fetchUserWorkspaceFromBackend(userId: string) {
  try {
    const client = requireSupabase();
    const fullResult = await client
      .from('user_workspaces')
      .select('id, title, body, data, updated_at')
      .eq('id', userId)
      .maybeSingle();

    let data: UserWorkspaceRow | null = null;

    if (fullResult.error) {
      if (!isMissingColumnError(fullResult.error, 'data')) {
        throw fullResult.error;
      }

      const legacyResult = await client
        .from('user_workspaces')
        .select('id, title, body, updated_at')
        .eq('id', userId)
        .maybeSingle();

      if (legacyResult.error) {
        throw legacyResult.error;
      }

      data = legacyResult.data ? ({ ...legacyResult.data, data: {} } as UserWorkspaceRow) : null;
    } else {
      data = (fullResult.data ?? null) as UserWorkspaceRow | null;
    }

    return {
      workspace: toWorkspace(data, userId),
      error: null,
    };
  } catch (error) {
    return {
      workspace: null as UserWorkspace | null,
      error: normalizeBackendError(error) || 'Unable to load workspace notes.',
    };
  }
}

export async function saveUserWorkspaceToBackend(input: {
  userId: string;
  title: string;
  body: string;
  data?: UserWorkspaceBoardData;
}) {
  try {
    const client = requireSupabase();
    const payload = {
      id: input.userId,
      title: input.title.trim() || 'Workspace',
      body: input.body,
      data: input.data ?? { collectionItems: [], facts: [] },
      updated_at: new Date().toISOString(),
    };
    const fullResult = await client
      .from('user_workspaces')
      .upsert(payload, { onConflict: 'id' })
      .select('id, title, body, data, updated_at')
      .single();

    let data: UserWorkspaceRow;

    if (fullResult.error) {
      if (!isMissingColumnError(fullResult.error, 'data')) {
        throw fullResult.error;
      }

      const legacyResult = await client
        .from('user_workspaces')
        .upsert(
          {
            id: input.userId,
            title: input.title.trim() || 'Workspace',
            body: input.body,
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'id' }
        )
        .select('id, title, body, updated_at')
        .single();

      if (legacyResult.error) {
        throw legacyResult.error;
      }

      data = { ...(legacyResult.data as UserWorkspaceRow), data: input.data ?? {} };
    } else {
      data = fullResult.data as UserWorkspaceRow;
    }

    return {
      workspace: toWorkspace(data, input.userId),
      error: null,
    };
  } catch (error) {
    return {
      workspace: null as UserWorkspace | null,
      error: normalizeBackendError(error) || 'Unable to save workspace notes.',
    };
  }
}
