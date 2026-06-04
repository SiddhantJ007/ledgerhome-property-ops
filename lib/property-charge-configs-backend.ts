import { markBackendUnavailableForSession, resetBackendAvailabilityForSession } from '@/lib/backend-availability';
import { DEMO_MODE } from '@/lib/demo-mode';
import { runtimeAuthSessionAvailable } from '@/lib/runtime-auth-state';
import { supabase, supabaseConfigError } from '@/lib/supabase';
import type {
  PropertyChargeBatch,
  PropertyChargeBatchAllocation,
  PropertyChargeAllocationMethod,
  PropertyChargeCategory,
  PropertyChargeConfig,
  PropertyChargeFrequency,
  SupplementalChargeRow,
} from '@/types/domain';

type PropertyChargeConfigRow = {
  id: string;
  property_id: string;
  category: PropertyChargeCategory;
  title: string;
  description: string | null;
  allocation_method: PropertyChargeAllocationMethod;
  billing_frequency: PropertyChargeFrequency;
  default_amount: number | string;
  is_active: boolean;
  created_at: string;
  updated_at: string | null;
};

type PostedSupplementalChargeRow = {
  id: string;
  property_id: string;
  unit_id: string;
  tenant_id: string | null;
  source_config_id?: string | null;
  month_label: string;
  description: string;
  due_date: string;
  expected_amount: number | string;
  collected_amount: number | string;
  prior_balance_amount: number | string;
  status: 'paid' | 'partial' | 'pending' | 'overdue';
};

type PropertyChargeBatchRow = {
  id: string;
  property_id: string;
  category: PropertyChargeCategory;
  title: string;
  description: string | null;
  billing_period_label: string;
  due_date: string;
  total_amount: number | string;
  created_at: string;
};

type PropertyChargeAllocationRow = {
  id: string;
  batch_id: string;
  unit_id: string;
  tenant_id: string | null;
  allocated_amount: number | string;
  created_at: string;
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
    message.includes('Network request failed')
  ) {
    markBackendUnavailableForSession();
    return 'Supabase could not be reached from this device or browser.';
  }

  return message;
}

function isMissingColumnError(error: unknown, columnName: string) {
  const message = normalizeBackendError(error);
  return (
    (message.includes(`'${columnName}'`) && message.includes('schema cache')) ||
    message.includes(`column ${columnName} does not exist`) ||
    message.includes(`column rent_charges.${columnName} does not exist`)
  );
}

function requireSupabase() {
  if (!supabase) {
    throw new Error(propertyChargeConfigsBackendError());
  }

  return supabase;
}

function numberValue(value: number | string | null | undefined) {
  return Number(value ?? 0);
}

