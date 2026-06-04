import { useEffect, useState } from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { StyleSheet, Text, TextInput, View } from 'react-native';

import { ActionLink } from '@/components/action-link';
import { OptionPillGroup } from '@/components/option-pill-group';
import { PrimaryButton } from '@/components/primary-button';
import { ScreenContainer } from '@/components/screen-container';
import { SectionCard } from '@/components/section-card';
import { hasText, parsePositiveNumber } from '@/lib/form-utils';
import { commonStyles, palette } from '@/lib/theme';
import { useMasterData } from '@/providers/master-data-provider';
import type { OccupancyStatus } from '@/types/domain';

export default function AddUnitScreen() {
  const { propertyId: propertyIdParam } = useLocalSearchParams<{ propertyId?: string }>();
  const router = useRouter();
  const { data, createUnit, masterDataMessage } = useMasterData();
  const [propertyId, setPropertyId] = useState(propertyIdParam ?? data.properties[0]?.id ?? '');
  const [label, setLabel] = useState('');
  const [bedrooms, setBedrooms] = useState('2');
  const [bathrooms, setBathrooms] = useState('1');
  const [monthlyRent, setMonthlyRent] = useState('1850');
  const [occupancyStatus, setOccupancyStatus] = useState<OccupancyStatus>('vacant');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const selectedProperty = data.properties.find((item) => item.id === propertyId);

  useEffect(() => {
    const fallbackPropertyId = propertyIdParam ?? data.properties[0]?.id ?? '';

    if (!selectedProperty && fallbackPropertyId) {
      setPropertyId(fallbackPropertyId);
    }
  }, [data.properties, propertyIdParam, selectedProperty]);

  return (
    <ScreenContainer
      eyebrow="Admin setup"
      title="Create unit"
      subtitle="Add a rentable unit that immediately appears in the property rent and collections view.">
      <SectionCard title="Property selection" subtitle="Attach the new unit to an existing property">
        {data.properties.length > 0 ? (
          <>
            <Text style={styles.label}>Property</Text>
            <OptionPillGroup
              onChange={setPropertyId}
              options={data.properties.map((item) => ({ label: item.name, value: item.id }))}
              selectedValue={propertyId}
            />
            <View style={styles.summaryPanel}>
              <Text style={styles.summaryTitle}>{selectedProperty?.name ?? 'Property pending'}</Text>
              <Text style={commonStyles.helperText}>{selectedProperty?.address ?? 'Select a property to continue.'}</Text>
            </View>
          </>
        ) : (
          <View style={styles.summaryPanel}>
            <Text style={styles.summaryTitle}>No properties available yet</Text>
            <Text style={commonStyles.helperText}>
              Create a property before adding units so the hierarchy stays clean.
            </Text>
            <ActionLink href="/properties/add" label="Create property first" />
          </View>
        )}
      </SectionCard>

      <SectionCard title="Unit details" subtitle="Set up the unit label, layout, rent, and move-in readiness">

        <Text style={styles.label}>Unit label</Text>
        <TextInput onChangeText={setLabel} placeholder="Unit 7A" placeholderTextColor={palette.mutedText} style={styles.input} value={label} />

        <View style={styles.row}>
          <View style={styles.fieldBlock}>
            <Text style={styles.label}>Bedrooms</Text>
            <TextInput keyboardType="numeric" onChangeText={setBedrooms} placeholder="2" placeholderTextColor={palette.mutedText} style={styles.input} value={bedrooms} />
          </View>
          <View style={styles.fieldBlock}>
            <Text style={styles.label}>Bathrooms</Text>
            <TextInput keyboardType="numeric" onChangeText={setBathrooms} placeholder="1" placeholderTextColor={palette.mutedText} style={styles.input} value={bathrooms} />
          </View>
        </View>

        <Text style={styles.label}>Monthly rent</Text>
        <TextInput keyboardType="numeric" onChangeText={setMonthlyRent} placeholder="1850" placeholderTextColor={palette.mutedText} style={styles.input} value={monthlyRent} />
        {errorMessage ? <Text style={commonStyles.errorText}>{errorMessage}</Text> : null}
        {masterDataMessage ? <Text style={commonStyles.helperText}>{masterDataMessage}</Text> : null}

        <Text style={styles.label}>Occupancy status</Text>
        <OptionPillGroup
          onChange={(value) => setOccupancyStatus(value as OccupancyStatus)}
          options={[
            { label: 'Vacant', value: 'vacant' },
            { label: 'Turnover', value: 'turnover' },
          ]}
          selectedValue={occupancyStatus}
        />
        <Text style={commonStyles.helperText}>
          New units should usually start as vacant or turnover. Add the tenant after the unit is created from the property or tenant workflow, which will mark it occupied automatically.
        </Text>

        <View style={styles.actionRow}>
          <PrimaryButton
            label="Create unit"
            onPress={async () => {
              const nextBedrooms = parsePositiveNumber(bedrooms);
              const nextBathrooms = parsePositiveNumber(bathrooms);
              const nextMonthlyRent = parsePositiveNumber(monthlyRent);
              const duplicateLabel = data.units.some(
                (unit) =>
                  unit.propertyId === propertyId && unit.label.trim().toLowerCase() === label.trim().toLowerCase()
              );

              if (!selectedProperty) {
                setErrorMessage('Select a valid property before creating a unit.');
                return;
              }
              if (!hasText(label)) {
                setErrorMessage('Unit label is required.');
                return;
              }
              if (duplicateLabel) {
                setErrorMessage('Unit number must be unique within the selected property.');
                return;
              }

              if (nextBedrooms == null || nextBathrooms == null || nextMonthlyRent == null || nextMonthlyRent <= 0) {
                setErrorMessage('Bedrooms, bathrooms, and monthly rent must be valid numbers.');
                return;
              }

              setErrorMessage(null);
              const result = await createUnit(
                propertyId,
                label.trim(),
                nextBedrooms,
                nextBathrooms,
                nextMonthlyRent,
                occupancyStatus
              );
              if (result.error) {
                setErrorMessage(result.error);
                return;
              }
              router.replace({ pathname: '/properties/[propertyId]', params: { propertyId } });
            }}
          />
        </View>
      </SectionCard>

      <SectionCard title="What happens next">
        <Text style={commonStyles.helperText}>
          Adding a unit updates the property immediately. After saving, open the property detail or tenant flow to assign a resident and post the first rent charge.
        </Text>
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
  actionRow: {
    marginTop: 16,
  },
  summaryPanel: {
    backgroundColor: palette.surfaceMuted,
    borderRadius: 16,
    marginTop: 14,
    padding: 14,
  },
  summaryTitle: {
    color: palette.text,
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 4,
  },
});
