import { backendAvailableForSession, markBackendUnavailableForSession } from '@/lib/backend-availability';
import { DEMO_MODE } from '@/lib/demo-mode';
import { getTodayDateString } from '@/lib/prototype-ledger';
import { runtimeAuthSessionAvailable } from '@/lib/runtime-auth-state';
import { supabase, supabaseConfigError } from '@/lib/supabase';
import type {
  Neighborhood,
  OccupancyStatus,
  Property,
  PropertyStatus,
  StateCode,
  Tenant,
  Unit,
} from '@/types/domain';

type NeighborhoodRow = {
  id: string;
  state_code: string;
  name: string;
  city: string;
  note: string | null;
  is_active: boolean | null;
};

type PropertyRow = {
  id: string;
  neighborhood_id: string;
  name: string;
  address: string;
  status: PropertyStatus;
  note: string | null;
  cover_image_url: string | null;
};

type UnitRow = {
  id: string;
  property_id: string;
  label: string;
  bedrooms: number | string;
  bathrooms: number | string;
  monthly_rent: number | string;
  occupancy_status: OccupancyStatus;
  tenant_id: string | null;
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

const fallbackPropertyImage =
  'https://images.unsplash.com/photo-1501183638710-841dd1904471?auto=format&fit=crop&w=1200&q=80';

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
    throw new Error(masterDataBackendError());
  }

  return supabase;
}

async function clearFormerTenantParticipation(client: NonNullable<typeof supabase>, tenantId: string) {
  const today = getTodayDateString();

  await Promise.all([
    client.rpc('unlink_tenant_user', {
      target_tenant_id: tenantId,
    }),
    client
      .from('rent_charges')
      .delete()
      .eq('tenant_id', tenantId)
      .gt('due_date', today)
      .in('status', ['pending', 'partial', 'overdue']),
    client.from('notifications').delete().eq('tenant_id', tenantId),
  ]);
}

function numberValue(value: number | string | null | undefined) {
  return Number(value ?? 0);
}

function addYearsToDate(dateString: string, years: number) {
  const date = new Date(`${dateString}T12:00:00`);
  date.setFullYear(date.getFullYear() + years);
  return date.toISOString().slice(0, 10);
}

function addDaysToDate(dateString: string, days: number) {
  const date = new Date(`${dateString}T12:00:00`);
  date.setDate(date.getDate() + days);
  return date.toISOString().slice(0, 10);
}

function isoDateAtLocalNoon(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate(), 12).toISOString().slice(0, 10);
}

function startOfMonth(dateString: string) {
  const date = new Date(`${dateString}T12:00:00`);
  return new Date(date.getFullYear(), date.getMonth(), 1).toISOString().slice(0, 10);
}

function endOfMonth(dateString: string) {
  const date = new Date(`${dateString}T12:00:00`);
  return new Date(date.getFullYear(), date.getMonth() + 1, 0).toISOString().slice(0, 10);
}

function monthLabelForDate(dateString: string) {
  const date = new Date(`${dateString}T12:00:00`);
  return new Intl.DateTimeFormat('en-US', {
    month: 'long',
    year: 'numeric',
  }).format(date);
}

function mapNeighborhood(row: NeighborhoodRow): Neighborhood {
  return {
    id: row.id,
    stateCode: row.state_code,
    name: row.name,
    city: row.city,
    note: row.note ?? '',
    isActive: row.is_active ?? true,
  };
}

function currentCycleMetaForMoveInDate(moveInDate: string, referenceDate = getTodayDateString()) {
  const moveIn = new Date(`${moveInDate}T12:00:00`);
  const reference = new Date(`${referenceDate}T12:00:00`);

  if (Number.isNaN(moveIn.getTime()) || Number.isNaN(reference.getTime())) {
    const currentMonthStart = startOfMonth(referenceDate);
    return {
      periodStart: currentMonthStart,
      periodEnd: endOfMonth(currentMonthStart),
      dueDate: currentMonthStart,
      monthLabel: monthLabelForDate(currentMonthStart),
    };
  }

  const year = reference.getFullYear();
  const month = reference.getMonth();
  const periodAnchor = isoDateAtLocalNoon(new Date(year, month, 1));

  return {
    periodStart: startOfMonth(periodAnchor),
    periodEnd: endOfMonth(periodAnchor),
    dueDate: periodAnchor,
    monthLabel: monthLabelForDate(periodAnchor),
  };
}

