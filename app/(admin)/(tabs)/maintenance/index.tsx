import { useCallback, useEffect, useMemo, useState } from 'react';
import { useFocusEffect } from 'expo-router';
import { StyleSheet, Text, TextInput, View } from 'react-native';

import { ImageLightbox } from '@/components/image-lightbox';
import { OptionPillGroup } from '@/components/option-pill-group';
import { PrimaryButton } from '@/components/primary-button';
import { ScreenContainer } from '@/components/screen-container';
import { SectionCard } from '@/components/section-card';
import { StatusBadge, formatRepairStatusLabel, maintenanceStatusTone } from '@/components/status-badge';
import { isValidDate, parsePositiveNumber } from '@/lib/form-utils';
import {
  createMaintenanceUpdateInBackend,
  deleteMaintenanceRequestInBackend,
  fetchMaintenanceRowsFromBackend,
  maintenanceBackendEnabled,
} from '@/lib/maintenance-backend';
import { formatCurrency, formatShortDate } from '@/lib/prototype-ledger';
import { commonStyles, palette } from '@/lib/theme';
import { usePrototype } from '@/providers/prototype-provider';
import type { MaintenanceRow, MaintenanceStatus } from '@/types/domain';

export default function MaintenanceScreen() {
  const { maintenanceRows, recentActivity, saveMaintenanceUpdate } = usePrototype();
  const [rows, setRows] = useState<MaintenanceRow[]>(maintenanceRows);
  const [backendMessage, setBackendMessage] = useState<string | null>(null);
  const [recentSaveMessage, setRecentSaveMessage] = useState<string | null>(null);

  const loadRows = useCallback(async () => {
    if (!maintenanceBackendEnabled()) {
      setRows(maintenanceRows);
      setBackendMessage(null);
      return;
    }

    const result = await fetchMaintenanceRowsFromBackend();

    if (result.error) {
      setRows(maintenanceRows);
      setBackendMessage('Repair records are temporarily unavailable.');
      return;
    }

    setRows(result.data);
    setBackendMessage(null);
  }, [maintenanceRows]);

  useEffect(() => {
    let isMounted = true;
    void (async () => {
      await loadRows();
      if (!isMounted) {
        return;
      }
    })();

    return () => {
      isMounted = false;
    };
  }, [loadRows]);

  useFocusEffect(
    useCallback(() => {
      void loadRows();
    }, [loadRows])
  );

  const summary = useMemo(() => {
    const openCount = rows.filter(
      (item) => item.status === 'open' || item.status === 'in_progress' || item.status === 'deferred'
    ).length;
    const materialsNeededCount = rows.filter((item) => item.status === 'deferred').length;
    const completedCount = rows.filter((item) => item.status === 'completed').length;
    const trackedCost = rows.reduce((sum, item) => sum + item.cost, 0);

    return { openCount, materialsNeededCount, completedCount, trackedCost };
  }, [rows]);

  const maintenanceActivity = useMemo(() => {
    if (maintenanceBackendEnabled() && backendMessage?.includes('live')) {
      return rows.slice(0, 3).map((item) => ({
        id: item.id,
        title: `${item.propertyName} • ${item.title}`,
        detail: item.note,
        date: item.serviceDate,
      }));
    }

    return recentActivity.filter((item) => item.kind === 'maintenance').slice(0, 3);
  }, [backendMessage, recentActivity, rows]);

  const handleSave = async (
    recordId: string,
    status: MaintenanceStatus,
    serviceDate: string,
    cost: number,
    note: string
  ) => {
    if (!maintenanceBackendEnabled()) {
      saveMaintenanceUpdate(recordId, status, serviceDate, cost, note);
      setRecentSaveMessage('Repair update saved.');
      return;
    }

    const result = await createMaintenanceUpdateInBackend({
      requestId: recordId,
      status,
      serviceDate,
      cost,
      note,
      updatedBy: 'admin',
    });

    if (result.error) {
      setBackendMessage(result.error ?? 'Unable to save the repair update right now.');
      return;
    }

    setRows((current) =>
      current.map((item) =>
        item.id === recordId
          ? {
              ...item,
              status,
              serviceDate,
              nextActionDate: status === 'completed' ? null : serviceDate,
              cost,
              note,
            }
          : item
      )
    );

    await loadRows();
    setRecentSaveMessage(status === 'completed' ? 'Repair request closed.' : 'Repair update saved.');
  };

  const handleDelete = async (recordId: string) => {
    if (!maintenanceBackendEnabled()) {
      setBackendMessage('Repair records are temporarily unavailable.');
      return;
    }

    const result = await deleteMaintenanceRequestInBackend(recordId);

    if (result.error) {
      setBackendMessage(result.error);
      return;
    }

    await loadRows();
    setRecentSaveMessage('Repair request removed.');
  };

  return (
    <ScreenContainer
      eyebrow="Repairs"
      title="Repairs"
      subtitle="Work orders with cost tracking and quick status updates.">
      <SectionCard title="Repair summary">
        {backendMessage ? <Text style={styles.statusMessage}>{backendMessage}</Text> : null}
        {recentSaveMessage ? <Text style={styles.successMessage}>{recentSaveMessage}</Text> : null}
        <View style={styles.summaryRow}>
          <View style={styles.summaryTile}>
            <Text style={styles.summaryValue}>{summary.openCount}</Text>
            <Text style={styles.summaryLabel}>Open / active</Text>
          </View>
          <View style={styles.summaryTile}>
            <Text style={styles.summaryValue}>{summary.completedCount}</Text>
            <Text style={styles.summaryLabel}>Completed</Text>
          </View>
          <View style={styles.summaryTile}>
            <Text style={styles.summaryValue}>{summary.materialsNeededCount}</Text>
            <Text style={styles.summaryLabel}>Materials needed</Text>
          </View>
          <View style={styles.summaryTile}>
            <Text style={styles.summaryValue}>{formatCurrency(summary.trackedCost)}</Text>
            <Text style={styles.summaryLabel}>Tracked cost</Text>
          </View>
        </View>
      </SectionCard>

      <SectionCard title="Work orders" subtitle="Update status, date, cost, and notes from the field">
        {rows.map((row) => (
          <MaintenanceEditor key={row.id} row={row} onDelete={handleDelete} onSave={handleSave} />
        ))}
      </SectionCard>

      <SectionCard title="Recent repair activity">
        {maintenanceActivity.map((item) => (
          <View key={item.id} style={styles.activityRow}>
            <View style={styles.activityCopy}>
              <Text style={styles.activityTitle}>{item.title}</Text>
              <Text style={commonStyles.helperText}>{item.detail}</Text>
            </View>
            <Text style={styles.activityMeta}>{formatShortDate(item.date)}</Text>
          </View>
        ))}
      </SectionCard>
    </ScreenContainer>
  );
}

