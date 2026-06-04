import { useCallback, useEffect, useState } from 'react';
import { useFocusEffect, useRouter, type Href } from 'expo-router';
import { StyleSheet, Text, TextInput, View } from 'react-native';

import { OptionPillGroup } from '@/components/option-pill-group';
import { PrimaryButton } from '@/components/primary-button';
import { ScreenContainer } from '@/components/screen-container';
import { SectionCard } from '@/components/section-card';
import { formatStatusLabel } from '@/components/status-badge';
import { DEMO_MODE } from '@/lib/demo-mode';
import {
  fetchLedgerRowsFromBackend,
  paymentsBackendEnabled,
  recordPaymentInBackend,
} from '@/lib/payments-backend';
import { commonStyles, palette } from '@/lib/theme';
import { formatCurrency, getTodayDateString } from '@/lib/prototype-ledger';
import { usePrototype } from '@/providers/prototype-provider';
import type { LedgerRow, PaymentMethod, RentStatus } from '@/types/domain';

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

export default function RecordPaymentScreen() {
  const router = useRouter();
  const { ledgerRows, saveChargeUpdate } = usePrototype();
  const [backendRows, setBackendRows] = useState<LedgerRow[] | null>(null);
  const [backendMessage, setBackendMessage] = useState<string | null>(null);
  const usingBackend = !DEMO_MODE;
  const rows = DEMO_MODE ? ledgerRows : backendRows ?? [];
  const [chargeId, setChargeId] = useState(rows[0]?.chargeId ?? '');
  const selectedRow = rows.find((row) => row.chargeId === chargeId) ?? rows[0];
  const [amount, setAmount] = useState('');
  const [status, setStatus] = useState<RentStatus>(selectedRow?.status ?? 'pending');
  const [paymentDate, setPaymentDate] = useState(getTodayDateString());
  const [dueDate, setDueDate] = useState(selectedRow?.dueDate ?? getTodayDateString());
  const [method, setMethod] = useState<PaymentMethod>('Manual update');
  const [note, setNote] = useState('Recorded from admin payments flow.');
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [validationMessage, setValidationMessage] = useState<string | null>(null);

  const loadBackendRows = useCallback(async () => {
    if (!paymentsBackendEnabled()) {
      return;
    }

    const result = await fetchLedgerRowsFromBackend();

    if (result.error) {
      setBackendRows([]);
      setBackendMessage(result.error);
      return;
    }

    setBackendRows(result.data);
    setChargeId((current) => current || result.data[0]?.chargeId || '');
    setBackendMessage(
      result.data.length > 0
        ? null
        : 'No backend rent charges found yet.'
    );
  }, []);

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
  }, [loadBackendRows]);

  useFocusEffect(
    useCallback(() => {
      void loadBackendRows();
      return undefined;
    }, [loadBackendRows])
  );

  useEffect(() => {
    if (!selectedRow) {
      return;
    }

    setAmount('');
    setStatus(selectedRow.status);
    setPaymentDate(getTodayDateString());
    setDueDate(selectedRow.dueDate);
  }, [selectedRow]);

  const rawPaymentAmount = Number(amount || 0);
  const enteredPaymentAmount = Number.isFinite(rawPaymentAmount) ? rawPaymentAmount : 0;
  const nextCollectedAmount = selectedRow
    ? Math.min(selectedRow.expectedAmount, selectedRow.collectedAmount + Math.max(enteredPaymentAmount, 0))
    : 0;
  const previewStatus = selectedRow
    ? amount.trim()
      ? deriveStatus(selectedRow, dueDate, nextCollectedAmount)
      : status
    : status;

  return (
    <ScreenContainer
      eyebrow="Collections"
      title="Record Payment"
      subtitle="Fast admin entry for updating collections without opening the full payments screen.">
      <SectionCard title="Charge selection" subtitle="Pick the unit you want to update from the live ledger">
        <Text style={styles.label}>Charge / unit</Text>
        <OptionPillGroup
          onChange={setChargeId}
          options={rows.map((row) => ({
            label: `${row.unitLabel} • ${row.tenantName}`,
            value: row.chargeId,
          }))}
          selectedValue={chargeId}
        />

        {selectedRow ? (
          <View style={styles.summaryPanel}>
            <Text style={styles.summaryTitle}>{selectedRow.propertyName} • {selectedRow.tenantName}</Text>
            <Text style={commonStyles.helperText}>
              {selectedRow.unitLabel} • Collected {formatCurrency(selectedRow.collectedAmount)} • Remaining {formatCurrency(selectedRow.pendingAmount)}
            </Text>
          </View>
        ) : rows.length === 0 ? (
          <Text style={commonStyles.helperText}>
            {DEMO_MODE
              ? 'No charges are available right now.'
              : 'No rent charges are available yet, so there is nothing to post from this quick-entry form.'}
          </Text>
        ) : null}
      </SectionCard>

      <SectionCard title="Payment details" subtitle="Record the latest collection update and keep the ledger current">
        {backendMessage ? <Text style={commonStyles.helperText}>{backendMessage}</Text> : null}
        {saveMessage ? <Text style={commonStyles.helperText}>{saveMessage}</Text> : null}
        {validationMessage ? <Text style={styles.validationText}>{validationMessage}</Text> : null}

        <Text style={styles.label}>New payment received</Text>
        <TextInput
          keyboardType="numeric"
          onChangeText={setAmount}
          placeholder={selectedRow?.pendingAmount ? String(selectedRow.pendingAmount) : '0'}
          placeholderTextColor={palette.mutedText}
          style={styles.input}
          value={amount}
        />
        <Text style={commonStyles.helperText}>Enter the new payment amount only. The running total is updated automatically.</Text>

        <Text style={styles.label}>Status</Text>
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

        <View style={styles.row}>
          <View style={styles.fieldBlock}>
            <Text style={styles.label}>Payment date</Text>
            <TextInput onChangeText={setPaymentDate} placeholder="YYYY-MM-DD" placeholderTextColor={palette.mutedText} style={styles.input} value={paymentDate} />
          </View>
          <View style={styles.fieldBlock}>
            <Text style={styles.label}>Due date</Text>
            <TextInput onChangeText={setDueDate} placeholder="YYYY-MM-DD" placeholderTextColor={palette.mutedText} style={styles.input} value={dueDate} />
          </View>
        </View>

        <Text style={styles.label}>Payment method</Text>
        <OptionPillGroup
          onChange={(value) => setMethod(value as PaymentMethod)}
          options={[
            { label: 'Manual', value: 'Manual update' },
            { label: 'ACH', value: 'ACH transfer' },
            { label: 'Card', value: 'Card' },
            { label: 'Check', value: 'Check' },
          ]}
          selectedValue={method}
        />

        <Text style={styles.label}>Internal note</Text>
        <TextInput multiline onChangeText={setNote} placeholder="Add an internal note for this payment update." placeholderTextColor={palette.mutedText} style={[styles.input, styles.noteInput]} value={note} />

        {selectedRow ? (
          <View style={styles.summaryPanel}>
            <Text style={styles.summaryTitle}>Preview after save</Text>
            <Text style={commonStyles.helperText}>
              Collected {formatCurrency(nextCollectedAmount)} • Remaining {formatCurrency(Math.max(selectedRow.expectedAmount - nextCollectedAmount, 0))}
            </Text>
            <Text style={commonStyles.helperText}>Status {amount.trim() ? formatStatusLabel(previewStatus) : formatStatusLabel(status)}</Text>
          </View>
        ) : null}

        <View style={styles.actionRow}>
          <PrimaryButton
            label="Save payment update"
            disabled={!selectedRow}
            onPress={async () => {
              if (!selectedRow) {
                return;
              }

              if (!isValidDate(dueDate)) {
                setValidationMessage('Enter a valid due date in YYYY-MM-DD format.');
                return;
              }

              if (amount.trim()) {
                if (!isValidDate(paymentDate)) {
                  setValidationMessage('Enter a valid payment date in YYYY-MM-DD format.');
                  return;
                }

                if (Number.isNaN(enteredPaymentAmount) || enteredPaymentAmount <= 0) {
                  setValidationMessage('Enter a positive payment amount.');
                  return;
                }

                if (enteredPaymentAmount > selectedRow.pendingAmount) {
                  setValidationMessage('Payment cannot exceed the remaining balance for this charge.');
                  return;
                }
              }

              setValidationMessage(null);
              const effectivePaymentDate = amount.trim() ? paymentDate : selectedRow.lastPaymentDate ?? null;

              if (usingBackend) {
                const result = await recordPaymentInBackend({
                  chargeId: selectedRow.chargeId,
                  collectedAmount: nextCollectedAmount,
                  paymentAmount: amount.trim() ? enteredPaymentAmount : 0,
                  status: amount.trim() ? previewStatus : status,
                  paymentDate: effectivePaymentDate,
                  dueDate,
                  method,
                  note,
                });

                if (result.error) {
                  setSaveMessage(result.error);
                } else {
                  setBackendRows((current) =>
                    current
                      ? current.map((row) =>
                          row.chargeId === selectedRow.chargeId
                            ? {
                                ...row,
                                collectedAmount: nextCollectedAmount,
                                pendingAmount: Math.max(row.expectedAmount - nextCollectedAmount, 0),
                                status: amount.trim() ? previewStatus : status,
                                dueDate,
                                lastPaymentDate: effectivePaymentDate,
                              }
                            : row
                        )
                      : current
                  );
                  await loadBackendRows();
                  setSaveMessage('Payment recorded.');
                }
              } else {
                saveChargeUpdate(
                  selectedRow.chargeId,
                  nextCollectedAmount,
                  amount.trim() ? previewStatus : status,
                  effectivePaymentDate ?? '',
                  dueDate,
                  amount.trim() ? enteredPaymentAmount : 0
                );
                setSaveMessage('Payment recorded.');
              }

              router.replace('/(admin)/(tabs)/payments' as Href);
            }}
          />
        </View>
      </SectionCard>

      <SectionCard title="What happens next">
        <Text style={commonStyles.helperText}>Payments and dashboard totals update immediately after posting.</Text>
      </SectionCard>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  label: {
    color: palette.text,
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 8,
    marginTop: 12,
  },
  row: {
    flexDirection: 'row',
    gap: 10,
  },
  fieldBlock: {
    flex: 1,
  },
  input: {
    backgroundColor: '#FFFFFF',
    borderColor: palette.border,
    borderRadius: 14,
    borderWidth: 1,
    color: palette.text,
    minHeight: 46,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  noteInput: {
    minHeight: 90,
    textAlignVertical: 'top',
  },
  summaryPanel: {
    backgroundColor: palette.surfaceMuted,
    borderRadius: 16,
    marginTop: 12,
    padding: 12,
  },
  summaryTitle: {
    color: palette.text,
    fontSize: 14,
    fontWeight: '700',
  },
  validationText: {
    color: '#A3373A',
    fontSize: 12,
    fontWeight: '600',
    marginTop: 8,
  },
  actionRow: {
    marginTop: 16,
  },
});
