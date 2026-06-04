import { useCallback, useEffect, useMemo, useState } from 'react';
import { useFocusEffect } from 'expo-router';
import { StyleSheet, Text, TextInput, View, useWindowDimensions } from 'react-native';

import { PrimaryButton } from '@/components/primary-button';
import { ScreenContainer } from '@/components/screen-container';
import { SectionCard } from '@/components/section-card';
import { OptionPillGroup } from '@/components/option-pill-group';
import { DEMO_MODE } from '@/lib/demo-mode';
import {
  fetchLedgerRowsFromBackend,
  recordPaymentInBackend,
} from '@/lib/payments-backend';
import {
  fetchSupplementalChargeRowsFromBackend,
} from '@/lib/property-charge-configs-backend';
import { StatusBadge, formatStatusLabel, rentStatusTone } from '@/components/status-badge';
import { formatCurrency, formatShortDate, getTodayDateString } from '@/lib/prototype-ledger';
import { commonStyles, palette } from '@/lib/theme';
import { useAuth } from '@/providers/auth-provider';
import { usePrototype } from '@/providers/prototype-provider';
import type { LedgerRow, RentStatus, SupplementalChargeRow } from '@/types/domain';

function isValidDate(value: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(new Date(`${value}T12:00:00`).getTime());
}

function deriveStatus(row: LedgerRow, dueDate: string, nextCollectedAmount: number): RentStatus {
  if (nextCollectedAmount >= row.expectedAmount) {
    return 'paid';
  }

  if (nextCollectedAmount > 0) {
    return 'partial';
  }

  return dueDate < getTodayDateString() ? 'overdue' : 'pending';
}

function currentMonthPrefix() {
  return getTodayDateString().slice(0, 7);
}