function MaintenanceEditor({
  row,
  onDelete,
  onSave,
}: {
  row: MaintenanceRow;
  onDelete: (recordId: string) => Promise<void> | void;
  onSave: (
    recordId: string,
    status: MaintenanceStatus,
    serviceDate: string,
    cost: number,
    note: string
  ) => Promise<void> | void;
}) {
  const [status, setStatus] = useState<MaintenanceStatus>(row.status);
  const [serviceDate, setServiceDate] = useState(row.serviceDate);
  const [cost, setCost] = useState(String(row.cost));
  const [note, setNote] = useState(row.note);
  const [fieldError, setFieldError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const isClosable = row.status !== 'completed';

  useEffect(() => {
    setStatus(row.status);
    setServiceDate(row.serviceDate);
    setCost(String(row.cost));
    setNote(row.note);
    setFieldError(null);
  }, [row.cost, row.note, row.serviceDate, row.status]);

  const runAction = async (action: () => Promise<void> | void) => {
    setIsSaving(true);

    try {
      await action();
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <View style={styles.recordCard}>
      <View style={commonStyles.rowBetween}>
        <View style={styles.recordHeading}>
          <Text style={styles.recordTitle}>
            {row.propertyName} • {row.unitLabel}
          </Text>
          <Text style={commonStyles.helperText}>{row.title} • {row.type}</Text>
        </View>
        <StatusBadge label={formatRepairStatusLabel(status)} tone={maintenanceStatusTone(status)} />
      </View>

      <Text style={commonStyles.helperText}>
        Last date {formatShortDate(row.serviceDate)} • Next action {formatShortDate(row.nextActionDate)}
      </Text>
      {row.tenantName ? (
        <Text style={styles.submittedBy}>Submitted by {row.tenantName}</Text>
      ) : null}

      <Text style={styles.fieldLabel}>Status</Text>
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

      <View style={styles.fieldGrid}>
        <View style={styles.fieldBlock}>
          <Text style={styles.fieldLabel}>Service date</Text>
          <TextInput onChangeText={setServiceDate} placeholder="YYYY-MM-DD" placeholderTextColor={palette.mutedText} style={styles.inlineInput} value={serviceDate} />
        </View>
        <View style={styles.fieldBlock}>
          <Text style={styles.fieldLabel}>Cost</Text>
          <TextInput keyboardType="numeric" onChangeText={setCost} placeholder="0" placeholderTextColor={palette.mutedText} style={styles.inlineInput} value={cost} />
          <Text style={commonStyles.helperText}>Use 0 until the invoice or vendor estimate is known.</Text>
        </View>
      </View>

      <Text style={styles.fieldLabel}>Notes</Text>
      <TextInput multiline onChangeText={setNote} placeholder="Add the latest repair note." placeholderTextColor={palette.mutedText} style={styles.notesInput} value={note} />
      {fieldError ? <Text style={styles.inlineError}>{fieldError}</Text> : null}

      {row.images?.length ? (
        <View style={styles.imageSection}>
          <Text style={styles.imageLabel}>Attached photos ({row.images.length})</Text>
          <Text style={commonStyles.helperText}>Tap a photo to review the repair evidence saved with this request.</Text>
          <ImageLightbox
            images={row.images
              .filter((image) => image.signedUrl)
              .map((image) => ({
                id: image.id,
                uri: image.signedUrl!,
                label: image.fileName,
              }))}
          />
        </View>
      ) : null}

      <View style={styles.saveRow}>
        <PrimaryButton
          disabled={isSaving}
          label={isSaving ? 'Saving...' : 'Save repair update'}
          loading={isSaving}
          onPress={() => {
            const nextCost = parsePositiveNumber(cost);

            if (!isValidDate(serviceDate) || nextCost == null || !note.trim()) {
              setFieldError('Use a valid date, a valid cost, and a note before saving.');
              return;
            }

            setFieldError(null);
            void runAction(() => onSave(row.id, status, serviceDate, nextCost, note.trim()));
          }}
          variant="secondary"
        />
        {isClosable ? (
          <PrimaryButton
            disabled={isSaving}
            label={status === 'completed' ? 'Close request' : 'Apply selected status'}
            onPress={() => {
              setFieldError(null);
              const nextServiceDate = isValidDate(serviceDate) ? serviceDate : new Date().toISOString().slice(0, 10);
              void runAction(() =>
                onSave(
                  row.id,
                  status,
                  nextServiceDate,
                  parsePositiveNumber(cost) ?? row.cost,
                  note.trim() || (status === 'completed' ? 'Request closed by admin.' : 'Repair status updated by admin.')
                )
              );
            }}
            variant="secondary"
          />
        ) : null}
        <PrimaryButton
          disabled={isSaving}
          label="Remove request"
          onPress={() => {
            setFieldError(null);
            void runAction(() => onDelete(row.id));
          }}
          variant="secondary"
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  summaryRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  statusMessage: {
    color: '#66707A',
    fontSize: 13,
    marginBottom: 12,
  },
  successMessage: {
    color: '#1D6E5B',
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 12,
  },
  inlineError: {
    color: '#A3373A',
    fontSize: 12,
    fontWeight: '600',
    marginTop: 8,
  },
  summaryTile: {
    backgroundColor: '#F3EEE5',
    borderRadius: 16,
    flex: 1,
    minWidth: 132,
    padding: 12,
  },
  guideGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  guideItem: {
    backgroundColor: '#F7F2EA',
    borderRadius: 16,
    flexBasis: '47%',
    flexGrow: 1,
    gap: 8,
    minWidth: 150,
    padding: 12,
  },
  summaryValue: {
    color: '#1F2933',
    fontSize: 18,
    fontWeight: '800',
  },
  summaryLabel: {
    color: '#66707A',
    fontSize: 12,
    fontWeight: '600',
    marginTop: 4,
  },
  recordCard: {
    backgroundColor: '#F7F2EA',
    borderRadius: 18,
    marginBottom: 12,
    padding: 14,
  },
  recordHeading: {
    flex: 1,
    paddingRight: 12,
  },
  recordTitle: {
    color: '#1F2933',
    fontSize: 15,
    fontWeight: '800',
  },
  fieldGrid: {
    flexDirection: 'row',
    gap: 10,
  },
  fieldBlock: {
    flex: 1,
  },
  fieldLabel: {
    color: '#1F2933',
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 8,
    marginTop: 10,
  },
  inlineInput: {
    backgroundColor: '#FFFFFF',
    borderColor: palette.border,
    borderRadius: 14,
    borderWidth: 1,
    color: '#1F2933',
    minHeight: 46,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  notesInput: {
    backgroundColor: '#FFFFFF',
    borderColor: palette.border,
    borderRadius: 16,
    borderWidth: 1,
    color: '#1F2933',
    minHeight: 88,
    padding: 12,
    textAlignVertical: 'top',
  },
  saveRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginTop: 14,
  },
  submittedBy: {
    color: '#2D5D8C',
    fontSize: 13,
    fontWeight: '700',
    marginTop: 4,
  },
  imageSection: {
    marginTop: 12,
  },
  imageLabel: {
    color: '#1F2933',
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 8,
  },
  activityRow: {
    alignItems: 'flex-start',
    borderBottomColor: '#EEE6DA',
    borderBottomWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 12,
  },
  activityCopy: {
    flex: 1,
    paddingRight: 12,
  },
  activityTitle: {
    color: '#1F2933',
    fontSize: 14,
    fontWeight: '700',
  },
  activityMeta: {
    color: '#66707A',
    fontSize: 12,
    fontWeight: '600',
  },
});
