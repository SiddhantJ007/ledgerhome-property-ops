import { useLocalSearchParams } from 'expo-router';
import { Text } from 'react-native';

import { ActionLink } from '@/components/action-link';
import { ScreenContainer } from '@/components/screen-container';
import { SectionCard } from '@/components/section-card';
import { formatCurrency, formatShortDate } from '@/lib/prototype-ledger';
import { StatusBadge, formatStatusLabel, occupancyTone, rentStatusTone } from '@/components/status-badge';
import { commonStyles } from '@/lib/theme';
import { useMasterData } from '@/providers/master-data-provider';
import { usePrototype } from '@/providers/prototype-provider';

export default function UnitDetailScreen() {
  const { unitId } = useLocalSearchParams<{ unitId: string }>();
  const { data, masterDataMessage } = useMasterData();
  const { ledgerRows } = usePrototype();
  const unit = data.units.find((item) => item.id === unitId) ?? data.units[0];
  const tenant = data.tenants.find((item) => item.unitId === unit.id);
  const ledger = ledgerRows.find((item) => item.unitId === unit.id);

  return (
    <ScreenContainer title={unit.label} subtitle={`${unit.bedrooms} bed • ${unit.bathrooms} bath`}>
      {masterDataMessage ? (
        <SectionCard title="Data source">
          <Text style={commonStyles.helperText}>{masterDataMessage}</Text>
        </SectionCard>
      ) : null}
      <SectionCard title="Current status">
        <StatusBadge label={formatStatusLabel(unit.occupancyStatus)} tone={occupancyTone(unit.occupancyStatus)} />
        <Text style={commonStyles.bodyText}>Rent: {formatCurrency(unit.monthlyRent)}</Text>
        <Text style={commonStyles.helperText}>
          Rent charge: {ledger ? `${formatStatusLabel(ledger.status)} • due ${formatShortDate(ledger.dueDate)}` : 'No current charge'}
        </Text>
      </SectionCard>

      <SectionCard title="Actions">
        {tenant ? (
          <ActionLink
            href={{ pathname: '/tenants/[tenantId]', params: { tenantId: tenant.id } }}
            label="Open tenant record"
            variant="primary"
          />
        ) : (
          <ActionLink
            href={{ pathname: '/tenants/add', params: { propertyId: unit.propertyId, unitId: unit.id } }}
            label="Add tenant to this unit"
            variant="primary"
          />
        )}
        <ActionLink
          href={{ pathname: '/properties/[propertyId]', params: { propertyId: unit.propertyId } }}
          label="Open property"
        />
        <ActionLink href="/payments/history" label="View payment history" />
      </SectionCard>

      <SectionCard title="Assigned tenant">
        {tenant ? (
          <>
            <ActionLink
              href={{ pathname: '/tenants/[tenantId]', params: { tenantId: tenant.id } }}
              label={`${tenant.fullName} • ${formatStatusLabel(tenant.status)}`}
            />
            {ledger ? <StatusBadge label={formatStatusLabel(ledger.status)} tone={rentStatusTone(ledger.status)} /> : null}
          </>
        ) : (
          <Text style={commonStyles.helperText}>No tenant assigned yet.</Text>
        )}
      </SectionCard>
    </ScreenContainer>
  );
}
