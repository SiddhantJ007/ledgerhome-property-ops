import { backendAvailableForSession, markBackendUnavailableForSession } from '@/lib/backend-availability';
import { DEMO_MODE } from '@/lib/demo-mode';
import { ensureCurrentMonthRentChargesForActiveTenantsInBackend } from '@/lib/master-data-backend';
import { runtimeAuthSessionAvailable } from '@/lib/runtime-auth-state';
import { supabase, supabaseConfigError } from '@/lib/supabase';
import type { LedgerRow, PaymentMethod, PaymentRecordStatus, RentPayment, RentStatus } from '@/types/domain';

type RentChargeRow = {
  id: string;
  tenant_id: string | null;
  property_id: string;
  unit_id: string;
  due_date: string;
  month_label: string;
  expected_amount: number | string;
  collected_amount: number | string;
  prior_balance_amount: number | string;
  status: RentStatus;
  last_payment_date: string | null;
  updated_at?: string | null;
};

type RentPaymentRow = {
  id: string;
  charge_id: string;
  tenant_id: string | null;
  property_id: string;
  unit_id: string;
  amount: number | string;
  payment_date: string;
  method: string | null;
  status: PaymentRecordStatus;
  external_reference: string | null;
  note: string | null;
};

type PaymentChargeMetaRow = {
  id: string;
  charge_type: 'rent' | 'fee' | 'credit' | 'balance_forward';
  description: string | null;
  month_label: string | null;
  due_date?: string | null;
};

function getErrorMessage(error: unknown) {
  return error instanceof Error
    ? error.message
    : typeof error === 'object' && error !== null && 'message' in error
      ? String((error as { message?: unknown }).message ?? '')
      : String(error);
}

function isMissingPaymentColumnError(error: unknown, columnName: string) {
  const message = getErrorMessage(error);
  return (
    (message.includes(`'${columnName}'`) && message.includes('schema cache')) ||
    message.includes(`column ${columnName} does not exist`) ||
    message.includes(`column rent_charges.${columnName} does not exist`) ||
    message.includes(`column rent_payments.${columnName} does not exist`)
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
    throw new Error(paymentsBackendError());
  }

  return supabase;
}

function numberValue(value: number | string | null | undefined) {
  return Number(value ?? 0);
}

function paymentMethodValue(value: string | null | undefined): PaymentMethod {
  const method = value?.trim();

  switch (method) {
    case 'ACH transfer':
    case 'Card':
    case 'Bank transfer':
    case 'Manual update':
    case 'Resident portal':
    case 'Check':
      return method;
    default:
      return 'Manual update';
  }
}

function todayDateString() {
  return new Date().toISOString().slice(0, 10);
}

