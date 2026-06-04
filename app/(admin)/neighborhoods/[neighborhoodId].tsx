import { useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';

import { OptionPillGroup } from '@/components/option-pill-group';
import { PrimaryButton } from '@/components/primary-button';
import { ScreenContainer } from '@/components/screen-container';
import { SectionCard } from '@/components/section-card';
import { hasText } from '@/lib/form-utils';
import { stateOptions } from '@/lib/master-data';
import { commonStyles, palette } from '@/lib/theme';
import { useMasterData } from '@/providers/master-data-provider';
import type { StateCode } from '@/types/domain';

export default function NeighborhoodDetailScreen() {
  const { neighborhoodId } = useLocalSearchParams<{ neighborhoodId: string }>();
  const { data, saveNeighborhood, masterDataMessage } = useMasterData();
  const neighborhood = data.neighborhoods.find((item) => item.id === neighborhoodId) ?? data.neighborhoods[0];
  const propertyCount = data.properties.filter((property) => property.neighborhoodId === neighborhood.id).length;
  const [stateCode, setStateCode] = useState<StateCode>(neighborhood.stateCode);
  const [name, setName] = useState(neighborhood.name);
  const [city, setCity] = useState(neighborhood.city);
  const [note, setNote] = useState(neighborhood.note);
  const [isActive, setIsActive] = useState(neighborhood.isActive);
  const [message, setMessage] = useState<string | null>(null);

  return (
    <ScreenContainer
      eyebrow="Neighborhoods"
      title={name}
      subtitle={`${stateCode} • ${propertyCount} propert${propertyCount === 1 ? 'y' : 'ies'}`}>
      <SectionCard title="Neighborhood settings">
        <Text style={styles.label}>State</Text>
        <OptionPillGroup onChange={(value) => setStateCode(value as StateCode)} options={stateOptions} selectedValue={stateCode} />

        <Text style={styles.label}>Neighborhood / Borough</Text>
        <TextInput onChangeText={setName} placeholderTextColor={palette.mutedText} style={styles.input} value={name} />

        <Text style={styles.label}>City</Text>
        <TextInput onChangeText={setCity} placeholderTextColor={palette.mutedText} style={styles.input} value={city} />

        <Text style={styles.label}>Status</Text>
        <OptionPillGroup
          onChange={(value) => setIsActive(value === 'active')}
          options={[
            { label: 'Active', value: 'active' },
            { label: 'Inactive', value: 'inactive' },
          ]}
          selectedValue={isActive ? 'active' : 'inactive'}
        />

        <Text style={styles.label}>Operator note</Text>
        <TextInput
          multiline
          onChangeText={setNote}
          placeholderTextColor={palette.mutedText}
          style={styles.notesInput}
          value={note}
        />
        {masterDataMessage ? <Text style={commonStyles.helperText}>{masterDataMessage}</Text> : null}
        {message ? <Text style={hasText(message) && message.includes('saved') ? styles.success : commonStyles.errorText}>{message}</Text> : null}

        <View style={styles.actionRow}>
          <PrimaryButton
            label="Save neighborhood"
            onPress={async () => {
              const duplicate = data.neighborhoods.some(
                (item) =>
                  item.id !== neighborhood.id &&
                  item.stateCode === stateCode &&
                  item.name.trim().toLowerCase() === name.trim().toLowerCase()
              );

              if (!hasText(name) || !hasText(city)) {
                setMessage('Neighborhood name and city are required.');
                return;
              }
              if (duplicate) {
                setMessage('That neighborhood already exists in the selected state.');
                return;
              }

              const result = await saveNeighborhood(neighborhood.id, {
                stateCode,
                name: name.trim(),
                city: city.trim(),
                note: note.trim(),
                isActive,
              });
              setMessage(result.error ? result.error : 'Neighborhood settings saved.');
            }}
          />
        </View>
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
    minHeight: 94,
    padding: 12,
    textAlignVertical: 'top' as const,
  },
  actionRow: {
    marginTop: 16,
  },
  success: {
    color: '#1D6E5B',
    fontSize: 13,
    fontWeight: '700',
    marginTop: 12,
  },
});
