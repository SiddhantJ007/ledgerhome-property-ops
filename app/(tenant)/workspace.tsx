import { useCallback, useState } from 'react';
import { useFocusEffect } from 'expo-router';
import { StyleSheet, Text, TextInput, View } from 'react-native';

import { PrimaryButton } from '@/components/primary-button';
import { ScreenContainer } from '@/components/screen-container';
import { SectionCard } from '@/components/section-card';
import { fetchLedgerRowsFromBackend, paymentsBackendEnabled } from '@/lib/payments-backend';
import { fetchSupplementalChargeRowsFromBackend, propertyChargeConfigsBackendEnabled } from '@/lib/property-charge-configs-backend';
import { formatCurrency, formatShortDate } from '@/lib/prototype-ledger';
import { palette, commonStyles } from '@/lib/theme';
import {
  fetchUserWorkspaceFromBackend,
  saveUserWorkspaceToBackend,
  userWorkspacesBackendEnabled,
} from '@/lib/user-workspaces-backend';
import { useAccess } from '@/providers/access-provider';
import type { LedgerRow, SupplementalChargeRow, UserWorkspace } from '@/types/domain';

function getDefaultWorkspace(userId: string): UserWorkspace {
  return {
    id: userId,
    title: 'Personal notes',
    body: '',
    updatedAt: null,
  };
}