export function deriveEffectiveRentStatus(input: {
  dueDate: string;
  expectedAmount: number;
  collectedAmount: number;
  status?: RentStatus;
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

export function getRentReminderCopy(row: Pick<LedgerRow, 'propertyName' | 'unitLabel' | 'tenantName' | 'pendingAmount' | 'priorBalanceAmount' | 'dueDate' | 'status'>, audience: 'admin' | 'tenant') {
  const balance = row.pendingAmount + row.priorBalanceAmount;
  const status = row.status;

  if (audience === 'tenant') {
    return {
      title:
        status === 'overdue'
          ? `Rent overdue for ${row.unitLabel}`
          : `Rent balance pending for ${row.unitLabel}`,
      body:
        status === 'overdue'
          ? `Your balance of ${formatCurrencySafe(balance)} is overdue. Review your ledger and contact admin if you need help.`
          : `Your balance of ${formatCurrencySafe(balance)} is still pending. Please review Rent & Payments before ${row.dueDate}.`,
    };
  }

  return {
    title:
      status === 'overdue'
        ? `Collections follow-up: ${row.tenantName}`
        : `Balance reminder: ${row.tenantName}`,
    body:
      status === 'overdue'
        ? `${row.tenantName} at ${row.propertyName} ${row.unitLabel} is overdue with ${formatCurrencySafe(balance)} outstanding.`
        : `${row.tenantName} at ${row.propertyName} ${row.unitLabel} still has ${formatCurrencySafe(balance)} pending before ${row.dueDate}.`,
  };
}

export function daysUntilIsoDate(dateString: string) {
  if (!dateString) {
    return Number.POSITIVE_INFINITY;
  }

  const today = new Date();
  const startOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const dueDate = new Date(`${dateString}T00:00:00`);

  if (Number.isNaN(dueDate.getTime())) {
    return Number.POSITIVE_INFINITY;
  }

  return Math.floor((dueDate.getTime() - startOfToday.getTime()) / (1000 * 60 * 60 * 24));
}

function formatCurrencySafe(value: number) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(value);
}

function chargeLabelForType(type: PaymentChargeMetaRow['charge_type'] | null | undefined, description?: string | null) {
  if (type === 'fee') {
    const normalizedDescription = description?.trim().toLowerCase() ?? '';

    if (normalizedDescription.includes('utility')) {
      return 'Utility';
    }

    if (normalizedDescription.includes('tax')) {
      return 'Tax';
    }

    return 'Fee';
  }

  if (type === 'credit') {
    return 'Credit';
  }

  if (type === 'balance_forward') {
    return 'Prior balance';
  }

  return 'Rent';
}

function toRentPayment(row: RentPaymentRow, chargeMeta?: PaymentChargeMetaRow | null): RentPayment {
  return {
    id: row.id,
    chargeId: row.charge_id,
    tenantId: row.tenant_id,
    propertyId: row.property_id,
    unitId: row.unit_id,
    chargeType: chargeMeta?.charge_type ?? null,
    chargeLabel: chargeLabelForType(chargeMeta?.charge_type, chargeMeta?.description),
    chargeDescription: chargeMeta?.description ?? '',
    monthLabel: chargeMeta?.month_label ?? '',
    amount: numberValue(row.amount),
    paymentDate: row.payment_date,
    method: paymentMethodValue(row.method),
    status: row.status ?? 'posted',
    externalReference: row.external_reference,
    note: row.note ?? '',
  };
}

function chargeOutstandingAmount(row: Pick<RentChargeRow, 'expected_amount' | 'collected_amount' | 'prior_balance_amount'>) {
  return Math.max(numberValue(row.expected_amount) - numberValue(row.collected_amount), 0) + numberValue(row.prior_balance_amount);
}

function chargeHasOpenBalance(row: RentChargeRow) {
  if (chargeOutstandingAmount(row) > 0) {
    return true;
  }

  return row.status !== 'paid';
}

function currentMonthStartDateString() {
  const today = new Date();
  return new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), 1)).toISOString().slice(0, 10);
}

function cycleKeyForCharge(row: Pick<RentChargeRow, 'unit_id' | 'month_label' | 'due_date'>) {
  return `${row.unit_id}:${row.month_label || row.due_date.slice(0, 7)}`;
}

function uniqueLatestCharges(
  rows: RentChargeRow[],
  paymentTotalsByCycle = new Map<string, number>()
) {
  const cyclesByUnit = new Map<string, RentChargeRow[]>();
  const currentMonthStart = currentMonthStartDateString();

  rows.forEach((row) => {
    const key = cycleKeyForCharge(row);
    const current = cyclesByUnit.get(key) ?? [];
    cyclesByUnit.set(key, [...current, row]);
  });

  const resolvedCycleRows = [...cyclesByUnit.values()].map((cycleRows) => {
    const baseRow = cycleRows.slice().sort((a, b) => {
      const collectedDelta = numberValue(b.collected_amount) - numberValue(a.collected_amount);

      if (collectedDelta !== 0) {
        return collectedDelta;
      }

      const updatedAtDelta = (b.updated_at ?? '').localeCompare(a.updated_at ?? '');

      if (updatedAtDelta !== 0) {
        return updatedAtDelta;
      }

      const paymentDateDelta = (b.last_payment_date ?? '').localeCompare(a.last_payment_date ?? '');

      if (paymentDateDelta !== 0) {
        return paymentDateDelta;
      }

      return b.id.localeCompare(a.id);
    })[0];

    const cycleKey = cycleKeyForCharge(baseRow);
    const paymentBackedCollectedAmount = paymentTotalsByCycle.get(cycleKey) ?? 0;
    const recordedCollectedAmount = Math.max(...cycleRows.map((row) => numberValue(row.collected_amount)));
    const effectiveCollectedAmount = Math.max(recordedCollectedAmount, paymentBackedCollectedAmount);

    return {
      ...baseRow,
      collected_amount: effectiveCollectedAmount,
    } satisfies RentChargeRow;
  });

  const rowsByUnit = new Map<string, RentChargeRow[]>();

  resolvedCycleRows.forEach((row) => {
    const current = rowsByUnit.get(row.unit_id) ?? [];
    rowsByUnit.set(row.unit_id, [...current, row]);
  });

  return [...rowsByUnit.values()].map((unitRows) => {
    const currentAndFutureRows = unitRows.filter((row) => row.due_date >= currentMonthStart);
    const candidateRows = currentAndFutureRows.length > 0 ? currentAndFutureRows : unitRows;

    const unpaidRows = candidateRows
      .filter(chargeHasOpenBalance)
      .sort((a, b) => {
        const dueDateDelta = a.due_date.localeCompare(b.due_date);

        if (dueDateDelta !== 0) {
          return dueDateDelta;
        }

        const updatedAtDelta = (b.updated_at ?? '').localeCompare(a.updated_at ?? '');

        if (updatedAtDelta !== 0) {
          return updatedAtDelta;
        }

        const paymentDateDelta = (b.last_payment_date ?? '').localeCompare(a.last_payment_date ?? '');

        if (paymentDateDelta !== 0) {
          return paymentDateDelta;
        }

        return b.id.localeCompare(a.id);
      });

    if (unpaidRows.length > 0) {
      return unpaidRows[0];
    }

    return candidateRows.slice().sort((a, b) => {
      const dueDateDelta = b.due_date.localeCompare(a.due_date);

      if (dueDateDelta !== 0) {
        return dueDateDelta;
      }

      const paymentDateDelta = (b.last_payment_date ?? '').localeCompare(a.last_payment_date ?? '');

      if (paymentDateDelta !== 0) {
        return paymentDateDelta;
      }

      const updatedAtDelta = (b.updated_at ?? '').localeCompare(a.updated_at ?? '');

      if (updatedAtDelta !== 0) {
        return updatedAtDelta;
      }

      return b.id.localeCompare(a.id);
    })[0];
  });
}

