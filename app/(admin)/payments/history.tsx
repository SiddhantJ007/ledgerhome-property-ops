import { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { ScreenContainer } from '@/components/screen-container';
import { SectionCard } from '@/components/section-card';
import { StatusBadge, formatStatusLabel, paymentRecordTone } from '@/components/status-badge';
import { DEMO_MODE } from '@/lib/demo-mode';
import { fetchPaymentHistoryFromBackend, paymentsBackendEnabled } from '@/lib/payments-backend';
import { formatCurrency, formatShortDate } from '@/lib/prototype-ledger';
import { commonStyles } from '@/lib/theme';
import { usePrototype } from '@/providers/prototype-provider';
import type { RentPayment } from '@/types/domain';

export default function PaymentHistoryScreen() {
  const { data } = usePrototype();
  const [backendPayments, setBackendPayments] = useState<RentPayment[] | null>(null);
  const [backendMessage, setBackendMessage] = useState<string | null>(null);

  useEffect(() => {
    let isActive = true;

    async function loadHistory() {
      if (!paymentsBackendEnabled()) {
        return;
      }

      const result = await fetchPaymentHistoryFromBackend();

      if (!isActive) {
        return;
      }

      if (result.error) {
        setBackendPayments([]);
        setBackendMessage(result.error);
        return;
      }

      setBackendPayments(result.data);
      setBackendMessage(
        result.data.length > 0 ? null : 'No payment records are available yet.'
      );
    }

    void loadHistory();

    return () => {
      isActive = false;
    };
  }, []);

  const payments = DEMO_MODE ? data.rentPayments : backendPayments ?? [];

  return (
    <ScreenContainer
      eyebrow="Collections"
      title="Payment History"
      subtitle="Chronological payment records across the live rent ledger.">
      <SectionCard title="Recorded payments" subtitle="Posted transactions across the current portfolio">
        {backendMessage ? <Text style={commonStyles.helperText}>{backendMessage}</Text> : null}
        {payments.length > 0 ? (
          payments.map((entry) => (
            <View key={entry.id} style={styles.card}>
              <View style={styles.row}>
                <View style={styles.copy}>
                  <Text style={styles.title}>{formatCurrency(entry.amount)} • {entry.chargeLabel ?? 'Payment'}</Text>
                  <Text style={styles.meta}>
                    {entry.method}
                    {entry.monthLabel ? ` • ${entry.monthLabel}` : ''}
                  </Text>
                  <Text style={commonStyles.helperText}>{formatShortDate(entry.paymentDate)} • {entry.note}</Text>
                </View>
                <StatusBadge label={formatStatusLabel(entry.status)} tone={paymentRecordTone(entry.status)} />
              </View>
              {entry.chargeDescription ? (
                <Text style={commonStyles.helperText}>Charge: {entry.chargeDescription}</Text>
              ) : null}
              <Text style={commonStyles.helperText}>Reference: {entry.externalReference ?? entry.id}</Text>
              <Text style={commonStyles.helperText}>Charge ID: {entry.chargeId}</Text>
            </View>
          ))
        ) : (
          <Text style={commonStyles.helperText}>
            No payment records are available yet.
          </Text>
        )}
      </SectionCard>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#F7F2EA',
    borderRadius: 18,
    marginBottom: 12,
    padding: 14,
  },
  row: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  copy: {
    flex: 1,
    paddingRight: 12,
  },
  title: {
    color: '#1F2933',
    fontSize: 15,
    fontWeight: '700',
  },
  meta: {
    color: '#416F62',
    fontSize: 13,
    fontWeight: '700',
    marginTop: 2,
  },
});