function cycleMetaForReferenceDate(referenceDate: string, monthOffset = 0) {
  const date = new Date(`${referenceDate}T12:00:00`);
  const cycleStart = new Date(date.getFullYear(), date.getMonth() + monthOffset, 1, 12);
  const cycleStartIso = cycleStart.toISOString().slice(0, 10);

  return {
    periodStart: startOfMonth(cycleStartIso),
    periodEnd: endOfMonth(cycleStartIso),
    dueDate: cycleStartIso,
    monthLabel: monthLabelForDate(cycleStartIso),
  };
}

function daysUntilDate(dateString: string, referenceDate = getTodayDateString()) {
  const start = new Date(`${referenceDate}T12:00:00`);
  const target = new Date(`${dateString}T12:00:00`);

  if (Number.isNaN(start.getTime()) || Number.isNaN(target.getTime())) {
    return Number.POSITIVE_INFINITY;
  }

  return Math.floor((target.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
}

function mapProperty(row: PropertyRow): Property {
  return {
    id: row.id,
    neighborhoodId: row.neighborhood_id,
    name: row.name,
    address: row.address,
    status: row.status,
    note: row.note ?? '',
    coverImageUrl: row.cover_image_url ?? '',
  };
}

function mapUnit(row: UnitRow): Unit {
  return {
    id: row.id,
    propertyId: row.property_id,
    label: row.label,
    bedrooms: numberValue(row.bedrooms),
    bathrooms: numberValue(row.bathrooms),
    monthlyRent: numberValue(row.monthly_rent),
    occupancyStatus: row.occupancy_status,
    tenantId: row.tenant_id,
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

export function masterDataBackendEnabled() {
  return !DEMO_MODE && Boolean(supabase) && backendAvailableForSession() && runtimeAuthSessionAvailable();
}

export function masterDataBackendError() {
  return supabaseConfigError ?? 'Supabase master-data backend is unavailable.';
}

export async function fetchMasterDataFromBackend() {
  try {
    const client = requireSupabase();
    const [neighborhoodsResult, propertiesResult, unitsResult, tenantsResult] = await Promise.all([
      client
        .from('neighborhoods')
        .select('id, state_code, name, city, note, is_active')
        .order('state_code')
        .order('name'),
      client
        .from('properties')
        .select('id, neighborhood_id, name, address, status, note, cover_image_url')
        .order('name'),
      client
        .from('units')
        .select('id, property_id, label, bedrooms, bathrooms, monthly_rent, occupancy_status, tenant_id')
        .order('label'),
      client
        .from('tenants')
        .select('id, unit_id, full_name, email, phone, move_in_date, lease_end_date, status')
        .order('full_name'),
    ]);

    const errors = [
      neighborhoodsResult.error ? `Neighborhoods: ${neighborhoodsResult.error.message}` : null,
      propertiesResult.error ? `Properties: ${propertiesResult.error.message}` : null,
      unitsResult.error ? `Units: ${unitsResult.error.message}` : null,
      tenantsResult.error ? `Tenants: ${tenantsResult.error.message}` : null,
    ].filter(Boolean) as string[];

    return {
      data: {
        neighborhoods: ((neighborhoodsResult.data ?? []) as NeighborhoodRow[]).map(mapNeighborhood),
        properties: ((propertiesResult.data ?? []) as PropertyRow[]).map(mapProperty),
        units: ((unitsResult.data ?? []) as UnitRow[]).map(mapUnit),
        tenants: ((tenantsResult.data ?? []) as TenantRow[]).map(mapTenant),
      },
      error: errors.length > 0 ? errors.join(' ') : null,
    };
  } catch (error) {
    return {
      data: null,
      error: normalizeBackendError(error),
    };
  }
}

export async function createNeighborhoodInBackend(input: {
  stateCode: StateCode;
  name: string;
  city: string;
  note: string;
  isActive: boolean;
}) {
  try {
    const client = requireSupabase();
    const { data, error } = await client
      .from('neighborhoods')
      .insert({
        state_code: input.stateCode,
        name: input.name,
        city: input.city,
        note: input.note,
        is_active: input.isActive,
      })
      .select('id, state_code, name, city, note, is_active')
      .single();

    if (error) throw error;

    return { neighborhood: mapNeighborhood(data as NeighborhoodRow), error: null };
  } catch (error) {
    return { neighborhood: null, error: normalizeBackendError(error) };
  }
}

export async function updateNeighborhoodInBackend(
  neighborhoodId: string,
  input: { stateCode: StateCode; name: string; city: string; note: string; isActive: boolean }
) {
  try {
    const client = requireSupabase();
    const { data, error } = await client
      .from('neighborhoods')
      .update({
        state_code: input.stateCode,
        name: input.name,
        city: input.city,
        note: input.note,
        is_active: input.isActive,
      })
      .eq('id', neighborhoodId)
      .select('id, state_code, name, city, note, is_active')
      .single();

    if (error) throw error;

    return { neighborhood: mapNeighborhood(data as NeighborhoodRow), error: null };
  } catch (error) {
    return { neighborhood: null, error: normalizeBackendError(error) };
  }
}

export async function createPropertyInBackend(input: {
  neighborhoodId: string;
  name: string;
  address: string;
  note: string;
  status: PropertyStatus;
  imageUrl?: string;
}) {
  try {
    const client = requireSupabase();
    const { data, error } = await client
      .from('properties')
      .insert({
        neighborhood_id: input.neighborhoodId,
        name: input.name,
        address: input.address,
        note: input.note,
        status: input.status,
        cover_image_url: input.imageUrl || null,
      })
      .select('id, neighborhood_id, name, address, status, note, cover_image_url')
      .single();

    if (error) throw error;

    return { property: mapProperty(data as PropertyRow), error: null };
  } catch (error) {
    return { property: null, error: normalizeBackendError(error) };
  }
}

export async function updatePropertyInBackend(
  propertyId: string,
  patch: Partial<Pick<Property, 'name' | 'address' | 'note' | 'status' | 'coverImageUrl' | 'neighborhoodId'>>
) {
  try {
    const client = requireSupabase();
    const payload: Record<string, unknown> = {};
    if (patch.name !== undefined) payload.name = patch.name;
    if (patch.address !== undefined) payload.address = patch.address;
    if (patch.note !== undefined) payload.note = patch.note;
    if (patch.status !== undefined) payload.status = patch.status;
    if (patch.coverImageUrl !== undefined) payload.cover_image_url = patch.coverImageUrl;
    if (patch.neighborhoodId !== undefined) payload.neighborhood_id = patch.neighborhoodId;

    const { data, error } = await client
      .from('properties')
      .update(payload)
      .eq('id', propertyId)
      .select('id, neighborhood_id, name, address, status, note, cover_image_url')
      .single();

    if (error) throw error;

    return { property: mapProperty(data as PropertyRow), error: null };
  } catch (error) {
    return { property: null, error: normalizeBackendError(error) };
  }
}

export async function createUnitInBackend(input: {
  propertyId: string;
  label: string;
  bedrooms: number;
  bathrooms: number;
  monthlyRent: number;
  occupancyStatus: OccupancyStatus;
}) {
  try {
    const client = requireSupabase();
    const { data, error } = await client
      .from('units')
      .insert({
        property_id: input.propertyId,
        label: input.label,
        bedrooms: input.bedrooms,
        bathrooms: input.bathrooms,
        monthly_rent: input.monthlyRent,
        occupancy_status: input.occupancyStatus,
        tenant_id: null,
      })
      .select('id, property_id, label, bedrooms, bathrooms, monthly_rent, occupancy_status, tenant_id')
      .single();

    if (error) throw error;

    return { unit: mapUnit(data as UnitRow), error: null };
  } catch (error) {
    return { unit: null, error: normalizeBackendError(error) };
  }
}

export async function updateUnitInBackend(
  unitId: string,
  patch: Partial<Pick<Unit, 'occupancyStatus' | 'tenantId'>>
) {
  try {
    const client = requireSupabase();
    const payload: Record<string, unknown> = {};
    if (patch.occupancyStatus !== undefined) payload.occupancy_status = patch.occupancyStatus;
    if (patch.tenantId !== undefined) payload.tenant_id = patch.tenantId;

    const { data, error } = await client
      .from('units')
      .update(payload)
      .eq('id', unitId)
      .select('id, property_id, label, bedrooms, bathrooms, monthly_rent, occupancy_status, tenant_id')
      .single();

    if (error) throw error;

    return { unit: mapUnit(data as UnitRow), error: null };
  } catch (error) {
    return { unit: null, error: normalizeBackendError(error) };
  }
}

export async function createTenantInBackend(input: {
  unitId: string;
  fullName: string;
  phone: string;
  email?: string;
  moveInDate?: string;
  leaseEndDate?: string;
  initialRentAmount?: number | null;
}) {
  try {
    const client = requireSupabase();
    const moveInDate = input.moveInDate || getTodayDateString();
    const leaseEndDate = input.leaseEndDate || addYearsToDate(moveInDate, 1);

    const { data: unitData, error: unitError } = await client
      .from('units')
      .select('id, property_id, label, bedrooms, bathrooms, monthly_rent, occupancy_status, tenant_id')
      .eq('id', input.unitId)
      .single();

    if (unitError) throw unitError;

    const unit = mapUnit(unitData as UnitRow);

    const { data: tenantData, error: tenantError } = await client
      .from('tenants')
      .insert({
        unit_id: input.unitId,
        full_name: input.fullName,
        phone: input.phone,
        email: input.email ?? null,
        move_in_date: moveInDate,
        lease_end_date: leaseEndDate,
        status: 'active',
      })
      .select('id, unit_id, full_name, email, phone, move_in_date, lease_end_date, status')
      .single();

    if (tenantError) throw tenantError;

    const tenant = mapTenant(tenantData as TenantRow);
    const unitUpdate = await updateUnitInBackend(input.unitId, {
      tenantId: tenant.id,
      occupancyStatus: 'occupied',
    });

    if (unitUpdate.error) throw new Error(unitUpdate.error);

    const initialRentAmount =
      input.initialRentAmount != null && Number.isFinite(input.initialRentAmount) && input.initialRentAmount >= 0
        ? input.initialRentAmount
        : unit.monthlyRent;

    const leaseInsert = await client.from('leases').insert({
      tenant_id: tenant.id,
      property_id: unit.propertyId,
      unit_id: unit.id,
      start_date: moveInDate,
      end_date: leaseEndDate,
      renewal_date: addDaysToDate(leaseEndDate, -45),
      monthly_rent: unit.monthlyRent,
      security_deposit: unit.monthlyRent,
      status: 'active',
    });

    if (leaseInsert.error) throw leaseInsert.error;

    const chargeInsert = await client.from('rent_charges').insert({
      tenant_id: tenant.id,
      property_id: unit.propertyId,
      unit_id: unit.id,
      charge_type: 'rent',
      description: 'Monthly base rent',
      period_start: startOfMonth(moveInDate),
      period_end: endOfMonth(moveInDate),
      due_date: moveInDate,
      month_label: monthLabelForDate(moveInDate),
      expected_amount: initialRentAmount,
      collected_amount: 0,
      prior_balance_amount: 0,
      status: 'pending',
      last_payment_date: null,
    });

    if (chargeInsert.error) throw chargeInsert.error;

    return { tenant, error: null };
  } catch (error) {
    return { tenant: null, error: normalizeBackendError(error) };
  }
}

export async function ensureTenantOperationalSetupInBackend(input: {
  tenantId: string;
  propertyId: string;
  unitId: string;
  moveInDate?: string | null;
  leaseEndDate?: string | null;
  monthlyRent: number;
  initialRentAmount?: number | null;
}) {
  try {
    const client = requireSupabase();
    const moveInDate = input.moveInDate || getTodayDateString();
    const leaseEndDate = input.leaseEndDate || addYearsToDate(moveInDate, 1);
    const initialRentAmount =
      input.initialRentAmount != null && Number.isFinite(input.initialRentAmount) && input.initialRentAmount >= 0
        ? input.initialRentAmount
        : input.monthlyRent;

    const [leaseResult, chargeResult] = await Promise.all([
      client
        .from('leases')
        .select('id')
        .eq('tenant_id', input.tenantId)
        .eq('unit_id', input.unitId)
        .limit(1),
      client
        .from('rent_charges')
        .select('id')
        .eq('tenant_id', input.tenantId)
        .eq('unit_id', input.unitId)
        .eq('charge_type', 'rent')
        .eq('month_label', monthLabelForDate(moveInDate))
        .limit(1),
    ]);

    if (leaseResult.error) throw leaseResult.error;
    if (chargeResult.error) throw chargeResult.error;

    if ((leaseResult.data ?? []).length === 0) {
      const leaseInsert = await client.from('leases').insert({
        tenant_id: input.tenantId,
        property_id: input.propertyId,
        unit_id: input.unitId,
        start_date: moveInDate,
        end_date: leaseEndDate,
        renewal_date: addDaysToDate(leaseEndDate, -45),
        monthly_rent: input.monthlyRent,
        security_deposit: input.monthlyRent,
        status: 'active',
      });

      if (leaseInsert.error) throw leaseInsert.error;
    }

    if ((chargeResult.data ?? []).length === 0) {
      const chargeInsert = await client.from('rent_charges').insert({
        tenant_id: input.tenantId,
        property_id: input.propertyId,
        unit_id: input.unitId,
        charge_type: 'rent',
        description: 'Monthly base rent',
        period_start: startOfMonth(moveInDate),
        period_end: endOfMonth(moveInDate),
        due_date: moveInDate,
        month_label: monthLabelForDate(moveInDate),
        expected_amount: initialRentAmount,
        collected_amount: 0,
        prior_balance_amount: 0,
        status: 'pending',
        last_payment_date: null,
      });

      if (chargeInsert.error) throw chargeInsert.error;
    }

    return { error: null };
  } catch (error) {
    return { error: normalizeBackendError(error) };
  }
}

export async function ensureCurrentMonthRentChargesForActiveTenantsInBackend() {
  try {
    const client = requireSupabase();
    const today = getTodayDateString();
    const currentCycle = cycleMetaForReferenceDate(today);
    const nextCycle = cycleMetaForReferenceDate(today, 1);
    const targetCycles = [currentCycle];

    if (daysUntilDate(nextCycle.dueDate, today) <= 7) {
      targetCycles.push(nextCycle);
    }

    const targetMonthLabels = targetCycles.map((cycle) => cycle.monthLabel);

    const [{ data: tenantsData, error: tenantsError }, { data: unitsData, error: unitsError }, { data: chargesData, error: chargesError }] =
      await Promise.all([
        client
          .from('tenants')
          .select('id, unit_id, full_name, email, phone, move_in_date, lease_end_date, status')
          .in('status', ['active', 'pending']),
        client
          .from('units')
          .select('id, property_id, label, bedrooms, bathrooms, monthly_rent, occupancy_status, tenant_id'),
        client
          .from('rent_charges')
          .select('id, tenant_id, unit_id, month_label, charge_type, expected_amount, collected_amount, status')
          .eq('charge_type', 'rent')
          .in('month_label', [currentCycle.monthLabel, nextCycle.monthLabel]),
      ]);

    if (tenantsError) throw tenantsError;
    if (unitsError) throw unitsError;
    if (chargesError) throw chargesError;

    const units = new Map(((unitsData ?? []) as UnitRow[]).map((row) => [row.id, mapUnit(row)]));
    const rentCharges = (chargesData ?? []) as Array<{
      id: string;
      tenant_id: string | null;
      unit_id: string;
      month_label: string;
      charge_type: string;
      expected_amount: number | string;
      collected_amount: number | string;
      status: 'paid' | 'partial' | 'pending' | 'overdue';
    }>;
    const currentCycleCharges = rentCharges.filter((row) => row.month_label === currentCycle.monthLabel);
    const currentCycleChargeIds = currentCycleCharges.map((row) => row.id);
    let paymentTotalsByTenantUnit = new Map<string, number>();

    if (currentCycleChargeIds.length > 0) {
      const { data: paymentRows, error: paymentsError } = await client
        .from('rent_payments')
        .select('charge_id, tenant_id, unit_id, amount')
        .in('charge_id', currentCycleChargeIds);

      if (paymentsError) throw paymentsError;

      paymentTotalsByTenantUnit = ((paymentRows ?? []) as Array<{
        charge_id: string;
        tenant_id: string | null;
        unit_id: string;
        amount: number | string;
      }>).reduce((map, row) => {
        const key = `${row.tenant_id ?? 'none'}:${row.unit_id}`;
        map.set(key, (map.get(key) ?? 0) + numberValue(row.amount));
        return map;
      }, new Map<string, number>());
    }

    const existingKeys = new Set(
      rentCharges.map(
        (row) => `${row.tenant_id ?? 'none'}:${row.unit_id}:${row.month_label}`
      )
    );
    const settledCurrentCycleKeys = new Set(
      [...new Set(currentCycleCharges.map((row) => `${row.tenant_id ?? 'none'}:${row.unit_id}`))]
        .filter((key) => {
          const cycleRows = currentCycleCharges.filter(
            (row) => `${row.tenant_id ?? 'none'}:${row.unit_id}` === key
          );
          const expectedAmount = Math.max(...cycleRows.map((row) => numberValue(row.expected_amount)));
          const recordedCollectedAmount = Math.max(...cycleRows.map((row) => numberValue(row.collected_amount)));
          const paymentCollectedAmount = paymentTotalsByTenantUnit.get(key) ?? 0;
          const effectiveCollectedAmount = Math.max(recordedCollectedAmount, paymentCollectedAmount);

          return cycleRows.some((row) => row.status === 'paid') || effectiveCollectedAmount >= expectedAmount;
        })
    );

    const inserts = ((tenantsData ?? []) as TenantRow[])
      .map(mapTenant)
      .filter((tenant) => {
        if (!tenant.unitId || !tenant.moveInDate || tenant.moveInDate > today) {
          return false;
        }

        if (tenant.leaseEndDate) {
          const currentMonthStart = startOfMonth(today);
          if (tenant.leaseEndDate < currentMonthStart) {
            return false;
          }
        }

        return true;
      })
      .map((tenant) => {
        const unit = units.get(tenant.unitId);
        if (!unit || unit.monthlyRent <= 0) {
          return null;
        }

        if (unit.tenantId !== tenant.id || unit.occupancyStatus !== 'occupied') {
          void client
            .from('units')
            .update({
              tenant_id: tenant.id,
              occupancy_status: 'occupied',
            })
            .eq('id', unit.id);
        }

        const tenantCycleTargets = [...targetCycles];
        const tenantUnitKey = `${tenant.id}:${tenant.unitId}`;

        if (
          settledCurrentCycleKeys.has(tenantUnitKey) &&
          !tenantCycleTargets.some((cycle) => cycle.monthLabel === nextCycle.monthLabel)
        ) {
          tenantCycleTargets.push(nextCycle);
        }

        return tenantCycleTargets
          .filter((cycle) => {
            if (tenant.moveInDate > cycle.periodEnd) {
              return false;
            }

            if (tenant.leaseEndDate && tenant.leaseEndDate < cycle.periodStart) {
              return false;
            }

            return true;
          })
          .map((cycle) => {
            const key = `${tenant.id}:${tenant.unitId}:${cycle.monthLabel}`;
            if (existingKeys.has(key)) {
              return null;
            }

            return {
              tenant_id: tenant.id,
              property_id: unit.propertyId,
              unit_id: unit.id,
              charge_type: 'rent',
              description: 'Monthly base rent',
              period_start: cycle.periodStart,
              period_end: cycle.periodEnd,
              due_date: cycle.dueDate,
              month_label: cycle.monthLabel,
              expected_amount: unit.monthlyRent,
              collected_amount: 0,
              prior_balance_amount: 0,
              status: 'pending',
              last_payment_date: null,
            };
          });
      })
      .flat()
      .filter(Boolean);

    if (inserts.length > 0) {
      const insertResult = await client.from('rent_charges').insert(inserts);
      if (insertResult.error) throw insertResult.error;
    }

    return { createdCount: inserts.length, error: null };
  } catch (error) {
    return { createdCount: 0, error: normalizeBackendError(error) };
  }
}

export async function updateTenantInBackend(
  tenantId: string,
  patch: Partial<Pick<Tenant, 'fullName' | 'phone' | 'email' | 'moveInDate' | 'leaseEndDate' | 'status'>>
) {
  try {
    const client = requireSupabase();
    const payload: Record<string, unknown> = {};
    if (patch.fullName !== undefined) payload.full_name = patch.fullName;
    if (patch.phone !== undefined) payload.phone = patch.phone;
    if (patch.email !== undefined) payload.email = patch.email;
    if (patch.moveInDate !== undefined) payload.move_in_date = patch.moveInDate || null;
    if (patch.leaseEndDate !== undefined) payload.lease_end_date = patch.leaseEndDate || null;
    if (patch.status !== undefined) payload.status = patch.status;

    const { data, error } = await client
      .from('tenants')
      .update(payload)
      .eq('id', tenantId)
      .select('id, unit_id, full_name, email, phone, move_in_date, lease_end_date, status')
      .single();

    if (error) throw error;

    return { tenant: mapTenant(data as TenantRow), error: null };
  } catch (error) {
    return { tenant: null, error: normalizeBackendError(error) };
  }
}

export async function deactivateTenantInBackend(tenantId: string, unitId: string) {
  try {
    const client = requireSupabase();
    const updatedTenant = await updateTenantInBackend(tenantId, { status: 'former' });

    if (updatedTenant.error) {
      throw new Error(updatedTenant.error);
    }

    const unitUpdate = await updateUnitInBackend(unitId, {
      tenantId: null,
      occupancyStatus: 'turnover',
    });

    if (unitUpdate.error) {
      throw new Error(unitUpdate.error);
    }

    await clearFormerTenantParticipation(client, tenantId);

    return { tenant: updatedTenant.tenant, error: null };
  } catch (error) {
    return { tenant: null, error: normalizeBackendError(error) };
  }
}

export async function removeTenantInBackend(tenantId: string, unitId: string) {
  try {
    const client = requireSupabase();
    const [
      leasesResult,
      chargesResult,
      paymentsResult,
      maintenanceResult,
      inquiriesResult,
      documentsResult,
      notificationsResult,
    ] = await Promise.all([
      client.from('leases').select('id', { count: 'exact', head: true }).eq('tenant_id', tenantId),
      client.from('rent_charges').select('id', { count: 'exact', head: true }).eq('tenant_id', tenantId),
      client.from('rent_payments').select('id', { count: 'exact', head: true }).eq('tenant_id', tenantId),
      client.from('maintenance_requests').select('id', { count: 'exact', head: true }).eq('tenant_id', tenantId),
      client.from('contact_requests').select('id', { count: 'exact', head: true }).eq('tenant_id', tenantId),
      client.from('documents').select('id', { count: 'exact', head: true }).eq('tenant_id', tenantId),
      client.from('notifications').select('id', { count: 'exact', head: true }).eq('tenant_id', tenantId),
    ]);

    const countErrors = [
      leasesResult.error,
      chargesResult.error,
      paymentsResult.error,
      maintenanceResult.error,
      inquiriesResult.error,
      documentsResult.error,
      notificationsResult.error,
    ].filter(Boolean);

    if (countErrors.length > 0) {
      throw countErrors[0];
    }

    const relatedCount =
      (leasesResult.count ?? 0) +
      (chargesResult.count ?? 0) +
      (paymentsResult.count ?? 0) +
      (maintenanceResult.count ?? 0) +
      (inquiriesResult.count ?? 0) +
      (documentsResult.count ?? 0) +
      (notificationsResult.count ?? 0);

    if (relatedCount > 0) {
      const deactivated = await deactivateTenantInBackend(tenantId, unitId);
      return {
        tenant: deactivated.tenant,
        error: deactivated.error,
        action: 'deactivated' as const,
      };
    }

    const unitUpdate = await updateUnitInBackend(unitId, {
      tenantId: null,
      occupancyStatus: 'turnover',
    });

    if (unitUpdate.error) {
      throw new Error(unitUpdate.error);
    }

    await clearFormerTenantParticipation(client, tenantId);

    const { error } = await client.from('tenants').delete().eq('id', tenantId);

    if (error) {
      throw error;
    }

    return {
      tenant: null,
      error: null,
      action: 'deleted' as const,
    };
  } catch (error) {
    return {
      tenant: null,
      error: normalizeBackendError(error),
      action: null as 'deleted' | 'deactivated' | null,
    };
  }
}

export async function deletePropertyInBackend(propertyId: string) {
  try {
    const client = requireSupabase();
    const unitsResult = await client.from('units').select('id', { count: 'exact', head: true }).eq('property_id', propertyId);

    if (unitsResult.error) {
      throw unitsResult.error;
    }

    if ((unitsResult.count ?? 0) > 0) {
      return {
        error: 'This property still has units. Remove or reassign its units before deleting the property.',
      };
    }

    const { error } = await client.from('properties').delete().eq('id', propertyId);

    if (error) {
      throw error;
    }

    return { error: null };
  } catch (error) {
    return { error: normalizeBackendError(error) };
  }
}
