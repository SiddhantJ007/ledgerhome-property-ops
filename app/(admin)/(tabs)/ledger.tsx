import { useEffect, useMemo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { MetricCard } from '@/components/metric-card';
import { ScreenContainer } from '@/components/screen-container';
import { SectionCard } from '@/components/section-card';
import { StatusBadge, formatStatusLabel, rentStatusTone } from '@/components/status-badge';
import { fetchPaymentHistoryFromBackend, fetchLedgerRowsFromBackend } from '@/lib/payments-backend';
import { formatCurrency, formatShortDate } from '@/lib/prototype-ledger';
import { commonStyles } from '@/lib/theme';
import { useAuth } from '@/providers/auth-provider';
import type { LedgerRow, RentPayment } from '@/types/domain';

export default function AdminLedgerScreen() {
  const { isAuthenticated, isLoading: isAuthLoading } = useAuth();
  const [ledgerRows, setLedgerRows] = useState<LedgerRow[]>([]);
  const [payments, setPayments] = useState<RentPayment[]>([]);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    let isActive = true;

    async function loadLedgerContext() {
      if (isAuthLoading || !isAuthenticated) {
        return;
      }

      const [ledgerResult, paymentsResult] = await Promise.all([
        fetchLedgerRowsFromBackend(),
        fetchPaymentHistoryFromBackend(),
      ]);

      if (!isActive) {
        return;
      }

      if (ledgerResult.error || paymentsResult.error) {
        setMessage(
          ledgerResult.error ??
            paymentsResult.error ??
            'Unable to load the payments view right now.'
        );
      } else {
        setMessage(null);
      }

      setLedgerRows(ledgerResult.data);
      setPayments(paymentsResult.data);
    }

    void loadLedgerContext();

    return () => {
      isActive = false;
    };
  }, [isAuthenticated, isAuthLoading]);

  const summary = useMemo(() => {
    const rentExpected = ledgerRows.reduce((sum, row) => sum + row.expectedAmount, 0);
    const rentCollected = ledgerRows.reduce((sum, row) => sum + row.collectedAmount, 0);
    const rentOutstanding = ledgerRows.reduce((sum, row) => sum + row.pendingAmount + row.priorBalanceAmount, 0);
    return {
      rentExpected,
      rentCollected,
      rentOutstanding,
    };
  }, [ledgerRows]);

  return (
    <ScreenContainer
      eyebrow="Finance"
      title="Rent & Payments"
      subtitle="Cashflow view across rent collections and posted transactions.">
      {message ? <Text style={commonStyles.helperText}>{message}</Text> : null}

      <View style={commonStyles.grid}>
        <MetricCard label="Expected rent" value={formatCurrency(summary.rentExpected)} helper="Full charge for current cycle" />
        <MetricCard label="Collected" value={formatCurrency(summary.rentCollected)} helper={`${formatCurrency(summary.rentOutstanding)} still outstanding`} />
        <MetricCard label="Transactions" value={`${payments.length}`} helper="Posted rent payments" />
      </View>

      <SectionCard title="Rent charges" subtitle="Current-cycle receivables by occupied unit">
        {ledgerRows.length > 0 ? (
          ledgerRows.map((row) => (
            <View key={row.chargeId} style={styles.entryCard}>
              <View style={styles.entryHeader}>
                <View style={styles.copy}>
                  <Text style={styles.entryTitle}>{row.propertyName} • {row.unitLabel}</Text>
                  <Text style={commonStyles.helperText}>{row.tenantName}</Text>
                </View>
                <StatusBadge label={formatStatusLabel(row.status)} tone={rentStatusTone(row.status)} />
              </View>
              <Text style={commonStyles.helperText}>
                Expected {formatCurrency(row.expectedAmount)} • Collected {formatCurrency(row.collectedAmount)} • Outstanding {formatCurrency(row.pendingAmount + row.priorBalanceAmount)}
              </Text>
              <Text style={commonStyles.helperText}>Due {formatShortDate(row.dueDate)}</Text>
            </View>
          ))
        ) : (
          <Text style={commonStyles.helperText}>No rent charges are posted yet.</Text>
        )}
      </SectionCard>

      <SectionCard title="Recent transactions" subtitle="Latest posted rent movements">
        {payments.length > 0 ? (
          payments.slice(0, 8).map((payment) => (
            <View key={payment.id} style={styles.entryCard}>
              <Text style={styles.entryTitle}>{formatCurrency(payment.amount)}</Text>
              <Text style={commonStyles.helperText}>
                {payment.method} • {formatShortDate(payment.paymentDate)}
              </Text>
              <Text style={commonStyles.helperText}>{payment.note || payment.externalReference || payment.id}</Text>
            </View>
          ))
        ) : (
          <Text style={commonStyles.helperText}>No posted rent transactions are available yet.</Text>
        )}
      </SectionCard>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  entryCard: {
    backgroundColor: '#F7F2EA',
    borderRadius: 16,
    marginBottom: 12,
    padding: 14,
  },
  entryHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  copy: {
    flex: 1,
    paddingRight: 12,
  },
  entryTitle: {
    color: '#1F2933',
    fontSize: 15,
    fontWeight: '700',
  },
});
