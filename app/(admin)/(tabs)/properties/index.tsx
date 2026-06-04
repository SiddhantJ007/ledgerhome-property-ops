import { useEffect, useMemo, useState } from 'react';
import { useRouter, type Href } from 'expo-router';
import { Image, StyleSheet, Text, TextInput, View } from 'react-native';

import { ActionLink } from '@/components/action-link';
import { PrimaryButton } from '@/components/primary-button';
import { ScreenContainer } from '@/components/screen-container';
import { SectionCard } from '@/components/section-card';
import { StatusBadge, formatStatusLabel, propertyStatusTone, rentStatusTone } from '@/components/status-badge';
import { DEMO_MODE } from '@/lib/demo-mode';
import { fetchLedgerRowsFromBackend } from '@/lib/payments-backend';
import { formatCurrency } from '@/lib/prototype-ledger';
import { commonStyles, palette } from '@/lib/theme';
import { useAuth } from '@/providers/auth-provider';
import { useMasterData } from '@/providers/master-data-provider';
import type { LedgerRow } from '@/types/domain';

export default function PropertiesScreen() {
  const router = useRouter();
  const { isAuthenticated, isLoading: isAuthLoading } = useAuth();
  const { data, getPropertyDetailById, isMasterDataLoading, masterDataMessage } = useMasterData();
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

  const propertyCards = useMemo(() => {
    return data.properties.map((property) => {
      const units = data.units.filter((unit) => unit.propertyId === property.id);
      const firstAvailableUnit = units.find((unit) => unit.tenantId === null);
      const activeLedgerRows = (DEMO_MODE ? null : backendRows)?.filter((row) => row.propertyId === property.id) ?? [];
      const expectedRent = activeLedgerRows.reduce((sum, row) => sum + row.expectedAmount, 0);
      const collectedRent = activeLedgerRows.reduce((sum, row) => sum + row.collectedAmount, 0);
      const pendingRent = activeLedgerRows.reduce((sum, row) => sum + row.pendingAmount + row.priorBalanceAmount, 0);
      const overdueCount = activeLedgerRows.filter((row) => row.status === 'overdue').length;

      return {
        id: property.id,
        imageUrl: property.coverImageUrl,
        name: property.name,
        neighborhood:
          data.neighborhoods.find((neighborhood) => neighborhood.id === property.neighborhoodId)?.name ?? 'Unknown neighborhood',
        address: property.address,
        status: property.status,
        totalUnits: units.length,
        occupiedUnits: units.filter((unit) => unit.occupancyStatus === 'occupied').length,
        vacantUnits: units.filter((unit) => unit.occupancyStatus !== 'occupied').length,
        availableUnits: units.filter((unit) => unit.tenantId === null),
        firstAvailableUnitId: firstAvailableUnit?.id ?? null,
        expectedRent,
        collectedRent,
        pendingRent,
        overdueCount,
      };
    });
  }, [backendRows, data.neighborhoods, data.properties, data.units]);

  const filteredProperties = useMemo(() => {
    const normalizedQuery = searchQuery.trim().toLowerCase();

    if (!normalizedQuery) {
      return propertyCards;
    }

    return propertyCards.filter((property) => {
      const propertyDetail = getPropertyDetailById(property.id);
      const tenantMatches =
        propertyDetail?.units.some((unit) => unit.tenantName.toLowerCase().includes(normalizedQuery)) ?? false;
      const directPropertyMatches =
        property.name.toLowerCase().includes(normalizedQuery) ||
        property.address.toLowerCase().includes(normalizedQuery) ||
        property.neighborhood.toLowerCase().includes(normalizedQuery);

      return directPropertyMatches || tenantMatches;
    });
  }, [getPropertyDetailById, propertyCards, searchQuery]);

  const bestMatchRoute = useMemo(() => {
    const normalizedQuery = searchQuery.trim().toLowerCase();

    if (!normalizedQuery) {
      return null;
    }

    for (const property of propertyCards) {
      const propertyDetail = getPropertyDetailById(property.id);
      const matchedUnit = propertyDetail?.units.find(
        (unit) =>
          unit.tenantId &&
          unit.tenantName !== 'Unassigned' &&
          unit.tenantName.toLowerCase().includes(normalizedQuery)
      );

      if (matchedUnit?.tenantId) {
        return {
          href: { pathname: '/tenants/[tenantId]', params: { tenantId: matchedUnit.tenantId } } as Href,
          label: `Open ${matchedUnit.tenantName}`,
        };
      }
    }

    const propertyMatch = filteredProperties[0];

    if (!propertyMatch) {
      return null;
    }

    return {
      href: { pathname: '/properties/[propertyId]', params: { propertyId: propertyMatch.id } } as Href,
      label: `Open ${propertyMatch.name}`,
    };
  }, [filteredProperties, getPropertyDetailById, propertyCards, searchQuery]);

  const handleSearchNavigate = () => {
    if (!bestMatchRoute) {
      return;
    }

    router.push(bestMatchRoute.href);
  };

  const portfolioSummary = useMemo(
    () => ({
      properties: propertyCards.length,
      units: data.units.length,
      tenants: data.tenants.length,
      vacantUnits: data.units.filter((unit) => unit.tenantId === null).length,
    }),
    [data.tenants.length, data.units, propertyCards.length]
  );

  return (
    <ScreenContainer
      eyebrow="Portfolio"
      title="Properties"
      subtitle="Building view with occupancy, rent, and repair indicators.">
      <SectionCard title="Portfolio shortcuts" subtitle="Jump directly into buildings, units, or tenant records.">
        <View style={styles.metricsGrid}>
          <View style={styles.metricTile}>
            <Text style={styles.metricValue}>{portfolioSummary.properties}</Text>
            <Text style={styles.metricLabel}>Properties</Text>
          </View>
          <View style={styles.metricTile}>
            <Text style={styles.metricValue}>{portfolioSummary.units}</Text>
            <Text style={styles.metricLabel}>Units</Text>
          </View>
          <View style={styles.metricTile}>
            <Text style={styles.metricValue}>{portfolioSummary.tenants}</Text>
            <Text style={styles.metricLabel}>Tenants</Text>
          </View>
          <View style={styles.metricTile}>
            <Text style={styles.metricValue}>{portfolioSummary.vacantUnits}</Text>
            <Text style={styles.metricLabel}>Vacant units</Text>
          </View>
        </View>
        <ActionLink href="/properties/add" label="Add property" variant="primary" />
        <ActionLink href="/units" label="Open units" />
        <ActionLink href="/tenants" label="Open tenants" />
      </SectionCard>

      <SectionCard
        title="Search portfolio"
        subtitle="Find a property by building name or jump to a resident by searching the tenant name.">
        {masterDataMessage ? <Text style={commonStyles.helperText}>{masterDataMessage}</Text> : null}
        <Text style={styles.searchLabel}>Property or tenant</Text>
        <View style={styles.searchRow}>
          <TextInput
            onChangeText={setSearchQuery}
            onSubmitEditing={handleSearchNavigate}
            placeholder="Search a resident or property"
            placeholderTextColor={palette.mutedText}
            returnKeyType="search"
            style={styles.searchInput}
            value={searchQuery}
          />
          <View style={styles.searchButton}>
            <PrimaryButton
              label="Open"
              onPress={handleSearchNavigate}
              variant={bestMatchRoute ? 'primary' : 'secondary'}
            />
          </View>
        </View>
        {searchQuery.trim() ? (
          <Text style={commonStyles.helperText}>
            {filteredProperties.length} match{filteredProperties.length === 1 ? '' : 'es'} for &quot;{searchQuery.trim()}&quot;.
          </Text>
        ) : (
          <Text style={commonStyles.helperText}>
            Search uses both the property list and the tenants currently living there.
          </Text>
        )}
      </SectionCard>

      {isMasterDataLoading ? (
        <SectionCard title="Loading properties">
          <Text style={commonStyles.helperText}>Fetching property records.</Text>
        </SectionCard>
      ) : filteredProperties.length > 0 ? filteredProperties.map((property) => (
        <SectionCard
          key={property.id}
          title={property.name}
          subtitle={`${property.neighborhood} • ${property.address}`}>
          {property.imageUrl ? (
            <Image source={{ uri: property.imageUrl }} style={styles.coverImage} />
          ) : (
            <View style={styles.imagePlaceholder}>
              <Text style={styles.imagePlaceholderTitle}>No cover image</Text>
              <Text style={styles.imagePlaceholderCopy}>This property record is using live operational data only.</Text>
            </View>
          )}
          <View style={styles.statusRow}>
            <StatusBadge label={formatStatusLabel(property.status)} tone={propertyStatusTone(property.status)} />
            <StatusBadge
              label={property.overdueCount > 0 ? `${property.overdueCount} overdue` : 'collections stable'}
              tone={property.overdueCount > 0 ? rentStatusTone('overdue') : rentStatusTone('paid')}
            />
          </View>
          <View style={styles.metricsGrid}>
            <View style={styles.metricTile}>
              <Text style={styles.metricValue}>{property.totalUnits}</Text>
              <Text style={styles.metricLabel}>Total units</Text>
            </View>
            <View style={styles.metricTile}>
              <Text style={styles.metricValue}>
                {property.occupiedUnits}/{property.totalUnits}
              </Text>
              <Text style={styles.metricLabel}>Occupancy</Text>
            </View>
            <View style={styles.metricTile}>
              <Text style={styles.metricValue}>{formatCurrency(property.expectedRent)}</Text>
              <Text style={styles.metricLabel}>Expected rent</Text>
            </View>
            <View style={styles.metricTile}>
              <Text style={styles.metricValue}>{formatCurrency(property.collectedRent)}</Text>
              <Text style={styles.metricLabel}>Collected</Text>
            </View>
          </View>
          <Text style={commonStyles.helperText}>
            Pending {formatCurrency(property.pendingRent)} • Vacant {property.vacantUnits}
          </Text>
          <ActionLink
            href={{ pathname: '/properties/[propertyId]', params: { propertyId: property.id } }}
            label="Open property detail"
          />
          <ActionLink href="/tenants" label="View tenant records" />
          <ActionLink
            href={{ pathname: '/units/add', params: { propertyId: property.id } }}
            label="Add unit"
          />
          {property.firstAvailableUnitId ? (
            <ActionLink
              href={{
                pathname: '/tenants/add',
                params:
                  property.availableUnits.length === 1
                    ? { propertyId: property.id, unitId: property.firstAvailableUnitId }
                    : { propertyId: property.id },
              }}
              label={
                property.availableUnits.length === 1
                  ? `Add tenant to ${property.availableUnits[0]?.label ?? 'vacant unit'}`
                  : `Add tenant to ${property.availableUnits.length} vacant units`
              }
            />
          ) : null}
        </SectionCard>
      )) : (
        <SectionCard title="No matching properties">
          <Text style={commonStyles.helperText}>
            No property or resident matched &quot;{searchQuery.trim()}&quot;. Try a building name, address, neighborhood, or tenant name.
          </Text>
        </SectionCard>
      )}
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  searchLabel: {
    color: palette.text,
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 8,
  },
  searchInput: {
    backgroundColor: '#FFFFFF',
    borderColor: palette.border,
    borderRadius: 14,
    borderWidth: 1,
    color: palette.text,
    flex: 1,
    minHeight: 46,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  searchRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 10,
  },
  searchButton: {
    minWidth: 96,
  },
  coverImage: {
    borderRadius: 16,
    height: 156,
    marginBottom: 14,
    marginTop: 2,
    width: '100%',
  },
  imagePlaceholder: {
    alignItems: 'flex-start',
    backgroundColor: palette.surfaceMuted,
    borderColor: palette.border,
    borderRadius: 16,
    borderWidth: 1,
    justifyContent: 'center',
    marginBottom: 14,
    marginTop: 2,
    minHeight: 156,
    padding: 18,
    width: '100%',
  },
  imagePlaceholderTitle: {
    color: palette.text,
    fontSize: 16,
    fontWeight: '700',
  },
  imagePlaceholderCopy: {
    color: palette.mutedText,
    fontSize: 13,
    lineHeight: 19,
    marginTop: 6,
  },
  statusRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 14,
  },
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 8,
  },
  metricTile: {
    backgroundColor: palette.surfaceMuted,
    borderRadius: 16,
    minWidth: '47%',
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
});
