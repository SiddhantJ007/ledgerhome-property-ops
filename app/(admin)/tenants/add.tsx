import { useEffect, useMemo, useState } from 'react';
import { useLocalSearchParams, useRouter, type Href } from 'expo-router';
import { StyleSheet, Text, TextInput, View } from 'react-native';

import { ActionLink } from '@/components/action-link';
import { OptionPillGroup } from '@/components/option-pill-group';
import { PrimaryButton } from '@/components/primary-button';
import { ScreenContainer } from '@/components/screen-container';
import { SectionCard } from '@/components/section-card';
import { hasText, isValidPhone } from '@/lib/form-utils';
import { getTodayDateString } from '@/lib/prototype-ledger';
import { commonStyles, palette } from '@/lib/theme';
import { useMasterData } from '@/providers/master-data-provider';

export default function AddTenantScreen() {
  const router = useRouter();
  const { propertyId: propertyIdParam, unitId: unitIdParam } = useLocalSearchParams<{
    propertyId?: string;
    unitId?: string;
  }>();
  const { data, createTenant, masterDataMessage } = useMasterData();
  const availableUnits = useMemo(() => {
    const unassignedUnits = data.units.filter((unit) => unit.tenantId === null);

    if (unitIdParam) {
      const requestedUnit = unassignedUnits.find((unit) => unit.id === unitIdParam);
      return requestedUnit ? [requestedUnit] : unassignedUnits;
    }

    if (propertyIdParam) {
      const propertyUnits = unassignedUnits.filter((unit) => unit.propertyId === propertyIdParam);
      return propertyUnits.length > 0 ? propertyUnits : unassignedUnits;
    }

    return unassignedUnits;
  }, [data.units, propertyIdParam, unitIdParam]);
  const [unitId, setUnitId] = useState(unitIdParam ?? availableUnits[0]?.id ?? data.units[0]?.id ?? '');
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [moveInDate, setMoveInDate] = useState(getTodayDateString());
  const [leaseEndDate, setLeaseEndDate] = useState('');
  const [initialRentAmount, setInitialRentAmount] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const selectedUnit = data.units.find((item) => item.id === unitId);
  const selectedProperty = data.properties.find((item) => item.id === selectedUnit?.propertyId);

  function formatPhoneNumber(value: string) {
    const digits = value.replace(/\D/g, '').slice(0, 10);

    if (digits.length <= 3) {
      return digits.length ? `(${digits}` : '';
    }

    if (digits.length <= 6) {
      return `(${digits.slice(0, 3)}) ${digits.slice(3)}`;
    }

    return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
  }

  useEffect(() => {
    if (selectedUnit) {
      setInitialRentAmount(String(selectedUnit.monthlyRent || ''));
    }
  }, [selectedUnit, selectedUnit?.id, selectedUnit?.monthlyRent]);

  useEffect(() => {
    const fallbackUnitId = unitIdParam ?? availableUnits[0]?.id ?? data.units[0]?.id ?? '';

    if (!selectedUnit && fallbackUnitId) {
      setUnitId(fallbackUnitId);
    }
  }, [availableUnits, data.units, selectedUnit, unitIdParam]);

  return (
    <ScreenContainer
      eyebrow="Admin setup"
      title="Assign tenant"
      subtitle="Attach a resident to a unit so occupancy, dues, and tenant details update across the live app.">
      <SectionCard title="Unit selection" subtitle="Available vacant or unassigned units are shown first">
        {data.units.length > 0 ? (
          <>
            <Text style={styles.label}>Unit</Text>
            <OptionPillGroup
              onChange={setUnitId}
              options={(availableUnits.length ? availableUnits : data.units).map((item) => ({
                label: item.label,
                value: item.id,
              }))}
              selectedValue={unitId}
            />
            <View style={styles.summaryPanel}>
              <Text style={styles.summaryTitle}>{selectedUnit?.label ?? 'Unit pending'}</Text>
              <Text style={commonStyles.helperText}>{selectedProperty?.name ?? 'Select a unit to continue.'}</Text>
              <Text style={commonStyles.helperText}>
                {availableUnits.length > 0
                  ? `${availableUnits.length} unassigned unit${availableUnits.length === 1 ? '' : 's'} available for this setup flow.`
                  : propertyIdParam
                    ? 'No unassigned units are currently available for this property.'
                    : 'All current units already have assigned tenants.'}
              </Text>
            </View>
          </>
        ) : (
          <View style={styles.summaryPanel}>
            <Text style={styles.summaryTitle}>No units available yet</Text>
            <Text style={commonStyles.helperText}>
              Add a property and at least one unit before assigning a tenant.
            </Text>
            <ActionLink href="/units/add" label="Create unit first" />
          </View>
        )}
      </SectionCard>

      <SectionCard title="Tenant details" subtitle="Enter the resident information needed for onboarding and collections">

        <Text style={styles.label}>Tenant full name</Text>
        <TextInput onChangeText={setFullName} placeholder="Sophie Grant" placeholderTextColor={palette.mutedText} style={styles.input} value={fullName} />

        <Text style={styles.label}>Phone</Text>
        <TextInput onChangeText={(value) => setPhone(formatPhoneNumber(value))} placeholder="(555) 320-4412" placeholderTextColor={palette.mutedText} style={styles.input} value={phone} />

        <Text style={styles.label}>Email</Text>
        <TextInput
          autoCapitalize="none"
          keyboardType="email-address"
          onChangeText={setEmail}
          placeholder="resident@example.com"
          placeholderTextColor={palette.mutedText}
          style={styles.input}
          value={email}
        />

        <Text style={styles.label}>Move-in date</Text>
        <TextInput
          onChangeText={setMoveInDate}
          placeholder="YYYY-MM-DD"
          placeholderTextColor={palette.mutedText}
          style={styles.input}
          value={moveInDate}
        />

        <Text style={styles.label}>Lease end date</Text>
        <TextInput
          onChangeText={setLeaseEndDate}
          placeholder="YYYY-MM-DD"
          placeholderTextColor={palette.mutedText}
          style={styles.input}
          value={leaseEndDate}
        />

        <Text style={styles.label}>Initial rent charge</Text>
        <TextInput
          keyboardType="numeric"
          onChangeText={setInitialRentAmount}
          placeholder={selectedUnit ? String(selectedUnit.monthlyRent) : '0'}
          placeholderTextColor={palette.mutedText}
          style={styles.input}
          value={initialRentAmount}
        />
        <Text style={commonStyles.helperText}>
          Default is the unit monthly rent. Override it only if the first month needs a manual amount.
        </Text>
        {errorMessage ? <Text style={commonStyles.errorText}>{errorMessage}</Text> : null}
        {masterDataMessage ? <Text style={commonStyles.helperText}>{masterDataMessage}</Text> : null}

        <View style={styles.actionRow}>
          <PrimaryButton
            label="Assign tenant to unit"
            onPress={async () => {
              if (!selectedUnit) {
                setErrorMessage('Select a valid unit before assigning a tenant.');
                return;
              }
              if (!hasText(fullName) || !isValidPhone(phone)) {
                setErrorMessage('Tenant name and a valid phone number are required.');
                return;
              }
              if (!hasText(email) || !email.includes('@')) {
                setErrorMessage('A valid tenant email is required so login linking is easier later.');
                return;
              }

              setErrorMessage(null);
              const parsedInitialRent = Number(initialRentAmount || 0);
              const result = await createTenant(
                unitId,
                fullName.trim(),
                phone.trim(),
                email.trim().toLowerCase(),
                {
                  moveInDate: moveInDate.trim() || undefined,
                  leaseEndDate: leaseEndDate.trim() || undefined,
                  initialRentAmount:
                    Number.isFinite(parsedInitialRent) && parsedInitialRent >= 0 ? parsedInitialRent : null,
                }
              );
              if (result.error) {
                setErrorMessage(result.error);
                return;
              }
              router.replace('/(admin)/(tabs)/properties' as Href);
            }}
          />
        </View>
      </SectionCard>

      <SectionCard title="What happens next">
        <Text style={commonStyles.helperText}>This creates the tenant, marks the unit occupied, creates a lease shell, and posts the first rent charge to the live ledger.</Text>
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
