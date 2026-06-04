import { useFocusEffect, useRouter, type Href } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { MetricCard } from '@/components/metric-card';
import { PrimaryButton } from '@/components/primary-button';
import { ScreenContainer } from '@/components/screen-container';
import { SectionCard } from '@/components/section-card';
import { StatusBadge, formatStatusLabel, rentStatusTone } from '@/components/status-badge';
import { DEMO_MODE } from '@/lib/demo-mode';
import { fetchLedgerRowsFromBackend, paymentsBackendEnabled } from '@/lib/payments-backend';
import { fetchSupplementalChargeRowsFromBackend } from '@/lib/property-charge-configs-backend';
import { formatCurrency, formatShortDate } from '@/lib/prototype-ledger';
import { getDemoTenantContext } from '@/lib/tenant-demo';
import { commonStyles } from '@/lib/theme';
import { useAccess } from '@/providers/access-provider';
import { useMasterData } from '@/providers/master-data-provider';
import { usePrototype } from '@/providers/prototype-provider';
import type { LedgerRow, SupplementalChargeRow } from '@/types/domain';

export default function TenantLedgerScreen() {
  const router = useRouter();
  const { currentTenantId } = useAccess();
  const { data, masterDataMessage } = useMasterData();
  const { ledgerRows, maintenanceRows } = usePrototype();
  const [backendRows, setBackendRows] = useState<LedgerRow[] | null>(null);
  const [supplementalCharges, setSupplementalCharges] = useState<SupplementalChargeRow[] | null>(null);
  const [backendMessage, setBackendMessage] = useState<string | null>(null);
  const { tenant, rentRow: fallbackRentRow } = getDemoTenantContext(data, ledgerRows, maintenanceRows, currentTenantId);

  async function loadBackendLedger() {
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
    setBackendMessage(
      result.data.length > 0
        ? null
        : 'No rent charges are posted for this account yet.'
    );
  }

  useEffect(() => {
    let isActive = true;
    void (async () => {
      await loadBackendLedger();

      if (!isActive) {
        return;
      }
    })();

    return () => {
      isActive = false;
    };
  }, []);

  useFocusEffect(
    useCallback(() => {
      void loadBackendLedger();
      return undefined;
    }, [])
  );

  useEffect(() => {
    let isActive = true;

    async function loadSupplementalCharges() {
      if (!paymentsBackendEnabled()) {
        return;
      }

      const result = await fetchSupplementalChargeRowsFromBackend({
        tenantId: currentTenantId ?? tenant?.id ?? undefined,
        unitId: tenant?.unitId,
      });

      if (!isActive || result.error) {
        return;
      }

      setSupplementalCharges(result.data);
    }

    void loadSupplementalCharges();

    return () => {
      isActive = false;
    };
  }, [currentTenantId, tenant?.id, tenant?.unitId]);

  const rentRow = DEMO_MODE
    ? fallbackRentRow
    : (backendRows ?? []).find((item) => item.unitId === tenant?.unitId && item.tenantName !== 'Vacant');
  const activeSupplementalCharges = DEMO_MODE ? [] : (supplementalCharges ?? []).filter((item) => item.unitId === tenant?.unitId);
  const supplementalDue = activeSupplementalCharges.reduce((sum, item) => sum + item.pendingAmount, 0);
  const outstandingBalance = (rentRow?.pendingAmount ?? 0) + supplementalDue;
  const totalDue = outstandingBalance;
  const rentCycleHelper = rentRow?.monthLabel ? `${rentRow.monthLabel} charge` : 'Next rent charge appears 5 days before the next due date';
  const totalDueHelper = rentRow?.dueDate ? `Due ${formatShortDate(rentRow.dueDate)}` : 'No due date recorded';

  return (
    <ScreenContainer
      eyebrow="Tenant Portal"
      title="Rent & Payments"
      subtitle="Breakdown of current rent, prior balance, and amount owed.">
      {masterDataMessage ? <Text style={commonStyles.helperText}>{masterDataMessage}</Text> : null}
      {backendMessage ? <Text style={commonStyles.helperText}>{backendMessage}</Text> : null}
      <View style={commonStyles.grid}>
        <MetricCard label="Current month rent" value={formatCurrency(rentRow?.expectedAmount ?? 0)} helper={rentCycleHelper} />
        <MetricCard label="Amount owed" value={formatCurrency(totalDue)} helper={totalDueHelper} />
        <MetricCard
          label="Collected"
          value={formatCurrency(rentRow?.collectedAmount ?? 0)}
          helper={formatStatusLabel(rentRow?.status ?? 'pending')}
        />
      </View>

      {rentRow ? (
        <SectionCard title="Current statement">
          <View style={styles.statementRow}>
            <View>
              <Text style={styles.amount}>{formatCurrency(totalDue)}</Text>
              <Text style={commonStyles.helperText}>Amount owed this cycle</Text>
            </View>
            <StatusBadge label={formatStatusLabel(rentRow.status)} tone={rentStatusTone(rentRow.status)} />
          </View>

          <View style={styles.entry}>
            <Text style={styles.entryTitle}>Monthly rent</Text>
            <Text style={styles.entryAmount}>{formatCurrency(rentRow.expectedAmount)}</Text>
          </View>
          <View style={styles.entry}>
            <Text style={styles.entryTitle}>Additional charges</Text>
            <Text style={styles.entryAmount}>{formatCurrency(supplementalDue)}</Text>
          </View>
          <View style={styles.entry}>
            <Text style={styles.entryTitle}>Outstanding balance</Text>
            <Text style={styles.entryAmount}>{formatCurrency(outstandingBalance)}</Text>
          </View>
          <View style={styles.entry}>
            <Text style={styles.entryTitle}>Collected this month</Text>
            <Text style={styles.entryAmount}>{formatCurrency(rentRow.collectedAmount)}</Text>
          </View>

          {activeSupplementalCharges.length > 0 ? (
            <>
              <Text style={styles.sectionLabel}>Additional charges</Text>
              {activeSupplementalCharges.map((charge) => (
                <View key={charge.chargeId} style={styles.entry}>
                  <View>
                    <Text style={styles.entryTitle}>{charge.description}</Text>
                    <Text style={commonStyles.helperText}>
                      {charge.monthLabel} • Due {formatShortDate(charge.dueDate)}
                    </Text>
                  </View>
                  <Text style={styles.entryAmount}>{formatCurrency(charge.pendingAmount)}</Text>
                </View>
              ))}
            </>
          ) : null}

          <View style={styles.actionRow}>
            <PrimaryButton label="View payment history" onPress={() => router.push('/(tenant)/payment-history' as Href)} />
          </View>
        </SectionCard>
      ) : (
        <SectionCard title="Current statement">
          <Text style={commonStyles.helperText}>
            No current rent charge is posted yet. The next rent charge appears automatically 5 days before the next due date.
          </Text>
        </SectionCard>
      )}
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  statementRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  amount: {
    color: '#1F2933',
    fontSize: 26,
    fontWeight: '800',
  },
  entry: {
    borderBottomColor: '#EEE6DA',
    borderBottomWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 12,
  },
  entryTitle: {
    color: '#1F2933',
    fontSize: 14,
    fontWeight: '600',
  },
  entryAmount: {
    color: '#1F2933',
    fontSize: 14,
    fontWeight: '700',
  },
  actionRow: {
    marginTop: 16,
  },
  sectionLabel: {
    color: '#1F2933',
    fontSize: 14,
    fontWeight: '700',
    marginTop: 14,
  },
});