export function paymentsBackendEnabled() {
  return !DEMO_MODE && Boolean(supabase) && backendAvailableForSession() && runtimeAuthSessionAvailable();
}

export function paymentsBackendError() {
  return supabaseConfigError ?? 'Supabase payments backend is unavailable.';
}

export async function fetchLedgerRowsFromBackend() {
  try {
    const ensureResult = await ensureCurrentMonthRentChargesForActiveTenantsInBackend();
    if (ensureResult.error) {
      throw new Error(ensureResult.error);
    }

    const client = requireSupabase();
    const primaryChargesResult = await client
      .from('rent_charges')
      .select(
        'id, tenant_id, property_id, unit_id, due_date, month_label, expected_amount, collected_amount, prior_balance_amount, status, last_payment_date, updated_at'
      )
      .eq('charge_type', 'rent')
      .order('due_date', { ascending: false });
    let charges: unknown = primaryChargesResult.data;
    let chargesError: unknown = primaryChargesResult.error;

    if (chargesError && isMissingPaymentColumnError(chargesError, 'updated_at')) {
      const legacyChargesResult = await client
        .from('rent_charges')
        .select(
          'id, tenant_id, property_id, unit_id, due_date, month_label, expected_amount, collected_amount, prior_balance_amount, status, last_payment_date'
        )
        .eq('charge_type', 'rent')
        .order('due_date', { ascending: false });
      charges = legacyChargesResult.data;
      chargesError = legacyChargesResult.error;
    }

    if (chargesError) {
      throw chargesError;
    }

    const rawChargeRows = (charges ?? []) as RentChargeRow[];

    if (rawChargeRows.length === 0) {
      return { data: [] as LedgerRow[], error: null };
    }

    const allUnitIds = [...new Set(rawChargeRows.map((row) => row.unit_id))];
    const allChargeIds = rawChargeRows.map((row) => row.id);

    const [
      { data: payments, error: paymentsError },
      { data: paymentChargeMetaRows, error: paymentChargeMetaError },
    ] = await Promise.all([
      client
        .from('rent_payments')
        .select('id, charge_id, tenant_id, property_id, unit_id, amount, payment_date, method, status, external_reference, note')
        .in('unit_id', allUnitIds)
        .order('payment_date', { ascending: false }),
      client
        .from('rent_charges')
        .select('id, charge_type, description, month_label, due_date')
        .in('id', allChargeIds),
    ]);

    if (paymentsError) {
      throw paymentsError;
    }

    if (paymentChargeMetaError) {
      throw paymentChargeMetaError;
    }

    const chargeMetaById = new Map(
      ((paymentChargeMetaRows ?? []) as PaymentChargeMetaRow[]).map((row) => [row.id, row])
    );
    const paymentTotalsByCycle = new Map<string, number>();
    ((payments ?? []) as RentPaymentRow[]).forEach((row) => {
      const chargeMeta = chargeMetaById.get(row.charge_id);

      if (chargeMeta && chargeMeta.charge_type !== 'rent') {
        return;
      }

      const cycleKey = `${row.unit_id}:${chargeMeta?.month_label || chargeMeta?.due_date?.slice(0, 7) || ''}`;
      if (!cycleKey.endsWith(':')) {
        paymentTotalsByCycle.set(cycleKey, (paymentTotalsByCycle.get(cycleKey) ?? 0) + numberValue(row.amount));
      }
    });

    const chargeRows = uniqueLatestCharges(rawChargeRows, paymentTotalsByCycle);

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

    const paymentsByCharge = new Map<string, RentPayment[]>();
    const paymentsByUnit = new Map<string, RentPayment[]>();
    ((payments ?? []) as RentPaymentRow[]).forEach((row) => {
      const chargeMeta = chargeMetaById.get(row.charge_id);

      if (chargeMeta && chargeMeta.charge_type !== 'rent') {
        return;
      }

      const mapped = toRentPayment(row, chargeMeta);
      const chargePayments = paymentsByCharge.get(mapped.chargeId) ?? [];
      paymentsByCharge.set(mapped.chargeId, [...chargePayments, mapped]);
      const current = paymentsByUnit.get(mapped.unitId) ?? [];
      paymentsByUnit.set(mapped.unitId, [...current, mapped]);
    });

    const propertyNames = new Map(((properties ?? []) as { id: string; name: string }[]).map((row) => [row.id, row.name]));
    const unitLabels = new Map(((units ?? []) as { id: string; label: string }[]).map((row) => [row.id, row.label]));
    const tenantNames = new Map(((tenants ?? []) as { id: string; full_name: string }[]).map((row) => [row.id, row.full_name]));

    const rows = chargeRows
      .map((charge) => {
        const expectedAmount = numberValue(charge.expected_amount);
        const chargePayments = paymentsByCharge.get(charge.id) ?? [];
        const recordedCollectedAmount = numberValue(charge.collected_amount);
        const paymentBackedCollectedAmount = chargePayments.reduce((sum, payment) => sum + payment.amount, 0);
        const collectedAmount = Math.max(recordedCollectedAmount, paymentBackedCollectedAmount);
        const priorBalanceAmount = numberValue(charge.prior_balance_amount);
        const effectiveStatus = deriveEffectiveRentStatus({
          dueDate: charge.due_date,
          expectedAmount,
          collectedAmount,
          status: charge.status,
        });

        return {
          chargeId: charge.id,
          tenantId: charge.tenant_id,
          propertyId: charge.property_id,
          propertyName: propertyNames.get(charge.property_id) ?? 'Property',
          unitId: charge.unit_id,
          unitLabel: unitLabels.get(charge.unit_id) ?? 'Unit',
          tenantName: charge.tenant_id ? tenantNames.get(charge.tenant_id) ?? 'Occupied' : 'Vacant',
          monthLabel: charge.month_label,
          priorBalanceAmount,
          expectedAmount,
          collectedAmount,
          pendingAmount: Math.max(expectedAmount - collectedAmount, 0),
          status: effectiveStatus,
          dueDate: charge.due_date,
          lastPaymentDate: charge.last_payment_date,
          recentPayments: paymentsByUnit.get(charge.unit_id) ?? [],
        } satisfies LedgerRow;
      })
      .sort((a, b) => a.propertyName.localeCompare(b.propertyName) || a.unitLabel.localeCompare(b.unitLabel));

    return { data: rows, error: null };
  } catch (error) {
    return {
      data: [] as LedgerRow[],
      error: normalizeBackendError(error) || 'Unable to fetch rent charges.',
    };
  }
}

