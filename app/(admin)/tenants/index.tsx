import { useEffect, useMemo, useState } from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';

import { ActionLink } from '@/components/action-link';
import { ScreenContainer } from '@/components/screen-container';
import { SectionCard } from '@/components/section-card';
import { StatusBadge, formatStatusLabel, rentStatusTone } from '@/components/status-badge';
import { DEMO_MODE } from '@/lib/demo-mode';
import { fetchLedgerRowsFromBackend } from '@/lib/payments-backend';
import { formatCurrency, formatShortDate } from '@/lib/prototype-ledger';
import { commonStyles, palette } from '@/lib/theme';
import { useAuth } from '@/providers/auth-provider';
import { useMasterData } from '@/providers/master-data-provider';
import { usePrototype } from '@/providers/prototype-provider';
import type { LedgerRow } from '@/types/domain';

export default function TenantsScreen() {
  const { isAuthenticated, isLoading: isAuthLoading } = useAuth();
  const { data, isMasterDataLoading, masterDataMessage } = useMasterData();
  const { ledgerRows } = usePrototype();
  const [searchQuery, setSearchQuery] = useState('');
  const [backendRows, setBackendRows] = useState<LedgerRow[] | null>(null);

  useEffect(() => {
    let isActive = true;

    async function loadLedgerRows() {
      if (DEMO_MODE || isAuthLoading || !isAuthenticated) {
        setBackendRows(null);
        return;
      }

      const result = await fetchLedgerRowsFromBackend();

      if (!isActive || result.error) {
        return;
      }

      setBackendRows(result.data);
    }

    void loadLedgerRows();

    return () => {
      isActive = false;
    };
  }, [isAuthenticated, isAuthLoading]);

  const filteredTenants = useMemo(() => {
    const normalizedQuery = searchQuery.trim().toLowerCase();

    if (!normalizedQuery) {
      return data.tenants;
    }

    return data.tenants.filter((tenant) => {
      const unit = data.units.find((item) => item.id === tenant.unitId);
      const property = data.properties.find((item) => item.id === unit?.propertyId);

      return (
        tenant.fullName.toLowerCase().includes(normalizedQuery) ||
        (tenant.email?.toLowerCase().includes(normalizedQuery) ?? false) ||
        (unit?.label.toLowerCase().includes(normalizedQuery) ?? false) ||
        (property?.name.toLowerCase().includes(normalizedQuery) ?? false)
      );
    });
  }, [data.properties, data.tenants, data.units, searchQuery]);

  const tenantSummary = useMemo(() => {
    const activeTenants = data.tenants.filter((tenant) => tenant.status === 'active');
    const rows = DEMO_MODE ? ledgerRows : backendRows ?? [];

    return {
      total: data.tenants.length,
      active: activeTenants.length,
      former: data.tenants.filter((tenant) => tenant.status === 'former').length,
      amountOwed: rows.reduce((sum, row) => sum + row.pendingAmount + row.priorBalanceAmount, 0),
    };
  }, [backendRows, data.tenants, ledgerRows]);

  return (
    <ScreenContainer
      eyebrow="Residents"
      title="Tenants"
      subtitle="Manage residents individually and jump into their rent, lease, and message records.">
      <SectionCard title="Tenant shortcuts">
        <View style={styles.metricsGrid}>
          <View style={styles.metricTile}>
            <Text style={styles.metricValue}>{tenantSummary.total}</Text>
            <Text style={styles.metricLabel}>Tenant records</Text>
          </View>
          <View style={styles.metricTile}>
            <Text style={styles.metricValue}>{tenantSummary.active}</Text>
            <Text style={styles.metricLabel}>Active</Text>
          </View>
          <View style={styles.metricTile}>
            <Text style={styles.metricValue}>{tenantSummary.former}</Text>
            <Text style={styles.metricLabel}>Former</Text>
          </View>
          <View style={styles.metricTile}>
            <Text style={styles.metricValue}>{formatCurrency(tenantSummary.amountOwed)}</Text>
            <Text style={styles.metricLabel}>Amount owed</Text>
          </View>
        </View>
        <ActionLink href="/tenants/add" label="Add tenant" variant="primary" />
        <ActionLink href="/units" label="Open units" />
        <ActionLink href="/(admin)/(tabs)/properties" label="Open properties" />
      </SectionCard>

      <SectionCard title="Search residents">
        {masterDataMessage ? <Text style={commonStyles.helperText}>{masterDataMessage}</Text> : null}
        <TextInput
          onChangeText={setSearchQuery}
          placeholder="Search a resident or unit"
          placeholderTextColor={palette.mutedText}
          style={styles.input}
          value={searchQuery}
        />
      </SectionCard>

      {isMasterDataLoading ? (
        <SectionCard title="Loading tenants">
          <Text style={commonStyles.helperText}>Fetching resident records.</Text>
        </SectionCard>
      ) : filteredTenants.length > 0 ? filteredTenants.map((tenant) => {
        const unit = data.units.find((item) => item.id === tenant.unitId);
        const property = data.properties.find((item) => item.id === unit?.propertyId);
        const ledger = (DEMO_MODE ? ledgerRows : backendRows ?? []).find((item) => item.unitId === tenant.unitId);

        return (
          <SectionCard
            key={tenant.id}
            title={tenant.fullName}
            subtitle={`${property?.name ?? 'Unknown property'} • ${unit?.label ?? 'Unknown unit'}`}>
            <Text style={commonStyles.helperText}>
              Move-in {formatShortDate(tenant.moveInDate)} • Lease ends {formatShortDate(tenant.leaseEndDate)}
            </Text>
            <Text style={commonStyles.helperText}>{tenant.phone}</Text>
            {ledger ? (
              <StatusBadge label={formatStatusLabel(ledger.status)} tone={rentStatusTone(ledger.status)} />
            ) : (
              <Text style={commonStyles.helperText}>No current rent charge for this tenant yet.</Text>
            )}
            <ActionLink
              href={{ pathname: '/tenants/[tenantId]', params: { tenantId: tenant.id } }}
              label="Open tenant detail"
            />
            {unit ? (
              <ActionLink
                href={{ pathname: '/units/[unitId]', params: { unitId: unit.id } }}
                label="Open assigned unit"
              />
            ) : null}
            {property ? (
              <ActionLink
                href={{ pathname: '/properties/[propertyId]', params: { propertyId: property.id } }}
                label="Open property"
              />
            ) : null}
          </SectionCard>
        );
      }) : (
        <SectionCard title="No matching tenants">
          <Text style={commonStyles.helperText}>
            Add a unit before assigning a tenant. Resident records depend on the unit hierarchy.
          </Text>
        </SectionCard>
      )}
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 8,
  },
  metricTile: {
    backgroundColor: palette.surfaceMuted,
    borderRadius: 16,
    flexBasis: '47%',
    flexGrow: 1,
    minWidth: 132,
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  metricValue: {
    color: palette.text,
    fontSize: 17,
    fontWeight: '800',
  },
  metricLabel: {
    color: palette.mutedText,
    fontSize: 12,
    fontWeight: '600',
    marginTop: 4,
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
});
