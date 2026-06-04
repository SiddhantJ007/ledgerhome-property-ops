import { useEffect, useMemo, useState } from 'react';
import { StyleSheet, Text, TextInput } from 'react-native';

import { ActionLink } from '@/components/action-link';
import { ScreenContainer } from '@/components/screen-container';
import { SectionCard } from '@/components/section-card';
import { StatusBadge, formatStatusLabel, occupancyTone, rentStatusTone } from '@/components/status-badge';
import { DEMO_MODE } from '@/lib/demo-mode';
import { fetchLedgerRowsFromBackend } from '@/lib/payments-backend';
import { formatCurrency, formatShortDate } from '@/lib/prototype-ledger';
import { commonStyles, palette } from '@/lib/theme';
import { useAuth } from '@/providers/auth-provider';
import { useMasterData } from '@/providers/master-data-provider';
import { usePrototype } from '@/providers/prototype-provider';
import type { LedgerRow } from '@/types/domain';

export default function UnitsScreen() {
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

  const filteredUnits = useMemo(() => {
    const normalizedQuery = searchQuery.trim().toLowerCase();

    if (!normalizedQuery) {
      return data.units;
    }

    return data.units.filter((unit) => {
      const property = data.properties.find((item) => item.id === unit.propertyId);
      const tenant = data.tenants.find((item) => item.unitId === unit.id);

      return (
        unit.label.toLowerCase().includes(normalizedQuery) ||
        (property?.name.toLowerCase().includes(normalizedQuery) ?? false) ||
        (tenant?.fullName.toLowerCase().includes(normalizedQuery) ?? false)
      );
    });
  }, [data.properties, data.tenants, data.units, searchQuery]);

  return (
    <ScreenContainer
      eyebrow="Units"
      title="Units"
      subtitle="Review every rentable unit with its property, occupancy, and current rent status.">
      <SectionCard title="Quick actions">
        <ActionLink href="/units/add" label="Add unit" variant="primary" />
      </SectionCard>

      <SectionCard title="Search units">
        {masterDataMessage ? <Text style={commonStyles.helperText}>{masterDataMessage}</Text> : null}
        <TextInput
          onChangeText={setSearchQuery}
          placeholder="Search a unit label or resident name"
          placeholderTextColor={palette.mutedText}
          style={styles.input}
          value={searchQuery}
        />
      </SectionCard>

      {isMasterDataLoading ? (
        <SectionCard title="Loading units">
          <Text style={commonStyles.helperText}>Fetching unit records.</Text>
        </SectionCard>
      ) : filteredUnits.length > 0 ? filteredUnits.map((unit) => {
        const property = data.properties.find((item) => item.id === unit.propertyId);
        const tenant = data.tenants.find((item) => item.unitId === unit.id);
        const ledger = (DEMO_MODE ? ledgerRows : backendRows ?? []).find((item) => item.unitId === unit.id);

        return (
          <SectionCard
            key={unit.id}
            title={unit.label}
            subtitle={`${property?.name ?? 'Unknown property'} • ${unit.bedrooms} bed / ${unit.bathrooms} bath`}>
            <StatusBadge label={formatStatusLabel(unit.occupancyStatus)} tone={occupancyTone(unit.occupancyStatus)} />
            <Text style={commonStyles.bodyText}>Rent: {formatCurrency(unit.monthlyRent)}</Text>
            <Text style={commonStyles.helperText}>
              Resident: {tenant?.fullName ?? 'Unassigned'}
            </Text>
            <Text style={commonStyles.helperText}>
              {ledger
                ? `${formatStatusLabel(ledger.status)} • due ${formatShortDate(ledger.dueDate)}`
                : 'No active rent charge yet'}
            </Text>
            {ledger ? (
              <StatusBadge label={formatStatusLabel(ledger.status)} tone={rentStatusTone(ledger.status)} />
            ) : null}
            <ActionLink href={{ pathname: '/units/[unitId]', params: { unitId: unit.id } }} label="Open unit detail" />
            {property ? (
              <ActionLink
                href={{ pathname: '/properties/[propertyId]', params: { propertyId: property.id } }}
                label="Open property"
              />
            ) : null}
            {tenant ? (
              <ActionLink
                href={{ pathname: '/tenants/[tenantId]', params: { tenantId: tenant.id } }}
                label="Open tenant record"
              />
            ) : (
              <ActionLink
                href={{ pathname: '/tenants/add', params: { propertyId: property?.id ?? '', unitId: unit.id } }}
                label="Add tenant to this unit"
              />
            )}
          </SectionCard>
        );
      }) : (
        <SectionCard title="No matching units">
          <Text style={commonStyles.helperText}>
            Add a property first, then create units so the operational hierarchy stays intact.
          </Text>
        </SectionCard>
      )}
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
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
