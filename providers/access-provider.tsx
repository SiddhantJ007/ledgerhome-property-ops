import type { PropsWithChildren } from 'react';
import { createContext, useContext, useEffect, useMemo, useState } from 'react';

import { DEMO_MODE } from '@/lib/demo-mode';
import { DEMO_TENANT_ID } from '@/lib/tenant-demo';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/providers/auth-provider';
import { useDemoRole } from '@/providers/demo-role-provider';
import type { AppRole, Tenant, UserProfile } from '@/types/domain';

type AccessContextValue = {
  currentRole: AppRole | null;
  currentTenant: Tenant | null;
  currentTenantId: string | null;
  isAccessLoading: boolean;
  isAdmin: boolean;
  isDemoMode: boolean;
  isTenant: boolean;
  profile: UserProfile | null;
  routeReady: boolean;
  routeTarget: '/(admin)/(tabs)' | '/(tenant)/(tabs)' | '/auth' | '/';
  statusMessage: string | null;
};

const AccessContext = createContext<AccessContextValue | undefined>(undefined);

type UserProfileRow = {
  id: string;
  role: AppRole;
  tenant_id: string | null;
  display_name: string | null;
  email: string | null;
};

type TenantRow = {
  id: string;
  unit_id: string;
  full_name: string;
  email: string | null;
  phone: string | null;
  move_in_date: string | null;
  lease_end_date: string | null;
  status: 'active' | 'pending' | 'former';
};

function mapUserProfile(row: UserProfileRow): UserProfile {
  return {
    id: row.id,
    role: row.role,
    tenantId: row.tenant_id,
    displayName: row.display_name ?? '',
    email: row.email,
  };
}

function mapTenant(row: TenantRow): Tenant {
  return {
    id: row.id,
    unitId: row.unit_id,
    fullName: row.full_name,
    email: row.email ?? '',
    phone: row.phone ?? '',
    moveInDate: row.move_in_date ?? '',
    leaseEndDate: row.lease_end_date ?? '',
    status: row.status,
  };
}

export function AccessProvider({ children }: PropsWithChildren) {
  const { isAuthenticated, isLoading: isAuthLoading, session } = useAuth();
  const { selectedRole } = useDemoRole();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [currentTenant, setCurrentTenant] = useState<Tenant | null>(null);
  const [isAccessLoading, setIsAccessLoading] = useState(true);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  useEffect(() => {
    if (DEMO_MODE) {
      setProfile(null);
      setCurrentTenant(null);
      setStatusMessage(null);
      setIsAccessLoading(false);
      return;
    }

    if (isAuthLoading) {
      setIsAccessLoading(true);
      return;
    }

    if (!isAuthenticated || !session?.user.id || !supabase) {
      setProfile(null);
      setCurrentTenant(null);
      setStatusMessage(null);
      setIsAccessLoading(false);
      return;
    }

    let isActive = true;
    const client = supabase;
    const userId = session.user.id;

    async function loadAccess() {
      setIsAccessLoading(true);
      const { data: profileRow, error: profileError } = await client
        .from('user_profiles')
        .select('id, role, tenant_id, display_name, email')
        .eq('id', userId)
        .maybeSingle();

      if (!isActive) {
        return;
      }

      if (profileError) {
        setProfile(null);
        setCurrentTenant(null);
        setStatusMessage(profileError.message);
        setIsAccessLoading(false);
        return;
      }

      if (!profileRow) {
        setProfile(null);
        setCurrentTenant(null);
        setStatusMessage('This authenticated user is not linked to an app profile yet.');
        setIsAccessLoading(false);
        return;
      }

      const mappedProfile = mapUserProfile(profileRow as UserProfileRow);
      setProfile(mappedProfile);

      if (mappedProfile.role === 'tenant' && mappedProfile.tenantId) {
        const { data: tenantRow, error: tenantError } = await client
          .from('tenants')
          .select('id, unit_id, full_name, email, phone, move_in_date, lease_end_date, status')
          .eq('id', mappedProfile.tenantId)
          .maybeSingle();

        if (!isActive) {
          return;
        }

        if (tenantError) {
          setCurrentTenant(null);
          setStatusMessage(tenantError.message);
          setIsAccessLoading(false);
          return;
        }

        setCurrentTenant(tenantRow ? mapTenant(tenantRow as TenantRow) : null);
        setStatusMessage(
          tenantRow ? null : 'This tenant account is authenticated but not linked to a tenant record yet.'
        );
      } else {
        setCurrentTenant(null);
        setStatusMessage(null);
      }

      setIsAccessLoading(false);
    }

    void loadAccess();

    return () => {
      isActive = false;
    };
  }, [isAuthenticated, isAuthLoading, session?.user.id]);

  const value = useMemo<AccessContextValue>(() => {
    if (DEMO_MODE) {
      const currentRole = selectedRole;

      return {
        currentRole,
        currentTenant: null,
        currentTenantId: currentRole === 'tenant' ? DEMO_TENANT_ID : null,
        isAccessLoading: false,
        isAdmin: currentRole === 'admin',
        isDemoMode: true,
        isTenant: currentRole === 'tenant',
        profile: null,
        routeReady: currentRole !== null,
        routeTarget:
          currentRole === 'admin' ? '/(admin)/(tabs)' : currentRole === 'tenant' ? '/(tenant)/(tabs)' : '/',
        statusMessage: null,
      };
    }

    const currentRole = profile?.role ?? null;
    const currentTenantId = currentRole === 'tenant' ? currentTenant?.id ?? profile?.tenantId ?? null : null;
    const routeTarget =
      !isAuthenticated
        ? '/auth'
        : currentRole === 'admin'
          ? '/(admin)/(tabs)'
          : currentRole === 'tenant' && currentTenantId
            ? '/(tenant)/(tabs)'
            : '/auth';

    return {
      currentRole,
      currentTenant,
      currentTenantId,
      isAccessLoading,
      isAdmin: currentRole === 'admin',
      isDemoMode: false,
      isTenant: currentRole === 'tenant' && Boolean(currentTenantId),
      profile,
      routeReady: !isAuthLoading && !isAccessLoading,
      routeTarget,
      statusMessage,
    };
  }, [currentTenant, isAccessLoading, isAuthLoading, isAuthenticated, profile, selectedRole, statusMessage]);

  return <AccessContext.Provider value={value}>{children}</AccessContext.Provider>;
}

export function useAccess() {
  const context = useContext(AccessContext);

  if (!context) {
    throw new Error('useAccess must be used within an AccessProvider.');
  }

  return context;
}