export default function PaymentsScreen() {
  const { width } = useWindowDimensions();
  const isCompact = width < 430;
  const { isAuthenticated, isLoading: isAuthLoading } = useAuth();
  const { dashboard, ledgerRows, saveChargeUpdate } = usePrototype();
  const [backendRows, setBackendRows] = useState<LedgerRow[] | null>(null);
  const [supplementalCharges, setSupplementalCharges] = useState<SupplementalChargeRow[] | null>(null);
  const [backendMessage, setBackendMessage] = useState<string | null>(null);
  const [propertyChargeMessage, setPropertyChargeMessage] = useState<string | null>(null);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);

  const loadBackendRows = useCallback(async () => {
    if (DEMO_MODE) {
      setBackendRows(null);
      setBackendMessage(null);
      return;
    }

    if (isAuthLoading) {
      return;
    }

    if (!isAuthenticated) {
      setBackendRows([]);
      setBackendMessage('Live payment records are not available yet.');
      return;
    }

    const result = await fetchLedgerRowsFromBackend();

    if (result.error) {
      setBackendRows([]);
      setBackendMessage(result.error);
      return;
    }

    setBackendRows(result.data);
    setBackendMessage(
      result.data.length > 0
        ? null
        : 'No rent charges are available yet.'
    );
  }, [isAuthLoading, isAuthenticated]);

  const loadSupplementalCharges = useCallback(async () => {
    if (DEMO_MODE) {
      setSupplementalCharges(null);
      setPropertyChargeMessage(null);
      return;
    }

    if (isAuthLoading || !isAuthenticated) {
      return;
    }

    const result = await fetchSupplementalChargeRowsFromBackend();

    if (result.error) {
      setSupplementalCharges([]);
      setPropertyChargeMessage(result.error);
      return;
    }

    setSupplementalCharges(result.data);
    setPropertyChargeMessage(null);
  }, [isAuthenticated, isAuthLoading]);

  useEffect(() => {
    let isActive = true;

    void (async () => {
      await loadBackendRows();

      if (!isActive) {
        return;
      }
    })();

    return () => {
      isActive = false;
    };
  }, [isAuthenticated, isAuthLoading, loadBackendRows]);

  useFocusEffect(
    useCallback(() => {
      void loadBackendRows();
      void loadSupplementalCharges();
      return undefined;
    }, [loadBackendRows, loadSupplementalCharges])
  );

  useEffect(() => {
    let isActive = true;
    void (async () => {
      await loadSupplementalCharges();
      if (!isActive) {
        return;
      }
    })();

    return () => {
      isActive = false;
    };
  }, [loadSupplementalCharges]);

  const usingBackend = !DEMO_MODE;
  const rows = useMemo(
    () => (DEMO_MODE ? ledgerRows : backendRows ?? []),
    [backendRows, ledgerRows]
  );
  const currentMonth = useMemo(() => currentMonthPrefix(), []);
  const currentMonthPayments = useMemo(() => {
    const seen = new Set<string>();

    return rows.reduce((sum, row) => {
      return (
        sum +
        row.recentPayments.reduce((paymentSum, payment) => {
          if (!payment.id || seen.has(payment.id) || !payment.paymentDate.startsWith(currentMonth)) {
            return paymentSum;
          }

          seen.add(payment.id);
          return paymentSum + payment.amount;
        }, 0)
      );
    }, 0);
  }, [currentMonth, rows]);
  const rentExpected = useMemo(
    () => rows.reduce((sum, row) => sum + row.expectedAmount, 0),
    [rows]
  );
  const rentCollected = useMemo(
    () => (DEMO_MODE ? rows.reduce((sum, row) => sum + row.collectedAmount, 0) : currentMonthPayments),
    [currentMonthPayments, rows]
  );
  const rentPending = useMemo(
    () =>
      rows.reduce(
        (sum, row) => sum + (row.dueDate <= getTodayDateString() ? row.pendingAmount + row.priorBalanceAmount : 0),
        0
      ),
    [rows]
  );
  const utilityPending = useMemo(
    () => (supplementalCharges ?? []).reduce((sum, item) => sum + item.pendingAmount, 0),
    [supplementalCharges]
  );
  const summary = useMemo(() => {
    if (DEMO_MODE) {
      return {
        expected: dashboard.expectedMonthlyRent,
        collected: dashboard.collectedThisMonth,
        pending: dashboard.pendingAmount,
        totalToCollect: dashboard.pendingAmount,
        utilitiesDue: 0,
      };
    }

    return {
      expected: rentExpected,
      collected: rentCollected,
      pending: rentPending,
      totalToCollect: rentPending + utilityPending,
      utilitiesDue: utilityPending,
    };
  }, [dashboard.collectedThisMonth, dashboard.expectedMonthlyRent, dashboard.pendingAmount, rentCollected, rentExpected, rentPending, utilityPending]);
  async function handleSave(
    chargeId: string,
    collectedAmount: number,
    paymentAmount: number,
    status: RentStatus,
    paymentDate: string | null,
    dueDate: string
  ) {
    setSaveMessage(null);

    if (usingBackend) {
      const result = await recordPaymentInBackend({
        chargeId,
        collectedAmount,
        paymentAmount,
        status,
        paymentDate,
        dueDate,
        method: 'Manual update',
        note: 'Updated from the admin payments screen.',
      });

      if (result.error) {
        setBackendMessage(result.error);
        setSaveMessage('Payment could not be saved.');
        return;
      }

      setBackendRows((current) =>
        current
          ? current.map((row) =>
              row.chargeId === chargeId
                ? {
                    ...row,
                    collectedAmount,
                    pendingAmount: Math.max(row.expectedAmount - collectedAmount, 0),
                    status,
                    dueDate,
                    lastPaymentDate: paymentDate,
                    recentPayments:
                      paymentAmount > 0 && paymentDate
                        ? [
                            {
                              id: `pending-${chargeId}-${paymentDate}`,
                              chargeId,
                              tenantId: row.tenantId,
                              propertyId: row.propertyId,
                              unitId: row.unitId,
                              chargeType: 'rent',
                              chargeLabel: 'Rent',
                              chargeDescription: 'Rent',
                              monthLabel: row.monthLabel,
                              amount: paymentAmount,
                              paymentDate,
                              method: 'Manual update',
                              status: 'posted',
                              externalReference: null,
                              note: 'Updated from the admin payments screen.',
                            },
                            ...row.recentPayments,
                          ]
                        : row.recentPayments,
                  }
                : row
            )
          : current
      );

      const refreshed = await fetchLedgerRowsFromBackend();

      if (!refreshed.error) {
        setBackendRows(refreshed.data);
        setBackendMessage(null);
      }

      setSaveMessage('Payment saved.');
      return;
    }

    saveChargeUpdate(chargeId, collectedAmount, status, paymentDate ?? '', dueDate, paymentAmount);
    setSaveMessage('Payment saved.');
  }

  async function handleSupplementalSave(
    chargeId: string,
    expectedAmount: number,
    collectedAmount: number,
    paymentAmount: number,
    status: RentStatus,
    paymentDate: string | null,
    dueDate: string
  ) {
    setSaveMessage(null);

    const result = await recordPaymentInBackend({
      chargeId,
      expectedAmount,
      collectedAmount,
      paymentAmount,
      status,
      paymentDate,
      dueDate,
      method: 'Manual update',
      note: 'Updated from the admin payments screen.',
    });

    if (result.error) {
      setPropertyChargeMessage(result.error);
      setSaveMessage('Charge update could not be saved.');
      return;
    }

    setSupplementalCharges((current) =>
      current
        ? current.map((charge) =>
            charge.chargeId === chargeId
              ? {
                  ...charge,
                  expectedAmount,
                  collectedAmount,
                  pendingAmount: Math.max(expectedAmount - collectedAmount, 0),
                  status,
                  dueDate,
                }
              : charge
          )
        : current
    );

    await loadSupplementalCharges();

    setSaveMessage('Charge update saved.');
  }

  return (
    <ScreenContainer
      eyebrow="Collections"
      title="Payments"
      subtitle="Rent and posted charges by unit with quick admin updates for status, amount, and date.">
      <SectionCard title="Collections overview">
        <View style={[styles.summaryRow, isCompact && styles.summaryRowCompact]}>
          <View style={[styles.summaryTile, styles.summaryTilePrimary, isCompact && styles.summaryTileWide]}>
            <Text style={styles.summaryLabel}>Total to collect</Text>
            <Text style={styles.summaryValue}>{formatCurrency(summary.totalToCollect)}</Text>
            <Text style={styles.summaryHelper}>Rent and posted charges</Text>
          </View>
          <View style={[styles.summaryTile, isCompact && styles.summaryTileHalf]}>
            <Text style={styles.summaryValue}>{formatCurrency(summary.expected)}</Text>
            <Text style={styles.summaryLabel}>Expected rent</Text>
          </View>
          <View style={[styles.summaryTile, isCompact && styles.summaryTileHalf]}>
            <Text style={styles.summaryValue}>{formatCurrency(summary.utilitiesDue)}</Text>
            <Text style={styles.summaryLabel}>Posted charges due</Text>
          </View>
          <View style={[styles.summaryTile, isCompact && styles.summaryTileHalf]}>
            <Text style={styles.summaryValue}>{formatCurrency(summary.collected)}</Text>
            <Text style={styles.summaryLabel}>Collected</Text>
          </View>
          <View style={[styles.summaryTile, isCompact && styles.summaryTileHalf]}>
            <Text style={styles.summaryValue}>{formatCurrency(summary.pending)}</Text>
            <Text style={styles.summaryLabel}>Rent outstanding</Text>
          </View>
        </View>
      </SectionCard>

      <SectionCard title="Rent payments" subtitle="Update collection status, amount, and dates from one place.">
        {backendMessage ? <Text style={commonStyles.helperText}>{backendMessage}</Text> : null}
        {saveMessage ? <Text style={commonStyles.helperText}>{saveMessage}</Text> : null}
        {rows.length > 0 ? (
          rows.map((row) => <LedgerEditor key={row.chargeId} isCompact={isCompact} row={row} onSave={handleSave} />)
        ) : (
          <Text style={commonStyles.helperText}>
            {DEMO_MODE
              ? 'No charges are available right now.'
              : 'No rent charges are available yet.'}
          </Text>
        )}
      </SectionCard>

      {(propertyChargeMessage || (supplementalCharges && supplementalCharges.length > 0)) ? (
        <SectionCard title="Posted resident charges" subtitle="Only charges already added to a resident account." collapsible defaultCollapsed>
          {propertyChargeMessage ? <Text style={commonStyles.helperText}>{propertyChargeMessage}</Text> : null}
          {supplementalCharges && supplementalCharges.length > 0
            ? supplementalCharges.map((charge) => (
                <SupplementalChargeEditor key={charge.chargeId} charge={charge} isCompact={isCompact} onSave={handleSupplementalSave} />
              ))
            : null}
        </SectionCard>
      ) : null}
    </ScreenContainer>
  );
}

