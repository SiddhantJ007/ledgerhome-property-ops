import { useCallback, useMemo, useState } from 'react';
import { useFocusEffect } from 'expo-router';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

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
import type {
  LedgerRow,
  SupplementalChargeRow,
  UserWorkspace,
  UserWorkspaceBoardData,
  UserWorkspaceCollectionItem,
  UserWorkspaceFact,
  UserWorkspacePlannerStatus,
} from '@/types/domain';

function createId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function getDefaultWorkspace(userId: string): UserWorkspace {
  return {
    id: userId,
    title: 'Operations board',
    body: '',
    data: {
      collectionItems: [],
      facts: [],
    },
    updatedAt: null,
  };
}

export default function AdminWorkspaceScreen() {
  const { profile } = useAccess();
  const [, setWorkspace] = useState<UserWorkspace | null>(profile ? getDefaultWorkspace(profile.id) : null);
  const [title, setTitle] = useState('Operations board');
  const [body, setBody] = useState('');
  const [boardData, setBoardData] = useState<UserWorkspaceBoardData>({
    collectionItems: [],
    facts: [],
  });
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
      setBoardData(
        workspaceResult.workspace.data ?? {
          collectionItems: [],
          facts: [],
        }
      );
      setLoadMessage(
        workspaceResult.workspace.updatedAt
          ? `Saved board last updated ${formatShortDate(workspaceResult.workspace.updatedAt)}.`
          : 'Use this as a private operating board for ideas, calculations, manual charges, and property facts.'
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

  const rentOutstanding = rentRows.reduce((sum, row) => sum + row.pendingAmount + row.priorBalanceAmount, 0);
  const rentCollected = rentRows.reduce((sum, row) => sum + row.collectedAmount, 0);
  const utilityOutstanding = supplementalRows.reduce((sum, row) => sum + row.pendingAmount, 0);
  const totalToCollect = rentOutstanding + utilityOutstanding;
  const plannerOutstanding = boardData.collectionItems
    .filter((item) => item.status !== 'resolved')
    .reduce((sum, item) => sum + item.amount, 0);

  const plannerByStatus = useMemo(() => {
    return {
      open: boardData.collectionItems.filter((item) => item.status === 'open'),
      parked: boardData.collectionItems.filter((item) => item.status === 'parked'),
      resolved: boardData.collectionItems.filter((item) => item.status === 'resolved'),
    };
  }, [boardData.collectionItems]);

  const updateCollectionItem = (id: string, patch: Partial<UserWorkspaceCollectionItem>) => {
    setBoardData((current) => ({
      ...current,
      collectionItems: current.collectionItems.map((item) => (item.id === id ? { ...item, ...patch } : item)),
    }));
  };

  const addCollectionItem = () => {
    setBoardData((current) => ({
      ...current,
      collectionItems: [
        ...current.collectionItems,
        {
          id: createId(),
          title: '',
          amount: 0,
          targetType: 'general',
          targetLabel: '',
          status: 'open',
        },
      ],
    }));
  };

  const removeCollectionItem = (id: string) => {
    setBoardData((current) => ({
      ...current,
      collectionItems: current.collectionItems.filter((item) => item.id !== id),
    }));
  };

  const addFact = () => {
    setBoardData((current) => ({
      ...current,
      facts: [...current.facts, { id: createId(), label: '', value: '' }],
    }));
  };

  const updateFact = (id: string, patch: Partial<UserWorkspaceFact>) => {
    setBoardData((current) => ({
      ...current,
      facts: current.facts.map((fact) => (fact.id === id ? { ...fact, ...patch } : fact)),
    }));
  };

  const removeFact = (id: string) => {
    setBoardData((current) => ({
      ...current,
      facts: current.facts.filter((fact) => fact.id !== id),
    }));
  };

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
      data: boardData,
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
      setBoardData(
        result.workspace.data ?? {
          collectionItems: [],
          facts: [],
        }
      );
      setSaveMessage(`Saved ${formatShortDate(result.workspace.updatedAt ?? new Date().toISOString())}.`);
    }
  };

  const statusTone = (status: UserWorkspacePlannerStatus) => {
    switch (status) {
      case 'resolved':
        return styles.statusResolved;
      case 'parked':
        return styles.statusParked;
      default:
        return styles.statusOpen;
    }
  };

  return (
    <ScreenContainer
      eyebrow="Admin"
      title="Operations Board"
      subtitle="A private working surface for rough collection items, property facts, scratch notes, and ideas that do not fit a formal product flow yet.">
      <SectionCard title="Board snapshot" subtitle="Live portfolio context pulled into your private working surface">
        {loadMessage ? <Text style={commonStyles.helperText}>{loadMessage}</Text> : null}
        <View style={styles.metricGrid}>
          <View style={styles.metricCard}>
            <Text style={commonStyles.metricValue}>{formatCurrency(totalToCollect)}</Text>
            <Text style={commonStyles.helperText}>Live total to collect</Text>
          </View>
          <View style={styles.metricCard}>
            <Text style={commonStyles.metricValue}>{formatCurrency(rentOutstanding)}</Text>
            <Text style={commonStyles.helperText}>Rent outstanding</Text>
          </View>
          <View style={styles.metricCard}>
            <Text style={commonStyles.metricValue}>{formatCurrency(utilityOutstanding)}</Text>
            <Text style={commonStyles.helperText}>Additional charges due</Text>
          </View>
          <View style={styles.metricCard}>
            <Text style={commonStyles.metricValue}>{formatCurrency(rentCollected)}</Text>
            <Text style={commonStyles.helperText}>Rent collected</Text>
          </View>
          <View style={styles.metricCard}>
            <Text style={commonStyles.metricValue}>{formatCurrency(plannerOutstanding)}</Text>
            <Text style={commonStyles.helperText}>Manual rough-work total</Text>
          </View>
          <View style={styles.metricCard}>
            <Text style={commonStyles.metricValue}>{String(plannerByStatus.open.length)}</Text>
            <Text style={commonStyles.helperText}>Open manual items</Text>
          </View>
        </View>
      </SectionCard>

      <SectionCard title="Manual collection planner" subtitle="Track things like damage charges or one-off follow-up amounts before you formalize them in the product">
        <View style={styles.inlineRow}>
          <PrimaryButton label="Add planner item" onPress={addCollectionItem} variant="secondary" />
        </View>
        {boardData.collectionItems.length > 0 ? (
          boardData.collectionItems.map((item) => (
            <View key={item.id} style={styles.boardCard}>
              <View style={styles.inlineRowBetween}>
                <Text style={styles.cardTitle}>Planner item</Text>
                <Pressable onPress={() => removeCollectionItem(item.id)}>
                  <Text style={styles.removeLabel}>Remove</Text>
                </Pressable>
              </View>
              <TextInput
                onChangeText={(value) => updateCollectionItem(item.id, { title: value })}
                placeholder="What is this for? Example: damage charge, broker fee follow-up, rough repair recovery"
                placeholderTextColor={palette.mutedText}
                style={styles.titleInput}
                value={item.title}
              />
              <View style={styles.dualRow}>
                <TextInput
                  keyboardType="decimal-pad"
                  onChangeText={(value) => updateCollectionItem(item.id, { amount: Number(value.replace(/[^0-9.]/g, '')) || 0 })}
                  placeholder="Amount"
                  placeholderTextColor={palette.mutedText}
                  style={[styles.titleInput, styles.compactInput]}
                  value={item.amount > 0 ? String(item.amount) : ''}
                />
                <TextInput
                  onChangeText={(value) => updateCollectionItem(item.id, { targetLabel: value })}
                  placeholder="Tenant, unit, property, or general target"
                  placeholderTextColor={palette.mutedText}
                  style={[styles.titleInput, styles.flexInput]}
                  value={item.targetLabel}
                />
              </View>
              <View style={styles.statusRow}>
                {(['general', 'tenant', 'unit', 'property'] as const).map((targetType) => (
                  <Pressable
                    key={targetType}
                    onPress={() => updateCollectionItem(item.id, { targetType })}
                    style={[styles.choiceChip, item.targetType === targetType && styles.choiceChipActive]}>
                    <Text style={[styles.choiceChipLabel, item.targetType === targetType && styles.choiceChipLabelActive]}>
                      {targetType}
                    </Text>
                  </Pressable>
                ))}
              </View>
              <View style={styles.statusRow}>
                {(['open', 'parked', 'resolved'] as const).map((status) => (
                  <Pressable
                    key={status}
                    onPress={() => updateCollectionItem(item.id, { status })}
                    style={[styles.choiceChip, statusTone(status), item.status === status && styles.choiceChipActive]}>
                    <Text style={[styles.choiceChipLabel, item.status === status && styles.choiceChipLabelActive]}>
                      {status}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </View>
          ))
        ) : (
          <Text style={commonStyles.helperText}>
            Start a manual planner item when you need to rough out charges or follow-up amounts that do not have a formal flow yet.
          </Text>
        )}
      </SectionCard>

      <SectionCard title="Property & portfolio facts" subtitle="Keep flexible fact rows like purchase price, acquisition date, insurance notes, or lender reminders">
        <View style={styles.inlineRow}>
          <PrimaryButton label="Add fact row" onPress={addFact} variant="secondary" />
        </View>
        {boardData.facts.length > 0 ? (
          boardData.facts.map((fact) => (
            <View key={fact.id} style={styles.factRow}>
              <TextInput
                onChangeText={(value) => updateFact(fact.id, { label: value })}
                placeholder="Label"
                placeholderTextColor={palette.mutedText}
                style={[styles.titleInput, styles.factLabel]}
                value={fact.label}
              />
              <TextInput
                onChangeText={(value) => updateFact(fact.id, { value })}
                placeholder="Value"
                placeholderTextColor={palette.mutedText}
                style={[styles.titleInput, styles.factValue]}
                value={fact.value}
              />
              <Pressable onPress={() => removeFact(fact.id)} style={styles.factRemove}>
                <Text style={styles.removeLabel}>Remove</Text>
              </Pressable>
            </View>
          ))
        ) : (
          <Text style={commonStyles.helperText}>
            Add your own rows here for anything operational that does not belong to a formal field yet.
          </Text>
        )}
      </SectionCard>

      <SectionCard title="Free canvas" subtitle="Use this as a looser writing surface for plans, scenario notes, or rough calculations">
        <Text style={styles.fieldLabel}>Board title</Text>
        <TextInput
          onChangeText={setTitle}
          placeholder="Operations board"
          placeholderTextColor={palette.mutedText}
          style={styles.titleInput}
          value={title}
        />
        <Text style={styles.fieldLabel}>Scratchpad</Text>
        <TextInput
          multiline
          onChangeText={setBody}
          placeholder="Write long-form notes here. Example: if Thomas leaves early, charge repainting; building bought in 2021 for X; rough annual income target; next version ideas; negotiation notes."
          placeholderTextColor={palette.mutedText}
          style={styles.bodyInput}
          textAlignVertical="top"
          value={body}
        />
        <PrimaryButton label="Save operations board" loading={isSaving} onPress={() => void handleSave()} />
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
    minWidth: 180,
    padding: 14,
    flexGrow: 1,
  },
  inlineRow: {
    marginBottom: 12,
  },
  inlineRowBetween: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  boardCard: {
    backgroundColor: palette.surfaceMuted,
    borderRadius: 18,
    marginBottom: 12,
    padding: 14,
  },
  cardTitle: {
    color: palette.text,
    fontSize: 14,
    fontWeight: '700',
  },
  removeLabel: {
    color: palette.danger,
    fontSize: 12,
    fontWeight: '700',
  },
  dualRow: {
    flexDirection: 'row',
    gap: 10,
  },
  compactInput: {
    width: 120,
  },
  flexInput: {
    flex: 1,
  },
  statusRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginTop: 4,
  },
  choiceChip: {
    backgroundColor: '#FFFFFF',
    borderColor: palette.border,
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  choiceChipActive: {
    backgroundColor: palette.primary,
    borderColor: palette.primary,
  },
  choiceChipLabel: {
    color: palette.text,
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'capitalize',
  },
  choiceChipLabelActive: {
    color: '#FFFFFF',
  },
  statusOpen: {
    backgroundColor: '#FFFFFF',
  },
  statusParked: {
    backgroundColor: '#FFF6E7',
  },
  statusResolved: {
    backgroundColor: palette.primarySoft,
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
    marginBottom: 12,
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
    minHeight: 260,
    paddingHorizontal: 14,
    paddingVertical: 14,
  },
  factRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 10,
    marginBottom: 10,
  },
  factLabel: {
    flex: 0.8,
    marginBottom: 0,
  },
  factValue: {
    flex: 1.2,
    marginBottom: 0,
  },
  factRemove: {
    paddingVertical: 6,
  },
  saveMessage: {
    color: palette.primary,
    fontSize: 13,
    fontWeight: '700',
    marginTop: 12,
  },
});