export default function TenantWorkspaceScreen() {
  const { profile } = useAccess();
  const [, setWorkspace] = useState<UserWorkspace | null>(profile ? getDefaultWorkspace(profile.id) : null);
  const [title, setTitle] = useState('Personal notes');
  const [body, setBody] = useState('');
  const [loadMessage, setLoadMessage] = useState<string | null>(null);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [rentRows, setRentRows] = useState<LedgerRow[]>([]);
  const [supplementalRows, setSupplementalRows] = useState<SupplementalChargeRow[]>([]);

  const loadWorkspace = useCallback(async () => {
    if (!profile?.id || !userWorkspacesBackendEnabled()) {
      return;
    }

    const [workspaceResult, rentResult, supplementalResult] = await Promise.all([
      fetchUserWorkspaceFromBackend(profile.id),
      paymentsBackendEnabled()
        ? fetchLedgerRowsFromBackend()
        : Promise.resolve({ data: [] as LedgerRow[], error: null }),
      propertyChargeConfigsBackendEnabled()
        ? fetchSupplementalChargeRowsFromBackend()
        : Promise.resolve({ data: [] as SupplementalChargeRow[], error: null }),
    ]);

    if (workspaceResult.error) {
      setLoadMessage(workspaceResult.error);
    } else if (workspaceResult.workspace) {
      setWorkspace(workspaceResult.workspace);
      setTitle(workspaceResult.workspace.title);
      setBody(workspaceResult.workspace.body);
      setLoadMessage(
        workspaceResult.workspace.updatedAt
          ? `Saved notes last updated ${formatShortDate(workspaceResult.workspace.updatedAt)}.`
          : 'Use this private space for personal reminders before you message admin.'
      );
    }

    if (!rentResult.error) {
      setRentRows(rentResult.data);
    }

    if (!supplementalResult.error) {
      setSupplementalRows(supplementalResult.data);
    }
  }, [profile?.id]);

  useFocusEffect(
    useCallback(() => {
      void loadWorkspace();
      return undefined;
    }, [loadWorkspace])
  );

  const activeRentRow = rentRows[0] ?? null;
  const rentDue = activeRentRow ? activeRentRow.pendingAmount + activeRentRow.priorBalanceAmount : 0;
  const utilityDue = supplementalRows.reduce((sum, row) => sum + row.pendingAmount, 0);
  const totalDue = rentDue + utilityDue;

  const handleSave = async () => {
    if (!profile?.id) {
      setSaveMessage('This user is not linked to an app profile yet.');
      return;
    }

    setIsSaving(true);
    setSaveMessage(null);

    const result = await saveUserWorkspaceToBackend({
      userId: profile.id,
      title,
      body,
    });

    setIsSaving(false);

    if (result.error) {
      setSaveMessage(result.error);
      return;
    }

    if (result.workspace) {
      setWorkspace(result.workspace);
      setTitle(result.workspace.title);
      setBody(result.workspace.body);
      setSaveMessage(`Saved ${formatShortDate(result.workspace.updatedAt ?? new Date().toISOString())}.`);
    }
  };

  return (
    <ScreenContainer
      eyebrow="Tenant Portal"
      title="Notes Workspace"
      subtitle="A private scratchpad for reminders, planning, or questions you want to keep before contacting the property team.">
      <SectionCard title="Current account snapshot" subtitle="Your live account context alongside your private notes">
        {loadMessage ? <Text style={commonStyles.helperText}>{loadMessage}</Text> : null}
        <View style={styles.metricGrid}>
          <View style={styles.metricCard}>
            <Text style={commonStyles.metricValue}>{formatCurrency(totalDue)}</Text>
            <Text style={commonStyles.helperText}>Total due</Text>
          </View>
          <View style={styles.metricCard}>
            <Text style={commonStyles.metricValue}>{formatCurrency(rentDue)}</Text>
            <Text style={commonStyles.helperText}>Rent due</Text>
          </View>
          <View style={styles.metricCard}>
            <Text style={commonStyles.metricValue}>{formatCurrency(utilityDue)}</Text>
            <Text style={commonStyles.helperText}>Additional charges due</Text>
          </View>
          <View style={styles.metricCard}>
            <Text style={commonStyles.metricValue}>{activeRentRow?.dueDate ? formatShortDate(activeRentRow.dueDate) : 'N/A'}</Text>
            <Text style={commonStyles.helperText}>Next rent due</Text>
          </View>
        </View>
      </SectionCard>

      <SectionCard title="Private canvas" subtitle="This is only for your own account and is not shared with other tenants.">
        <Text style={styles.fieldLabel}>Workspace title</Text>
        <TextInput
          onChangeText={setTitle}
          placeholder="Personal notes"
          placeholderTextColor={palette.mutedText}
          style={styles.titleInput}
          value={title}
        />
        <Text style={styles.fieldLabel}>Notes</Text>
        <TextInput
          multiline
          onChangeText={setBody}
          placeholder="Use this space for your own reminders, rough budgeting, or questions to ask later."
          placeholderTextColor={palette.mutedText}
          style={styles.bodyInput}
          textAlignVertical="top"
          value={body}
        />
        <PrimaryButton label="Save notes workspace" loading={isSaving} onPress={() => void handleSave()} />
        {saveMessage ? <Text style={styles.saveMessage}>{saveMessage}</Text> : null}
      </SectionCard>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  metricGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginTop: 4,
  },
  metricCard: {
    backgroundColor: palette.surfaceMuted,
    borderRadius: 18,
    minWidth: 200,
    padding: 14,
    flexGrow: 1,
  },
  fieldLabel: {
    color: palette.text,
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 8,
  },
  titleInput: {
    backgroundColor: '#FFFFFF',
    borderColor: palette.border,
    borderRadius: 16,
    borderWidth: 1,
    color: palette.text,
    fontSize: 15,
    marginBottom: 14,
    minHeight: 50,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  bodyInput: {
    backgroundColor: '#FFFFFF',
    borderColor: palette.border,
    borderRadius: 18,
    borderWidth: 1,
    color: palette.text,
    fontSize: 15,
    lineHeight: 22,
    marginBottom: 14,
    minHeight: 220,
    paddingHorizontal: 14,
    paddingVertical: 14,
  },
  saveMessage: {
    color: palette.primary,
    fontSize: 13,
    fontWeight: '700',
    marginTop: 12,
  },
});