function deriveSupplementalStatus(
  expectedAmount: number,
  dueDate: string,
  nextCollectedAmount: number
): RentStatus {
  if (nextCollectedAmount >= expectedAmount) {
    return 'paid';
  }

  if (nextCollectedAmount > 0) {
    return 'partial';
  }

  return dueDate < getTodayDateString() ? 'overdue' : 'pending';
}

function SupplementalChargeEditor({
  charge,
  isCompact,
  onSave,
}: {
  charge: SupplementalChargeRow;
  isCompact: boolean;
  onSave: (
    chargeId: string,
    expectedAmount: number,
    collectedAmount: number,
    paymentAmount: number,
    status: RentStatus,
    paymentDate: string | null,
    dueDate: string
  ) => void | Promise<void>;
}) {
  const [expectedAmount, setExpectedAmount] = useState(String(charge.expectedAmount));
  const [paymentAmount, setPaymentAmount] = useState('');
  const [status, setStatus] = useState<RentStatus>(charge.status);
  const [paymentDate, setPaymentDate] = useState(getTodayDateString());
  const [dueDate, setDueDate] = useState(charge.dueDate);
  const [validationMessage, setValidationMessage] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const parsedExpectedAmount = Number(expectedAmount || 0);
  const parsedPaymentAmount = Number(paymentAmount || 0);
  const nextExpectedAmount = Number.isFinite(parsedExpectedAmount) ? parsedExpectedAmount : 0;
  const enteredPaymentAmount = Number.isFinite(parsedPaymentAmount) ? parsedPaymentAmount : 0;
  const currentCollectedAmount = Math.max(charge.expectedAmount - charge.pendingAmount, 0);
  const nextCollectedAmount = Math.min(nextExpectedAmount, currentCollectedAmount + Math.max(enteredPaymentAmount, 0));
  const previewStatus = paymentAmount.trim()
    ? deriveSupplementalStatus(nextExpectedAmount, dueDate, nextCollectedAmount)
    : status;

  useEffect(() => {
    setExpectedAmount(String(charge.expectedAmount));
    setPaymentAmount('');
    setStatus(charge.status);
    setPaymentDate(getTodayDateString());
    setDueDate(charge.dueDate);
    setValidationMessage(null);
  }, [charge.chargeId, charge.dueDate, charge.expectedAmount, charge.status]);

  return (
    <View style={styles.chargeCard}>
      <View style={commonStyles.rowBetween}>
        <View style={styles.ledgerHeading}>
          <Text style={styles.ledgerTitle}>
            {charge.propertyName} • {charge.unitLabel}
          </Text>
          <Text style={commonStyles.helperText}>
            {charge.description} • {charge.monthLabel}
          </Text>
          <Text style={commonStyles.helperText}>{charge.tenantName}</Text>
        </View>
        <StatusBadge label={formatStatusLabel(previewStatus)} tone={rentStatusTone(previewStatus)} />
      </View>

      <View style={styles.ledgerStatRow}>
        <Text style={styles.statCopy}>Current expected {formatCurrency(charge.expectedAmount)}</Text>
        <Text style={styles.statCopy}>Pending {formatCurrency(charge.pendingAmount)}</Text>
      </View>

      <View style={[styles.fieldGrid, isCompact && styles.fieldGridCompact]}>
        <View style={styles.fieldBlock}>
          <Text style={styles.fieldLabel}>Expected amount</Text>
          <TextInput
            keyboardType="numeric"
            onChangeText={setExpectedAmount}
            placeholder="0"
            placeholderTextColor={palette.mutedText}
            style={styles.inlineInput}
            value={expectedAmount}
          />
        </View>
        <View style={styles.fieldBlock}>
          <Text style={styles.fieldLabel}>Due date</Text>
          <TextInput
            onChangeText={setDueDate}
            placeholder="YYYY-MM-DD"
            placeholderTextColor={palette.mutedText}
            style={styles.inlineInput}
            value={dueDate}
          />
        </View>
      </View>

      <Text style={styles.fieldLabel}>New payment received</Text>
      <TextInput
        keyboardType="numeric"
        onChangeText={setPaymentAmount}
        placeholder={charge.pendingAmount > 0 ? String(charge.pendingAmount) : '0'}
        placeholderTextColor={palette.mutedText}
        style={styles.inlineInput}
        value={paymentAmount}
      />

      <Text style={styles.fieldLabel}>Payment status</Text>
      <OptionPillGroup
        onChange={(value) => setStatus(value as RentStatus)}
        options={[
          { label: 'Paid', value: 'paid' },
          { label: 'Partial', value: 'partial' },
          { label: 'Pending', value: 'pending' },
          { label: 'Overdue', value: 'overdue' },
        ]}
        selectedValue={status}
      />

      <Text style={styles.fieldLabel}>Payment date</Text>
      <TextInput
        onChangeText={setPaymentDate}
        placeholder="YYYY-MM-DD"
        placeholderTextColor={palette.mutedText}
        style={styles.inlineInput}
        value={paymentDate}
      />

      {validationMessage ? <Text style={styles.errorText}>{validationMessage}</Text> : null}

      <View style={styles.saveRow}>
        <PrimaryButton
          disabled={isSaving}
          label={isSaving ? 'Saving...' : 'Save charge update'}
          loading={isSaving}
          onPress={async () => {
            if (!isValidDate(dueDate)) {
              setValidationMessage('Enter a valid due date in YYYY-MM-DD format.');
              return;
            }

            if (Number.isNaN(nextExpectedAmount) || nextExpectedAmount < 0) {
              setValidationMessage('Enter a valid expected amount.');
              return;
            }

            if (paymentAmount.trim()) {
              if (!isValidDate(paymentDate)) {
                setValidationMessage('Enter a valid payment date in YYYY-MM-DD format.');
                return;
              }

              if (Number.isNaN(enteredPaymentAmount) || enteredPaymentAmount <= 0) {
                setValidationMessage('Enter a positive payment amount.');
                return;
              }
            }

            setValidationMessage(null);
            setIsSaving(true);
            await onSave(
              charge.chargeId,
              nextExpectedAmount,
              nextCollectedAmount,
              paymentAmount.trim() ? enteredPaymentAmount : 0,
              paymentAmount.trim() ? previewStatus : status,
              paymentAmount.trim() ? paymentDate : null,
              dueDate
            );
            setIsSaving(false);
            setPaymentAmount('');
          }}
          variant="secondary"
        />
      </View>
    </View>
  );
}

