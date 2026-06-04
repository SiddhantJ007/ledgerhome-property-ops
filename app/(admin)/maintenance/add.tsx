import { useEffect, useMemo, useState } from 'react';
import { useRouter, type Href } from 'expo-router';
import { StyleSheet, Text, TextInput, View } from 'react-native';

import { OptionPillGroup } from '@/components/option-pill-group';
import { PrimaryButton } from '@/components/primary-button';
import { ScreenContainer } from '@/components/screen-container';
import { SectionCard } from '@/components/section-card';
import { hasText, isValidDate, parsePositiveNumber } from '@/lib/form-utils';
import { getTodayDateString } from '@/lib/prototype-ledger';
import { commonStyles, palette } from '@/lib/theme';
import { useMasterData } from '@/providers/master-data-provider';
import { usePrototype } from '@/providers/prototype-provider';
import type { MaintenanceStatus } from '@/types/domain';

export default function AddMaintenanceScreen() {
  const router = useRouter();
  const { data, masterDataMessage } = useMasterData();
  const { createMaintenance } = usePrototype();
  const [propertyId, setPropertyId] = useState(data.properties[0]?.id ?? '');
  const propertyUnits = useMemo(() => data.units.filter((unit) => unit.propertyId === propertyId), [data.units, propertyId]);
  const [unitId, setUnitId] = useState<string | null>(propertyUnits[0]?.id ?? null);
  const [title, setTitle] = useState('');
  const [type, setType] = useState('General');
  const [status, setStatus] = useState<MaintenanceStatus>('open');
  const [serviceDate, setServiceDate] = useState(getTodayDateString());
  const [cost, setCost] = useState('0');
  const [note, setNote] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const selectedProperty = data.properties.find((item) => item.id === propertyId);
  const selectedUnit = propertyUnits.find((item) => item.id === unitId);

  useEffect(() => {
    if (!selectedProperty && data.properties[0]) {
      setPropertyId(data.properties[0].id);
    }
  }, [data.properties, selectedProperty]);

  useEffect(() => {
    if (propertyUnits.length > 0 && !selectedUnit && unitId !== null) {
      setUnitId(propertyUnits[0].id);
    }
  }, [propertyUnits, selectedUnit, unitId]);

  return (
    <ScreenContainer
      eyebrow="Repairs"
      title="Create repair"
      subtitle="Add a new repair item and make it visible immediately in the admin and tenant repair flows.">
      <SectionCard title="Location" subtitle="Choose the property and whether this affects a unit or a common area">
        <Text style={styles.label}>Property</Text>
        <OptionPillGroup
          onChange={setPropertyId}
          options={data.properties.map((item) => ({ label: item.name, value: item.id }))}
          selectedValue={propertyId}
        />

        <Text style={styles.label}>Unit</Text>
        <OptionPillGroup
          onChange={(value) => setUnitId(value === 'common' ? null : value)}
          options={[
            { label: 'Common area', value: 'common' },
            ...propertyUnits.map((item) => ({ label: item.label, value: item.id })),
          ]}
          selectedValue={unitId ?? 'common'}
        />
        <View style={styles.summaryPanel}>
          <Text style={styles.summaryTitle}>{selectedProperty?.name ?? 'Property pending'}</Text>
          <Text style={commonStyles.helperText}>
            {selectedUnit ? `${selectedUnit.label} selected` : 'Common area repair selected'}
          </Text>
        </View>
      </SectionCard>

      <SectionCard title="Repair details" subtitle="Set the issue, status, date, and tracked cost">

        <Text style={styles.label}>Issue title</Text>
        <TextInput onChangeText={setTitle} placeholder="Roof drain inspection" placeholderTextColor={palette.mutedText} style={styles.input} value={title} />

        <Text style={styles.label}>Type</Text>
        <TextInput onChangeText={setType} placeholder="Plumbing / HVAC / Electrical" placeholderTextColor={palette.mutedText} style={styles.input} value={type} />

        <Text style={styles.label}>Status</Text>
        <OptionPillGroup
          onChange={(value) => setStatus(value as MaintenanceStatus)}
          options={[
            { label: 'Open', value: 'open' },
            { label: 'In process', value: 'in_progress' },
            { label: 'Completed', value: 'completed' },
            { label: 'Materials needed', value: 'deferred' },
          ]}
          selectedValue={status}
        />

        <View style={styles.row}>
          <View style={styles.fieldBlock}>
            <Text style={styles.label}>Service date</Text>
            <TextInput onChangeText={setServiceDate} placeholder="YYYY-MM-DD" placeholderTextColor={palette.mutedText} style={styles.input} value={serviceDate} />
          </View>
          <View style={styles.fieldBlock}>
            <Text style={styles.label}>Cost</Text>
            <TextInput keyboardType="numeric" onChangeText={setCost} placeholder="0" placeholderTextColor={palette.mutedText} style={styles.input} value={cost} />
            <Text style={commonStyles.helperText}>Use 0 if the cost is not known yet.</Text>
          </View>
        </View>

        <Text style={styles.label}>Notes</Text>
        <TextInput multiline onChangeText={setNote} placeholder="Vendor, issue details, or follow-up note." placeholderTextColor={palette.mutedText} style={styles.notesInput} value={note} />
        {masterDataMessage ? <Text style={commonStyles.helperText}>{masterDataMessage}</Text> : null}
        {errorMessage ? <Text style={commonStyles.errorText}>{errorMessage}</Text> : null}

        <View style={styles.actionRow}>
          <PrimaryButton
            disabled={isCreating}
            label={isCreating ? 'Creating...' : 'Create repair'}
            loading={isCreating}
            onPress={() => {
              const nextCost = parsePositiveNumber(cost);

              if (!hasText(title) || !hasText(type) || !isValidDate(serviceDate) || nextCost == null || !hasText(note)) {
                setErrorMessage('Title, type, valid service date, cost, and notes are required.');
                return;
              }

              setErrorMessage(null);
              setIsCreating(true);
              createMaintenance(propertyId, unitId, title.trim(), type.trim(), status, serviceDate, nextCost, note.trim());
              router.replace('/(admin)/(tabs)/maintenance' as Href);
            }}
          />
        </View>
      </SectionCard>

      <SectionCard title="What happens next">
        <Text style={commonStyles.helperText}>New repairs appear immediately in Repairs and dashboard counts.</Text>
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
  notesInput: {
    backgroundColor: '#FFFFFF',
    borderColor: palette.border,
    borderRadius: 16,
    borderWidth: 1,
    color: palette.text,
    minHeight: 92,
    padding: 12,
    textAlignVertical: 'top' as const,
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