function mapPropertyChargeConfig(row: PropertyChargeConfigRow): PropertyChargeConfig {
  return {
    id: row.id,
    propertyId: row.property_id,
    category: row.category,
    title: row.title,
    description: row.description ?? '',
    allocationMethod: row.allocation_method,
    billingFrequency: row.billing_frequency,
    defaultAmount: numberValue(row.default_amount),
    isActive: row.is_active,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapPropertyChargeBatch(
  row: PropertyChargeBatchRow,
  postedUnitCount: number
): PropertyChargeBatch {
  return {
    id: row.id,
    propertyId: row.property_id,
    category: row.category,
    title: row.title,
    description: row.description ?? '',
    billingPeriodLabel: row.billing_period_label,
    dueDate: row.due_date,
    totalAmount: numberValue(row.total_amount),
    postedUnitCount,
    createdAt: row.created_at,
  };
}

function todayDateString() {
  return new Date().toISOString().slice(0, 10);
}

function deriveChargeStatus(input: {
  dueDate: string;
  expectedAmount: number;
  collectedAmount: number;
  status: 'paid' | 'partial' | 'pending' | 'overdue';
}) {
  const expectedAmount = numberValue(input.expectedAmount);
  const collectedAmount = numberValue(input.collectedAmount);

  if (collectedAmount >= expectedAmount && expectedAmount > 0) {
    return 'paid' as const;
  }

  if (input.dueDate && input.dueDate < todayDateString() && collectedAmount < expectedAmount) {
    return 'overdue' as const;
  }

  if (collectedAmount > 0) {
    return 'partial' as const;
  }

  return input.status ?? 'pending';
}

export function propertyChargeConfigsBackendEnabled() {
  return !DEMO_MODE && Boolean(supabase) && runtimeAuthSessionAvailable();
}

export function propertyChargeConfigsBackendError() {
  return supabaseConfigError ?? 'Supabase property charge config backend is unavailable.';
}

export function monthlyEquivalentAmount(config: Pick<PropertyChargeConfig, 'defaultAmount' | 'billingFrequency'>) {
  switch (config.billingFrequency) {
    case 'annual':
      return config.defaultAmount / 12;
    case 'quarterly':
      return config.defaultAmount / 3;
    case 'manual':
      return 0;
    default:
      return config.defaultAmount;
  }
}

export async function fetchPropertyChargeConfigsFromBackend(filters?: { propertyId?: string }) {
  try {
    const client = requireSupabase();
    let query = client
      .from('property_charge_configs')
      .select(
        'id, property_id, category, title, description, allocation_method, billing_frequency, default_amount, is_active, created_at, updated_at'
      )
      .order('category')
      .order('title');

    if (filters?.propertyId) {
      query = query.eq('property_id', filters.propertyId);
    }

    const { data, error } = await query;

    if (error) {
      throw error;
    }

    resetBackendAvailabilityForSession();

    return {
      data: ((data ?? []) as PropertyChargeConfigRow[]).map(mapPropertyChargeConfig),
      error: null,
    };
  } catch (error) {
    return {
      data: [] as PropertyChargeConfig[],
      error: normalizeBackendError(error) || 'Unable to fetch property charge configs.',
    };
  }
}

export async function createPropertyChargeConfigInBackend(input: {
  propertyId: string;
  category: PropertyChargeCategory;
  title: string;
  description?: string;
  allocationMethod: PropertyChargeAllocationMethod;
  billingFrequency: PropertyChargeFrequency;
  defaultAmount: number;
  isActive?: boolean;
}) {
  try {
    const client = requireSupabase();
    const { data, error } = await client
      .from('property_charge_configs')
      .insert({
        property_id: input.propertyId,
        category: input.category,
        title: input.title,
        description: input.description ?? '',
        allocation_method: input.allocationMethod,
        billing_frequency: input.billingFrequency,
        default_amount: input.defaultAmount,
        is_active: input.isActive ?? true,
      })
      .select(
        'id, property_id, category, title, description, allocation_method, billing_frequency, default_amount, is_active, created_at, updated_at'
      )
      .single();

    if (error) {
      throw error;
    }

    resetBackendAvailabilityForSession();

    return { config: mapPropertyChargeConfig(data as PropertyChargeConfigRow), error: null };
  } catch (error) {
    return { config: null as PropertyChargeConfig | null, error: normalizeBackendError(error) };
  }
}

export async function deletePropertyChargeConfigInBackend(configId: string) {
  try {
    const client = requireSupabase();
    const { error } = await client.from('property_charge_configs').delete().eq('id', configId);

    if (error) {
      throw error;
    }

    resetBackendAvailabilityForSession();

    return { error: null };
  } catch (error) {
    return { error: normalizeBackendError(error) };
  }
}

export function getCurrentChargeCycleDefaults() {
  const today = new Date();
  const year = today.getFullYear();
  const monthIndex = today.getMonth();
  const dueDate = new Date(year, monthIndex, 5);

  return {
    monthLabel: new Intl.DateTimeFormat('en-US', { month: 'long', year: 'numeric' }).format(today),
    dueDate: dueDate.toISOString().slice(0, 10),
  };
}

export function getCurrentSupplementalChargeDefaults() {
  const today = new Date();
  const dueDate = new Date(today);
  dueDate.setDate(dueDate.getDate() + 10);

  return {
    monthLabel: new Intl.DateTimeFormat('en-US', { month: 'long', year: 'numeric' }).format(today),
    dueDate: dueDate.toISOString().slice(0, 10),
  };
}

function getMinimumSupplementalDueDate() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  today.setDate(today.getDate() + 10);
  return today.toISOString().slice(0, 10);
}

export async function fetchSupplementalChargeRowsFromBackend(filters?: {
  propertyId?: string;
  tenantId?: string;
  unitId?: string;
}) {
  try {
    const client = requireSupabase();
    let fullQuery = client
      .from('rent_charges')
      .select(
        'id, property_id, unit_id, tenant_id, source_config_id, month_label, description, due_date, expected_amount, collected_amount, prior_balance_amount, status'
      )
      .eq('charge_type', 'fee')
      .order('due_date', { ascending: false });

    if (filters?.propertyId) {
      fullQuery = fullQuery.eq('property_id', filters.propertyId);
    }

    if (filters?.tenantId) {
      fullQuery = fullQuery.eq('tenant_id', filters.tenantId);
    }

    if (filters?.unitId) {
      fullQuery = fullQuery.eq('unit_id', filters.unitId);
    }

    let data: unknown[] | null = null;
    const fullResult = await fullQuery;

    if (fullResult.error) {
      if (!isMissingColumnError(fullResult.error, 'source_config_id')) {
        throw fullResult.error;
      }

      let legacyQuery = client
        .from('rent_charges')
        .select(
          'id, property_id, unit_id, tenant_id, month_label, description, due_date, expected_amount, collected_amount, prior_balance_amount, status'
        )
        .eq('charge_type', 'fee')
        .order('due_date', { ascending: false });

      if (filters?.propertyId) {
        legacyQuery = legacyQuery.eq('property_id', filters.propertyId);
      }

      if (filters?.tenantId) {
        legacyQuery = legacyQuery.eq('tenant_id', filters.tenantId);
      }

      if (filters?.unitId) {
        legacyQuery = legacyQuery.eq('unit_id', filters.unitId);
      }

      const legacyResult = await legacyQuery;

      if (legacyResult.error) {
        throw legacyResult.error;
      }

      data = (legacyResult.data ?? []).map((row) => ({ ...row, source_config_id: null }));
    } else {
      data = fullResult.data ?? [];
    }

    const chargeRows = (data ?? []) as PostedSupplementalChargeRow[];

    if (chargeRows.length === 0) {
      resetBackendAvailabilityForSession();
      return { data: [] as SupplementalChargeRow[], error: null };
    }

    const propertyIds = [...new Set(chargeRows.map((row) => row.property_id))];
    const unitIds = [...new Set(chargeRows.map((row) => row.unit_id))];
    const tenantIds = [...new Set(chargeRows.map((row) => row.tenant_id).filter(Boolean))] as string[];

    const [
      { data: properties, error: propertiesError },
      { data: units, error: unitsError },
      { data: tenants, error: tenantsError },
    ] = await Promise.all([
      client.from('properties').select('id, name').in('id', propertyIds),
      client.from('units').select('id, label').in('id', unitIds),
      tenantIds.length > 0
        ? client.from('tenants').select('id, full_name').in('id', tenantIds)
        : Promise.resolve({ data: [], error: null }),
    ]);

    if (propertiesError) {
      throw propertiesError;
    }

    if (unitsError) {
      throw unitsError;
    }

    if (tenantsError) {
      throw tenantsError;
    }

    resetBackendAvailabilityForSession();

    const propertyNames = new Map(((properties ?? []) as { id: string; name: string }[]).map((row) => [row.id, row.name]));
    const unitLabels = new Map(((units ?? []) as { id: string; label: string }[]).map((row) => [row.id, row.label]));
    const tenantNames = new Map(((tenants ?? []) as { id: string; full_name: string }[]).map((row) => [row.id, row.full_name]));

    return {
      data: chargeRows.map((row) => {
        const expectedAmount = numberValue(row.expected_amount);
        const collectedAmount = numberValue(row.collected_amount);
        const priorBalanceAmount = numberValue(row.prior_balance_amount);

        return {
          chargeId: row.id,
          propertyId: row.property_id,
          propertyName: propertyNames.get(row.property_id) ?? 'Property',
          unitId: row.unit_id,
          unitLabel: unitLabels.get(row.unit_id) ?? 'Unit',
          tenantId: row.tenant_id,
          tenantName: row.tenant_id ? tenantNames.get(row.tenant_id) ?? 'Occupied' : 'Unassigned',
          sourceConfigId: row.source_config_id ?? null,
          monthLabel: row.month_label,
          description: row.description,
          expectedAmount,
          collectedAmount,
          pendingAmount: Math.max(expectedAmount - collectedAmount + priorBalanceAmount, 0),
          status: deriveChargeStatus({
            dueDate: row.due_date,
            expectedAmount,
            collectedAmount,
            status: row.status,
          }),
          dueDate: row.due_date,
        } satisfies SupplementalChargeRow;
      }),
      error: null,
    };
  } catch (error) {
    return {
      data: [] as SupplementalChargeRow[],
      error: normalizeBackendError(error) || 'Unable to fetch posted utility and tax charges.',
    };
  }
}

export async function postPropertyChargeConfigsToRentCharges(input: {
  propertyId: string;
  dueDate: string;
  monthLabel: string;
}) {
  try {
    const client = requireSupabase();
    const configResult = await fetchPropertyChargeConfigsFromBackend({ propertyId: input.propertyId });

    if (configResult.error) {
      throw new Error(configResult.error);
    }

    const activeConfigs = configResult.data.filter((item) => item.isActive);

    if (activeConfigs.length === 0) {
      return { insertedCount: 0, skippedCount: 0, error: null };
    }

    const { data: units, error: unitsError } = await client
      .from('units')
      .select('id, tenant_id, occupancy_status')
      .eq('property_id', input.propertyId);

    if (unitsError) {
      throw unitsError;
    }

    const unitRows =
      ((units ?? []) as { id: string; tenant_id: string | null; occupancy_status: string }[]).filter(
        (unit) => unit.tenant_id && unit.occupancy_status === 'occupied'
      );

    if (unitRows.length === 0) {
      return { insertedCount: 0, skippedCount: activeConfigs.length, error: null };
    }

    const fullExistingResult = await client
      .from('rent_charges')
      .select('id, source_config_id, unit_id')
      .eq('property_id', input.propertyId)
      .eq('charge_type', 'fee')
      .eq('month_label', input.monthLabel);

    let existingCharges: Array<{ id: string; source_config_id: string | null; unit_id: string }> = [];

    if (fullExistingResult.error) {
      if (!isMissingColumnError(fullExistingResult.error, 'source_config_id')) {
        throw fullExistingResult.error;
      }

      const legacyExistingResult = await client
        .from('rent_charges')
        .select('id, unit_id')
        .eq('property_id', input.propertyId)
        .eq('charge_type', 'fee')
        .eq('month_label', input.monthLabel);

      if (legacyExistingResult.error) {
        throw legacyExistingResult.error;
      }

      existingCharges = ((legacyExistingResult.data ?? []) as Array<{ id: string; unit_id: string }>).map((row) => ({
        ...row,
        source_config_id: null,
      }));
    } else {
      existingCharges = (fullExistingResult.data ?? []) as Array<{ id: string; source_config_id: string | null; unit_id: string }>;
    }

    const existingKeys = new Set(
      existingCharges
        .filter((row) => row.source_config_id)
        .map((row) => `${row.source_config_id}:${row.unit_id}`)
    );

    const inserts: Array<Record<string, unknown>> = [];
    let skippedCount = 0;

    const dueDate = new Date(`${input.dueDate}T12:00:00`);
    const periodStart = new Date(dueDate.getFullYear(), dueDate.getMonth(), 1).toISOString().slice(0, 10);
    const periodEnd = new Date(dueDate.getFullYear(), dueDate.getMonth() + 1, 0).toISOString().slice(0, 10);

    activeConfigs.forEach((config) => {
      if (config.allocationMethod === 'manual') {
        skippedCount += 1;
        return;
      }

      const billableUnits = unitRows;
      if (billableUnits.length === 0) {
        skippedCount += 1;
        return;
      }

      const perUnitAmount =
        config.allocationMethod === 'property_level'
          ? config.defaultAmount / billableUnits.length
          : config.defaultAmount;

      billableUnits.forEach((unit) => {
        const key = `${config.id}:${unit.id}`;
        if (existingKeys.has(key)) {
          skippedCount += 1;
          return;
        }

        inserts.push({
          tenant_id: unit.tenant_id,
          property_id: input.propertyId,
          unit_id: unit.id,
          charge_type: 'fee',
          description: config.title,
          period_start: periodStart,
          period_end: periodEnd,
          due_date: input.dueDate,
          month_label: input.monthLabel,
          expected_amount: perUnitAmount,
          collected_amount: 0,
          prior_balance_amount: 0,
          status: 'pending',
          last_payment_date: null,
        });
      });
    });

    if (inserts.length === 0) {
      return { insertedCount: 0, skippedCount, error: null };
    }

    const { error: insertError } = await client.from('rent_charges').insert(inserts);

    if (insertError) {
      throw insertError;
    }

    resetBackendAvailabilityForSession();

    return { insertedCount: inserts.length, skippedCount, error: null };
  } catch (error) {
    return {
      insertedCount: 0,
      skippedCount: 0,
      error: normalizeBackendError(error) || 'Unable to post utility and tax charges.',
    };
  }
}

export async function deleteSupplementalChargeInBackend(chargeId: string) {
  try {
    const client = requireSupabase();
    const { error } = await client.from('rent_charges').delete().eq('id', chargeId).eq('charge_type', 'fee');

    if (error) {
      throw error;
    }

    resetBackendAvailabilityForSession();

    return { error: null };
  } catch (error) {
    return { error: normalizeBackendError(error) };
  }
}

export async function fetchPropertyChargeBatchesFromBackend(filters?: { propertyId?: string }) {
  try {
    const client = requireSupabase();
    let query = client
      .from('property_charge_batches')
      .select('id, property_id, category, title, description, billing_period_label, due_date, total_amount, created_at')
      .order('created_at', { ascending: false });

    if (filters?.propertyId) {
      query = query.eq('property_id', filters.propertyId);
    }

    const { data, error } = await query;

    if (error) {
      throw error;
    }

    const rows = (data ?? []) as PropertyChargeBatchRow[];

    if (rows.length === 0) {
      resetBackendAvailabilityForSession();
      return { data: [] as PropertyChargeBatch[], error: null };
    }

    const { data: allocations, error: allocationsError } = await client
      .from('property_charge_allocations')
      .select('batch_id')
      .in(
        'batch_id',
        rows.map((row) => row.id)
      );

    if (allocationsError) {
      throw allocationsError;
    }

    resetBackendAvailabilityForSession();

    const counts = new Map<string, number>();
    ((allocations ?? []) as { batch_id: string }[]).forEach((row) => {
      counts.set(row.batch_id, (counts.get(row.batch_id) ?? 0) + 1);
    });

    return {
      data: rows.map((row) => mapPropertyChargeBatch(row, counts.get(row.id) ?? 0)),
      error: null,
    };
  } catch (error) {
    return {
      data: [] as PropertyChargeBatch[],
      error: normalizeBackendError(error) || 'Unable to fetch posted utility and tax bills.',
    };
  }
}

export async function fetchPropertyChargeBatchAllocationsFromBackend(filters?: {
  propertyId?: string;
  batchId?: string;
}) {
  try {
    const client = requireSupabase();
    let batchesQuery = client.from('property_charge_batches').select('id, property_id');

    if (filters?.propertyId) {
      batchesQuery = batchesQuery.eq('property_id', filters.propertyId);
    }

    if (filters?.batchId) {
      batchesQuery = batchesQuery.eq('id', filters.batchId);
    }

    const { data: batches, error: batchesError } = await batchesQuery;

    if (batchesError) {
      throw batchesError;
    }

    const batchRows = (batches ?? []) as Array<{ id: string; property_id: string }>;

    if (batchRows.length === 0) {
      resetBackendAvailabilityForSession();
      return { data: [] as PropertyChargeBatchAllocation[], error: null };
    }

    const { data: allocations, error: allocationsError } = await client
      .from('property_charge_allocations')
      .select('id, batch_id, unit_id, tenant_id, allocated_amount, created_at')
      .in(
        'batch_id',
        batchRows.map((row) => row.id)
      )
      .order('created_at', { ascending: false });

    if (allocationsError) {
      throw allocationsError;
    }

    const allocationRows = (allocations ?? []) as PropertyChargeAllocationRow[];

    if (allocationRows.length === 0) {
      return { data: [] as PropertyChargeBatchAllocation[], error: null };
    }

    const unitIds = [...new Set(allocationRows.map((row) => row.unit_id))];
    const tenantIds = [...new Set(allocationRows.map((row) => row.tenant_id).filter(Boolean))] as string[];

    const [
      { data: units, error: unitsError },
      { data: tenants, error: tenantsError },
    ] = await Promise.all([
      client.from('units').select('id, label').in('id', unitIds),
      tenantIds.length > 0
        ? client.from('tenants').select('id, full_name').in('id', tenantIds)
        : Promise.resolve({ data: [], error: null }),
    ]);

    if (unitsError) {
      throw unitsError;
    }

    if (tenantsError) {
      throw tenantsError;
    }

    resetBackendAvailabilityForSession();

    const unitLabels = new Map(((units ?? []) as Array<{ id: string; label: string }>).map((row) => [row.id, row.label]));
    const tenantNames = new Map(
      ((tenants ?? []) as Array<{ id: string; full_name: string }>).map((row) => [row.id, row.full_name])
    );

    return {
      data: allocationRows.map((row) => ({
        id: row.id,
        batchId: row.batch_id,
        unitId: row.unit_id,
        tenantId: row.tenant_id,
        unitLabel: unitLabels.get(row.unit_id) ?? 'Unit',
        tenantName: row.tenant_id ? tenantNames.get(row.tenant_id) ?? 'Tenant' : 'Unassigned',
        allocatedAmount: numberValue(row.allocated_amount),
        createdAt: row.created_at,
      })),
      error: null,
    };
  } catch (error) {
    return {
      data: [] as PropertyChargeBatchAllocation[],
      error: normalizeBackendError(error) || 'Unable to fetch posted bill allocations.',
    };
  }
}

export async function createPropertyChargeBatchInBackend(input: {
  propertyId: string;
  category: PropertyChargeCategory;
  title: string;
  description?: string;
  billingPeriodLabel: string;
  dueDate: string;
  totalAmount: number;
  allocations: Array<{ unitId: string; tenantId: string | null; allocatedAmount: number }>;
}) {
  try {
    const client = requireSupabase();
    const minimumDueDate = getMinimumSupplementalDueDate();
    const effectiveDueDate = input.dueDate < minimumDueDate ? minimumDueDate : input.dueDate;
    const positiveAllocations = input.allocations.filter((item) => item.allocatedAmount > 0);

    if (positiveAllocations.length === 0) {
      throw new Error('Enter at least one unit allocation above $0.');
    }

    const allocationTotal = positiveAllocations.reduce((sum, item) => sum + item.allocatedAmount, 0);

    if (Math.abs(allocationTotal - input.totalAmount) > 0.01) {
      throw new Error('Allocated amounts must add up to the total bill amount.');
    }

    const { data: batchData, error: batchError } = await client
      .from('property_charge_batches')
      .insert({
        property_id: input.propertyId,
        category: input.category,
        title: input.title,
        description: input.description ?? '',
        billing_period_label: input.billingPeriodLabel,
        due_date: effectiveDueDate,
        total_amount: input.totalAmount,
      })
      .select('id, property_id, category, title, description, billing_period_label, due_date, total_amount, created_at')
      .single();

    if (batchError) {
      throw batchError;
    }

    const batch = batchData as PropertyChargeBatchRow;

    const { error: allocationError } = await client.from('property_charge_allocations').insert(
      positiveAllocations.map((item) => ({
        batch_id: batch.id,
        unit_id: item.unitId,
        tenant_id: item.tenantId,
        allocated_amount: item.allocatedAmount,
      }))
    );

    if (allocationError) {
      throw allocationError;
    }

    const periodDate = new Date(`${effectiveDueDate}T12:00:00`);
    const periodStart = new Date(periodDate.getFullYear(), periodDate.getMonth(), 1).toISOString().slice(0, 10);
    const periodEnd = new Date(periodDate.getFullYear(), periodDate.getMonth() + 1, 0).toISOString().slice(0, 10);
    const chargeRows = positiveAllocations
      .filter((item) => item.tenantId)
      .map((item) => ({
        tenant_id: item.tenantId,
        property_id: input.propertyId,
        unit_id: item.unitId,
        charge_type: 'fee',
        description: input.title,
        period_start: periodStart,
        period_end: periodEnd,
        due_date: effectiveDueDate,
        month_label: input.billingPeriodLabel,
        expected_amount: item.allocatedAmount,
        collected_amount: 0,
        prior_balance_amount: 0,
        status: effectiveDueDate < todayDateString() ? 'overdue' : 'pending',
        last_payment_date: null,
      }));

    if (chargeRows.length > 0) {
      const { error: chargeError } = await client.from('rent_charges').insert(chargeRows);

      if (chargeError) {
        throw chargeError;
      }
    }

    resetBackendAvailabilityForSession();

    return {
      batch: mapPropertyChargeBatch(batch, positiveAllocations.length),
      postedCount: chargeRows.length,
      effectiveDueDate,
      error: null,
    };
  } catch (error) {
    return {
      batch: null as PropertyChargeBatch | null,
      postedCount: 0,
      effectiveDueDate: null as string | null,
      error: normalizeBackendError(error) || 'Unable to post this utility or tax bill.',
    };
  }
}

export async function deletePropertyChargeBatchInBackend(input: {
  batchId: string;
  propertyId: string;
  title: string;
  billingPeriodLabel: string;
  dueDate: string;
}) {
  try {
    const client = requireSupabase();

    const { error: chargeDeleteError } = await client
      .from('rent_charges')
      .delete()
      .eq('property_id', input.propertyId)
      .eq('charge_type', 'fee')
      .eq('description', input.title)
      .eq('month_label', input.billingPeriodLabel)
      .eq('due_date', input.dueDate);

    if (chargeDeleteError) {
      throw chargeDeleteError;
    }

    const { error: batchDeleteError } = await client
      .from('property_charge_batches')
      .delete()
      .eq('id', input.batchId);

    if (batchDeleteError) {
      throw batchDeleteError;
    }

    resetBackendAvailabilityForSession();

    return { error: null };
  } catch (error) {
    return {
      error: normalizeBackendError(error) || 'Unable to remove this posted bill.',
    };
  }
}
