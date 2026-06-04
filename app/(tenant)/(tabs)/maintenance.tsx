import { useCallback, useEffect, useState } from 'react';
import { useFocusEffect, useRouter, type Href } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';

import { ImageLightbox } from '@/components/image-lightbox';
import { PrimaryButton } from '@/components/primary-button';
import { ScreenContainer } from '@/components/screen-container';
import { SectionCard } from '@/components/section-card';
import { StatusBadge, formatRepairStatusLabel, maintenanceStatusTone } from '@/components/status-badge';
import {
  createMaintenanceUpdateInBackend,
  fetchMaintenanceRowsFromBackend,
  maintenanceBackendEnabled,
} from '@/lib/maintenance-backend';
import { formatCurrency, formatShortDate } from '@/lib/prototype-ledger';
import { getDemoTenantContext } from '@/lib/tenant-demo';
import { commonStyles } from '@/lib/theme';
import { useAccess } from '@/providers/access-provider';
import { useMasterData } from '@/providers/master-data-provider';
import { usePrototype } from '@/providers/prototype-provider';
import type { MaintenanceRow } from '@/types/domain';

export default function TenantMaintenanceScreen() {
  const router = useRouter();
  const { currentTenantId } = useAccess();
  const { data, masterDataMessage } = useMasterData();
  const { ledgerRows, maintenanceRows } = usePrototype();
  const { maintenance, tenant, property, unit } = getDemoTenantContext(data, ledgerRows, maintenanceRows, currentTenantId);
  const [rows, setRows] = useState<MaintenanceRow[]>(maintenance);
  const [backendMessage, setBackendMessage] = useState<string | null>(null);
  const [recentActionMessage, setRecentActionMessage] = useState<string | null>(null);

  const loadRows = useCallback(async () => {
    if (!maintenanceBackendEnabled() || !property) {
      setRows(maintenance);
      setBackendMessage(null);
      return;
    }

    const result = await fetchMaintenanceRowsFromBackend();

    if (result.error) {
      setRows(maintenance);
      setBackendMessage('Repair records are temporarily unavailable.');
      return;
    }

    const unitId = unit?.id;
    const filteredRows = result.data.filter(
      (item) => item.propertyId === property.id && (item.tenantId === tenant?.id || item.unitId === unitId || item.unitId === null)
    );

    setRows(filteredRows);
    setBackendMessage(null);
  }, [maintenance, property, tenant?.id, unit?.id]);

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

  const handleRevoke = async (row: MaintenanceRow) => {
    if (!maintenanceBackendEnabled()) {
      setBackendMessage('Request revocation is not available right now.');
      return;
    }

    const result = await createMaintenanceUpdateInBackend({
      requestId: row.id,
      status: 'deferred',
      serviceDate: new Date().toISOString().slice(0, 10),
      cost: row.cost,
      note: 'Request revoked by tenant.',
      updatedBy: 'tenant',
    });

    if (result.error) {
      setBackendMessage(result.error);
      return;
    }

    await loadRows();
    setRecentActionMessage('Repair request updated.');
  };

  return (
    <ScreenContainer
      eyebrow="Tenant Portal"
      title="Repairs"
      subtitle="Open and past repair requests for your unit.">
      <SectionCard title="Need a repair?">
        <PrimaryButton label="New repair request" onPress={() => router.push('/(tenant)/maintenance-request' as Href)} />
      </SectionCard>

      <SectionCard title="Repair requests">
        {masterDataMessage ? <Text style={styles.statusMessage}>{masterDataMessage}</Text> : null}
        {backendMessage ? <Text style={styles.statusMessage}>{backendMessage}</Text> : null}
        {recentActionMessage ? <Text style={styles.successMessage}>{recentActionMessage}</Text> : null}
        {rows.map((item) => (
          <View key={item.id} style={styles.requestCard}>
            <View style={styles.row}>
              <View style={styles.copy}>
                <Text style={styles.title}>{item.title}</Text>
                <Text style={commonStyles.helperText}>{item.type} • Requested {formatShortDate(item.serviceDate)}</Text>
              </View>
              <StatusBadge label={formatRepairStatusLabel(item.status)} tone={maintenanceStatusTone(item.status)} />
            </View>
            <Text style={commonStyles.helperText}>{item.note}</Text>
            <Text style={commonStyles.helperText}>
              Last update {formatShortDate(item.serviceDate)} • Cost tracked {formatCurrency(item.cost)}
            </Text>
            {item.status === 'open' || item.status === 'in_progress' || item.status === 'deferred' ? (
              <View style={styles.actionRow}>
                <PrimaryButton
                  label="Revoke request"
                  onPress={() => {
                    void handleRevoke(item);
                  }}
                  variant="secondary"
                />
              </View>
            ) : null}
            {item.tenantName ? (
              <Text style={styles.submittedBy}>Submitted under {item.tenantName}</Text>
            ) : null}
            {item.images?.length ? (
              <View style={styles.imageSection}>
                <Text style={styles.imageLabel}>Attached photos ({item.images.length})</Text>
                <Text style={commonStyles.helperText}>Tap a photo to review what was attached to this repair.</Text>
                <ImageLightbox
                  images={item.images
                    .filter((image) => image.signedUrl)
                    .map((image) => ({
                      id: image.id,
                      uri: image.signedUrl!,
                      label: image.fileName,
                    }))}
                />
              </View>
            ) : null}
          </View>
        ))}
      </SectionCard>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  requestCard: {
    backgroundColor: '#F7F2EA',
    borderRadius: 18,
    marginBottom: 12,
    padding: 14,
  },
  row: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  copy: {
    flex: 1,
    paddingRight: 12,
  },
  title: {
    color: '#1F2933',
    fontSize: 15,
    fontWeight: '700',
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
  submittedBy: {
    color: '#2D5D8C',
    fontSize: 13,
    fontWeight: '700',
    marginTop: 4,
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
  actionRow: {
    marginTop: 12,
  },
});