export async function fetchPaymentHistoryFromBackend(filters?: { tenantId?: string | null }) {
  try {
    const client = requireSupabase();
    let query = client
      .from('rent_payments')
      .select('id, charge_id, tenant_id, property_id, unit_id, amount, payment_date, method, status, external_reference, note')
      .order('payment_date', { ascending: false });

    if (filters?.tenantId) {
      query = query.eq('tenant_id', filters.tenantId);
    }

    const { data, error } = await query;

    if (error) {
      throw error;
    }

    const paymentRows = (data ?? []) as RentPaymentRow[];
    const chargeIds = [...new Set(paymentRows.map((row) => row.charge_id).filter(Boolean))];
    let chargeMetaById = new Map<string, PaymentChargeMetaRow>();

    if (chargeIds.length > 0) {
      const { data: chargeMetaRows, error: chargeMetaError } = await client
        .from('rent_charges')
        .select('id, charge_type, description, month_label')
        .in('id', chargeIds);

      if (chargeMetaError) {
        throw chargeMetaError;
      }

      chargeMetaById = new Map(
        ((chargeMetaRows ?? []) as PaymentChargeMetaRow[]).map((row) => [row.id, row])
      );
    }

    return {
      data: paymentRows.map((row) => toRentPayment(row, chargeMetaById.get(row.charge_id))),
      error: null,
    };
  } catch (error) {
    return {
      data: [] as RentPayment[],
      error: normalizeBackendError(error) || 'Unable to fetch payment history.',
    };
  }
}

