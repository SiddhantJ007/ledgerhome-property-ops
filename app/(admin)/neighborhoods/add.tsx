import { useState } from 'react';
import { useRouter, type Href } from 'expo-router';
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

export default function AddNeighborhoodScreen() {
  const router = useRouter();
  const { data, createNeighborhood, masterDataMessage } = useMasterData();
  const [stateCode, setStateCode] = useState<StateCode>('NY');
  const [name, setName] = useState('');
  const [city, setCity] = useState('');
  const [note, setNote] = useState('');
  const [isActive, setIsActive] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  return (
    <ScreenContainer
      eyebrow="Neighborhoods"
      title="Add neighborhood"
      subtitle="Set up a neighborhood or borough label before assigning properties to it.">
      <SectionCard title="Location details" subtitle="Keep naming simple and state-specific">
        <Text style={styles.label}>State</Text>
        <OptionPillGroup onChange={(value) => setStateCode(value as StateCode)} options={stateOptions} selectedValue={stateCode} />

        <Text style={styles.label}>Neighborhood / Borough</Text>
        <TextInput
          onChangeText={setName}
          placeholder="Downtown Core"
          placeholderTextColor={palette.mutedText}
          style={styles.input}
          value={name}
        />

        <Text style={styles.label}>City</Text>
        <TextInput
          onChangeText={setCity}
          placeholder="Riverton, NY"
          placeholderTextColor={palette.mutedText}
          style={styles.input}
          value={city}
        />

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
          placeholder="Transit-heavy corridor with steady leasing demand."
          placeholderTextColor={palette.mutedText}
          style={styles.notesInput}
          value={note}
        />
        {errorMessage ? <Text style={commonStyles.errorText}>{errorMessage}</Text> : null}
        {masterDataMessage ? <Text style={commonStyles.helperText}>{masterDataMessage}</Text> : null}

        <View style={styles.actionRow}>
          <PrimaryButton
            label="Create neighborhood"
            onPress={async () => {
              const duplicate = data.neighborhoods.some(
                (item) =>
                  item.stateCode === stateCode && item.name.trim().toLowerCase() === name.trim().toLowerCase()
              );

              if (!hasText(name) || !hasText(city)) {
                setErrorMessage('Neighborhood name and city are required.');
                return;
              }

              if (duplicate) {
                setErrorMessage('That neighborhood already exists in the selected state.');
                return;
              }

              setErrorMessage(null);
              const result = await createNeighborhood(stateCode, name.trim(), city.trim(), note.trim(), isActive);
              if (result.error) {
                setErrorMessage(result.error);
                return;
              }
              router.replace('/(admin)/neighborhoods' as Href);
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
});
