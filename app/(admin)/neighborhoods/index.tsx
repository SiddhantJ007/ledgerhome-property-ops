import { useMemo, useState } from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';

import { ActionLink } from '@/components/action-link';
import { ScreenContainer } from '@/components/screen-container';
import { SectionCard } from '@/components/section-card';
import { StatusBadge, propertyStatusTone } from '@/components/status-badge';
import { commonStyles, palette } from '@/lib/theme';
import { useMasterData } from '@/providers/master-data-provider';

export default function NeighborhoodsScreen() {
  const { data, isMasterDataLoading, masterDataMessage } = useMasterData();
  const [searchQuery, setSearchQuery] = useState('');

  const filteredNeighborhoods = useMemo(() => {
    const normalizedQuery = searchQuery.trim().toLowerCase();

    if (!normalizedQuery) {
      return data.neighborhoods;
    }

    return data.neighborhoods.filter((neighborhood) => {
      const propertyMatches = data.properties.some(
        (property) =>
          property.neighborhoodId === neighborhood.id &&
          property.name.toLowerCase().includes(normalizedQuery)
      );

      return (
        neighborhood.name.toLowerCase().includes(normalizedQuery) ||
        neighborhood.city.toLowerCase().includes(normalizedQuery) ||
        neighborhood.stateCode.toLowerCase().includes(normalizedQuery) ||
        propertyMatches
      );
    });
  }, [data.neighborhoods, data.properties, searchQuery]);

  return (
    <ScreenContainer
      eyebrow="Neighborhoods"
      title="Neighborhoods"
      subtitle="Manage the state and neighborhood hierarchy that powers property setup.">
      <SectionCard title="Quick actions">
        <ActionLink href="/neighborhoods/add" label="Add neighborhood" variant="primary" />
      </SectionCard>

      <SectionCard
        title="Search neighborhood map"
        subtitle="Search by state, neighborhood, city, or one of the properties placed there.">
        {masterDataMessage ? <Text style={commonStyles.helperText}>{masterDataMessage}</Text> : null}
        <TextInput
          onChangeText={setSearchQuery}
          placeholder="Search Downtown Core or NY"
          placeholderTextColor={palette.mutedText}
          style={styles.input}
          value={searchQuery}
        />
      </SectionCard>

      {isMasterDataLoading ? (
        <SectionCard title="Loading neighborhoods">
          <Text style={commonStyles.helperText}>Fetching neighborhood records.</Text>
        </SectionCard>
      ) : filteredNeighborhoods.length > 0 ? (
        filteredNeighborhoods.map((neighborhood) => {
          const propertyCount = data.properties.filter(
            (property) => property.neighborhoodId === neighborhood.id
          ).length;

          return (
            <SectionCard
              key={neighborhood.id}
              title={neighborhood.name}
              subtitle={`${neighborhood.stateCode} • ${neighborhood.city}`}>
              <View style={styles.statusRow}>
                <StatusBadge
                  label={neighborhood.isActive ? 'Active' : 'Inactive'}
                  tone={propertyStatusTone(neighborhood.isActive ? 'active' : 'inactive')}
                />
                <Text style={commonStyles.helperText}>{propertyCount} propert{propertyCount === 1 ? 'y' : 'ies'}</Text>
              </View>
              <Text style={commonStyles.helperText}>{neighborhood.note}</Text>
              <ActionLink
                href={{
                  pathname: '/neighborhoods/[neighborhoodId]',
                  params: { neighborhoodId: neighborhood.id },
                }}
                label="Edit neighborhood"
              />
            </SectionCard>
          );
        })
      ) : (
        <SectionCard title="No matching neighborhoods">
          <Text style={commonStyles.helperText}>
            No neighborhood matched &quot;{searchQuery.trim()}&quot;.
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
  statusRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 10,
    marginBottom: 10,
  },
});