export async function recordPaymentInBackend(input: {
  chargeId: string;
  collectedAmount: number;
  paymentAmount?: number | null;
  expectedAmount?: number | null;
  status: RentStatus;
  paymentDate: string | null;
  dueDate: string;
  method?: PaymentMethod;
  note?: string;
  externalReference?: string | null;
}) {
  try {
    const client = requireSupabase();
    const { data: charge, error: chargeError } = await client
      .from('rent_charges')
      .select('id, tenant_id, property_id, unit_id, expected_amount, collected_amount')
      .eq('id', input.chargeId)
      .single();

    if (chargeError) {
      throw chargeError;
    }

    const expectedAmount = numberValue(charge.expected_amount);
    const nextExpectedAmount =
      input.expectedAmount != null ? Math.max(numberValue(input.expectedAmount), 0) : expectedAmount;
    const currentCollectedAmount = numberValue(charge.collected_amount);
    const requestedPaymentAmount = Math.max(input.paymentAmount ?? 0, 0);
    const nextCollectedAmount =
      input.paymentAmount != null
        ? Math.min(nextExpectedAmount, currentCollectedAmount + requestedPaymentAmount)
        : Math.min(nextExpectedAmount, Math.max(input.collectedAmount, 0));
    const paymentDelta = Math.max(nextCollectedAmount - currentCollectedAmount, 0);
    const effectiveStatus = deriveEffectiveRentStatus({
      dueDate: input.dueDate,
      expectedAmount: nextExpectedAmount,
      collectedAmount: nextCollectedAmount,
      status: input.status,
    });
    const effectivePaymentDate = paymentDelta > 0 ? input.paymentDate : input.paymentDate || null;

    const primaryChargeUpdate = await client
      .from('rent_charges')
      .update({
        expected_amount: nextExpectedAmount,
        collected_amount: nextCollectedAmount,
        status: effectiveStatus,
        due_date: input.dueDate,
        last_payment_date: effectivePaymentDate,
        updated_at: new Date().toISOString(),
      })
      .eq('id', input.chargeId);
    let updateError: unknown = primaryChargeUpdate.error;

    if (updateError && isMissingPaymentColumnError(updateError, 'updated_at')) {
      const legacyChargeUpdate = await client
        .from('rent_charges')
        .update({
          expected_amount: nextExpectedAmount,
          collected_amount: nextCollectedAmount,
          status: effectiveStatus,
          due_date: input.dueDate,
          last_payment_date: effectivePaymentDate,
        })
        .eq('id', input.chargeId);
      updateError = legacyChargeUpdate.error;
    }

    if (updateError) {
      throw updateError;
    }

    if (paymentDelta > 0 && effectivePaymentDate) {
      const primaryPaymentInsert = await client.from('rent_payments').insert({
        charge_id: input.chargeId,
        tenant_id: charge.tenant_id,
        property_id: charge.property_id,
        unit_id: charge.unit_id,
        amount: paymentDelta,
        payment_date: effectivePaymentDate,
        method: input.method ?? 'Manual update',
        status: 'posted',
        external_reference: input.externalReference ?? null,
        note: input.note ?? 'Recorded from admin payments flow.',
        updated_at: new Date().toISOString(),
      });
      let insertError: unknown = primaryPaymentInsert.error;

      if (insertError && isMissingPaymentColumnError(insertError, 'updated_at')) {
        const legacyPaymentInsert = await client.from('rent_payments').insert({
          charge_id: input.chargeId,
          tenant_id: charge.tenant_id,
          property_id: charge.property_id,
          unit_id: charge.unit_id,
          amount: paymentDelta,
          payment_date: effectivePaymentDate,
          method: input.method ?? 'Manual update',
          status: 'posted',
          external_reference: input.externalReference ?? null,
          note: input.note ?? 'Recorded from admin payments flow.',
        });
        insertError = legacyPaymentInsert.error;
      }

      if (insertError) {
        throw insertError;
      }
    }

    return { error: null };
  } catch (error) {
    return {
      error: normalizeBackendError(error) || 'Unable to record payment.',
    };
  }
}