function LedgerEditor({
  row,
  isCompact,
  onSave,
}: {
  row: LedgerRow;
  isCompact: boolean;
  onSave: (
    chargeId: string,
    collectedAmount: number,
    paymentAmount: number,
    status: RentStatus,
    paymentDate: string | null,
    dueDate: string
  ) => void | Promise<void>;
}) {
  const [paymentAmount, setPaymentAmount] = useState('');
  const [status, setStatus] = useState<RentStatus>(row.status);
  const [paymentDate, setPaymentDate] = useState(getTodayDateString());
  const [dueDate, setDueDate] = useState(row.dueDate);
  const [validationMessage, setValidationMessage] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const rawPaymentAmount = Number(paymentAmount || 0);
  const enteredPaymentAmount = Number.isFinite(rawPaymentAmount) ? rawPaymentAmount : 0;
  const nextCollectedAmount = Math.min(row.expectedAmount, row.collectedAmount + Math.max(enteredPaymentAmount, 0));
  const previewStatus = paymentAmount.trim()
    ? deriveStatus(row, dueDate, nextCollectedAmount)
    : status;

  useEffect(() => {
    setPaymentAmount('');
    setStatus(row.status);
    setPaymentDate(getTodayDateString());
    setDueDate(row.dueDate);
    setValidationMessage(null);
  }, [row.chargeId, row.dueDate, row.status, row.collectedAmount, row.pendingAmount]);

  return (
    <View style={styles.ledgerCard}>
      <View style={commonStyles.rowBetween}>
        <View style={styles.ledgerHeading}>
          <Text style={styles.ledgerTitle}>
            {row.propertyName} • {row.unitLabel}
          </Text>
          <Text style={commonStyles.helperText}>{row.tenantName}</Text>
        </View>
        <StatusBadge label={formatStatusLabel(previewStatus)} tone={rentStatusTone(previewStatus)} />
      </View>

      <View style={[styles.ledgerStatRow, isCompact && styles.ledgerStatRowCompact]}>
        <Text style={styles.statCopy}>Expected {formatCurrency(row.expectedAmount)}</Text>
        <Text style={styles.statCopy}>Collected {formatCurrency(row.collectedAmount)}</Text>
      </View>
      <View style={[styles.ledgerStatRow, isCompact && styles.ledgerStatRowCompact]}>
        <Text style={styles.statCopy}>Remaining {formatCurrency(row.pendingAmount)}</Text>
        <Text style={styles.statCopy}>After save {formatCurrency(Math.max(row.expectedAmount - nextCollectedAmount, 0))}</Text>
      </View>

      <Text style={styles.fieldLabel}>Payment status</Text>
      <OptionPillGroup
        onChange={(value) => setStatus(value as RentStatus)}
        options={[
          { label: 'Paid', value: 'paid' },
          { label: 'Partial', value: 'partial' },
          { label: 'Pending', value: 'pending' },
          { label: 'Overdue', value: 'overdue' },
        ]}
        selectedValue={status}
      />

      <View style={[styles.fieldGrid, isCompact && styles.fieldGridCompact]}>
        <View style={styles.fieldBlock}>
          <Text style={styles.fieldLabel}>New payment received</Text>
          <TextInput
            keyboardType="numeric"
            onChangeText={setPaymentAmount}
            placeholder={row.pendingAmount > 0 ? String(row.pendingAmount) : '0'}
            placeholderTextColor={palette.mutedText}
            style={styles.inlineInput}
            value={paymentAmount}
          />
          <Text style={commonStyles.helperText}>Enter the new payment amount, not the running total.</Text>
        </View>
        <View style={styles.fieldBlock}>
          <Text style={styles.fieldLabel}>Due date</Text>
          <TextInput onChangeText={setDueDate} placeholder="YYYY-MM-DD" placeholderTextColor={palette.mutedText} style={styles.inlineInput} value={dueDate} />
        </View>
      </View>

      <Text style={styles.fieldLabel}>Payment date</Text>
      <TextInput onChangeText={setPaymentDate} placeholder="YYYY-MM-DD" placeholderTextColor={palette.mutedText} style={styles.inlineInput} value={paymentDate} />
      {validationMessage ? <Text style={styles.errorText}>{validationMessage}</Text> : null}

      <Text style={styles.fieldLabel}>Recent payment history</Text>
      {row.recentPayments.length > 0 ? (
        row.recentPayments.slice(0, 2).map((payment) => (
          <View key={payment.id} style={styles.historyRow}>
            <Text style={styles.historyCopy}>{formatCurrency(payment.amount)} • {payment.method}</Text>
            <Text style={styles.historyMeta}>{formatShortDate(payment.paymentDate)}</Text>
          </View>
        ))
      ) : (
        <Text style={commonStyles.helperText}>No payment history posted for this charge yet.</Text>
      )}

      <View style={styles.saveRow}>
        <PrimaryButton
          disabled={isSaving}
          label={isSaving ? 'Saving...' : 'Save rent update'}
          loading={isSaving}
          onPress={async () => {
            if (!isValidDate(dueDate)) {
              setValidationMessage('Enter a valid due date in YYYY-MM-DD format.');
              return;
            }

            if (paymentAmount.trim()) {
              if (!isValidDate(paymentDate)) {
                setValidationMessage('Enter a valid payment date in YYYY-MM-DD format.');
                return;
              }

              if (Number.isNaN(enteredPaymentAmount) || enteredPaymentAmount <= 0) {
                setValidationMessage('Enter a positive payment amount.');
                return;
              }

              if (enteredPaymentAmount > row.pendingAmount) {
                setValidationMessage('Payment cannot exceed the remaining balance for this charge.');
                return;
              }
            }

            const effectivePaymentDate = paymentAmount.trim() ? paymentDate : row.lastPaymentDate ?? '';
            setValidationMessage(null);
            setIsSaving(true);
            await onSave(
              row.chargeId,
              nextCollectedAmount,
              paymentAmount.trim() ? enteredPaymentAmount : 0,
              paymentAmount.trim() ? previewStatus : status,
              effectivePaymentDate,
              dueDate
            );
            setIsSaving(false);
            setPaymentAmount('');
          }}
          variant="secondary"
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  summaryRow: {
    flexDirection: 'row',
    gap: 10,
    flexWrap: 'wrap',
  },
  summaryRowCompact: {
    gap: 8,
  },
  summaryTile: {
    backgroundColor: palette.surfaceMuted,
    borderColor: palette.border,
    borderRadius: 16,
    borderWidth: 1,
    flex: 1,
    padding: 12,
  },
  summaryTilePrimary: {
    backgroundColor: palette.cardSurfaceStrong,
  },
  summaryTileWide: {
    flexBasis: '100%',
    width: '100%',
  },
  summaryTileHalf: {
    flexBasis: '48%',
    minWidth: '48%',
  },
  summaryValue: {
    color: palette.text,
    fontSize: 18,
    fontWeight: '800',
  },
  summaryLabel: {
    color: palette.mutedText,
    fontSize: 12,
    fontWeight: '600',
    marginTop: 4,
  },
  summaryHelper: {
    color: palette.mutedText,
    fontSize: 11,
    marginTop: 6,
  },
  ledgerCard: {
    backgroundColor: palette.surfaceMuted,
    borderColor: palette.border,
    borderRadius: 18,
    borderWidth: 1,
    marginBottom: 12,
    padding: 14,
  },
  chargeCard: {
    backgroundColor: palette.surfaceMuted,
    borderColor: palette.border,
    borderRadius: 18,
    borderWidth: 1,
    marginBottom: 12,
    padding: 14,
  },
  ledgerHeading: {
    flex: 1,
    paddingRight: 12,
  },
  ledgerTitle: {
    color: palette.text,
    fontSize: 15,
    fontWeight: '800',
  },
  ledgerStatRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 14,
    marginBottom: 6,
    marginTop: 10,
  },
  ledgerStatRowCompact: {
    gap: 8,
  },
  statCopy: {
    color: palette.text,
    fontSize: 13,
    fontWeight: '600',
  },
  fieldGrid: {
    flexDirection: 'row',
    gap: 10,
  },
  fieldGridCompact: {
    flexDirection: 'column',
  },
  fieldBlock: {
    flex: 1,
  },
  fieldLabel: {
    color: palette.text,
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 8,
    marginTop: 10,
  },
  inlineInput: {
    backgroundColor: palette.surface,
    borderColor: palette.border,
    borderRadius: 14,
    borderWidth: 1,
    color: palette.text,
    minHeight: 46,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  historyRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 6,
  },
  historyCopy: {
    color: palette.text,
    fontSize: 13,
    fontWeight: '600',
  },
  historyMeta: {
    color: palette.mutedText,
    fontSize: 12,
  },
  errorText: {
    color: palette.danger,
    fontSize: 12,
    fontWeight: '600',
    marginTop: 8,
  },
  saveRow: {
    marginTop: 14,
  },
});
