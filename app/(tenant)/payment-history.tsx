import { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { ScreenContainer } from '@/components/screen-container';
import { SectionCard } from '@/components/section-card';
import { StatusBadge, formatStatusLabel, paymentRecordTone } from '@/components/status-badge';
import { DEMO_MODE } from '@/lib/demo-mode';
import { fetchPaymentHistoryFromBackend, paymentsBackendEnabled } from '@/lib/payments-backend';
import { formatCurrency, formatShortDate } from '@/lib/prototype-ledger';
import { getDemoTenantContext } from '@/lib/tenant-demo';
import { commonStyles } from '@/lib/theme';
import { useAccess } from '@/providers/access-provider';
import { useMasterData } from '@/providers/master-data-provider';
import { usePrototype } from '@/providers/prototype-provider';
import type { RentPayment } from '@/types/domain';

export default function TenantPaymentHistoryScreen() {
  const { currentTenantId } = useAccess();
  const { data, masterDataMessage } = useMasterData();
  const { ledgerRows, maintenanceRows } = usePrototype();
  const { tenant, paymentHistory: fallbackPaymentHistory } = getDemoTenantContext(data, ledgerRows, maintenanceRows, currentTenantId);
  const [backendPayments, setBackendPayments] = useState<RentPayment[] | null>(null);
  const [backendMessage, setBackendMessage] = useState<string | null>(null);

  useEffect(() => {
    let isActive = true;

    async function loadHistory() {
      if (!paymentsBackendEnabled()) {
        return;
      }

      const result = await fetchPaymentHistoryFromBackend({ tenantId: currentTenantId ?? tenant?.id ?? undefined });

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
        result.data.length > 0
          ? null
          : 'No payment records are posted for this tenant yet.'
      );
    }

    void loadHistory();

    return () => {
      isActive = false;
    };
  }, [currentTenantId, tenant?.id]);

  const paymentHistory = DEMO_MODE ? fallbackPaymentHistory : backendPayments ?? [];

  return (
    <ScreenContainer
      eyebrow="Tenant Portal"
      title="Payment History"
      subtitle="Chronological record of posted payments for this account.">
      <SectionCard title="Transactions">
        {masterDataMessage ? <Text style={commonStyles.helperText}>{masterDataMessage}</Text> : null}
        {backendMessage ? <Text style={commonStyles.helperText}>{String(backendMessage)}</Text> : null}
        {paymentHistory.length > 0 ? paymentHistory.map((payment) => (
          <View key={payment.id} style={styles.transactionCard}>
            <View style={styles.row}>
              <View style={styles.copy}>
                <Text style={styles.amount}>{formatCurrency(payment.amount)}</Text>
                <Text style={styles.label}>
                  {payment.chargeLabel ?? 'Payment'} • {payment.method}
                </Text>
              </View>
              <StatusBadge label={formatStatusLabel(payment.status)} tone={paymentRecordTone(payment.status)} />
            </View>
            {payment.chargeDescription ? (
              <Text style={commonStyles.helperText}>
                {payment.chargeDescription}
                {payment.monthLabel ? ` • ${payment.monthLabel}` : ''}
              </Text>
            ) : payment.monthLabel ? (
              <Text style={commonStyles.helperText}>{payment.monthLabel}</Text>
            ) : null}
            <Text style={commonStyles.helperText}>Date: {formatShortDate(payment.paymentDate)}</Text>
            <Text style={commonStyles.helperText}>Reference: {payment.externalReference ?? payment.id}</Text>
            <Text style={commonStyles.helperText}>{payment.note}</Text>
          </View>
        )) : (
          <Text style={commonStyles.helperText}>No payment transactions have been posted yet.</Text>
        )}
      </SectionCard>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  transactionCard: {
    backgroundColor: '#F7F2EA',
    borderRadius: 18,
    marginBottom: 12,
    padding: 14,
  },
  row: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  copy: {
    flex: 1,
    paddingRight: 12,
  },
  amount: {
    color: '#1F2933',
    fontSize: 18,
    fontWeight: '800',
  },
  label: {
    color: '#416F62',
    fontSize: 13,
    fontWeight: '700',
  },
});
