import { useCallback, useEffect, useMemo, useState } from 'react';
import { useFocusEffect } from 'expo-router';
import { Linking, Pressable, StyleSheet, Text, View } from 'react-native';

import { ScreenContainer } from '@/components/screen-container';
import { SectionCard } from '@/components/section-card';
import { formatStatusLabel } from '@/components/status-badge';
import { DEMO_MODE } from '@/lib/demo-mode';
import {
  fetchLeaseContextFromBackend,
  leasesDocumentsBackendEnabled,
} from '@/lib/leases-documents-backend';
import { formatCurrency, formatShortDate } from '@/lib/prototype-ledger';
import { getDemoTenantContext, getLeaseLengthLabel } from '@/lib/tenant-demo';
import { commonStyles } from '@/lib/theme';
import { useAccess } from '@/providers/access-provider';
import { useMasterData } from '@/providers/master-data-provider';
import { usePrototype } from '@/providers/prototype-provider';
import type { Document, Lease } from '@/types/domain';

export default function TenantLeaseScreen() {
  const { data, masterDataMessage } = useMasterData();
  const { ledgerRows, maintenanceRows } = usePrototype();
  const { currentTenantId } = useAccess();
  const { tenant, unit, property, lease: fallbackLease, documents: fallbackDocuments } = getDemoTenantContext(
    data,
    ledgerRows,
    maintenanceRows,
    currentTenantId
  );
  const [backendLease, setBackendLease] = useState<Lease | null>(null);
  const [backendDocuments, setBackendDocuments] = useState<Document[] | null>(null);
  const [backendMessage, setBackendMessage] = useState<string | null>(null);

  const loadLeaseContext = useCallback(async () => {
    if (!leasesDocumentsBackendEnabled()) {
      return;
    }

    const result = await fetchLeaseContextFromBackend({
      tenantId: currentTenantId ?? tenant?.id ?? '',
      unitId: unit?.id,
    });

    if (result.error) {
      setBackendLease(null);
      setBackendDocuments([]);
      setBackendMessage(result.error);
      return;
    }

    setBackendLease(result.lease ?? null);
    setBackendDocuments(result.documents);

    if (result.lease || result.documents.length > 0) {
      setBackendMessage(null);
    } else {
      setBackendMessage('No backend lease documents found yet.');
    }
  }, [currentTenantId, tenant?.id, unit?.id]);

  useEffect(() => {
    void loadLeaseContext();
  }, [loadLeaseContext]);

  useFocusEffect(
    useCallback(() => {
      void loadLeaseContext();
      return undefined;
    }, [loadLeaseContext])
  );

  const lease = DEMO_MODE ? fallbackLease : backendLease;
  const documents = useMemo(
    () => (DEMO_MODE ? fallbackDocuments : backendDocuments ?? []),
    [backendDocuments, fallbackDocuments]
  );
  const leaseLength = lease ? getLeaseLengthLabel(lease.startDate) : tenant ? getLeaseLengthLabel(tenant.moveInDate) : 'N/A';
  const statementDocuments = useMemo(
    () => documents.filter((document) => document.category === 'statement').sort((a, b) => b.uploadedAt.localeCompare(a.uploadedAt)),
    [documents]
  );
  const leaseDocuments = useMemo(
    () => documents.filter((document) => document.category !== 'statement').sort((a, b) => b.uploadedAt.localeCompare(a.uploadedAt)),
    [documents]
  );
  function documentCategoryLabel(category: Document['category']) {
    switch (category) {
      case 'maintenance':
        return 'Repair request';
      case 'move_in':
        return 'Other';
      case 'statement':
        return 'Statement';
      default:
        return formatStatusLabel(category);
    }
  }

  return (
    <ScreenContainer
      eyebrow="Tenant Portal"
      title="Lease & Documents"
      subtitle="Lease details, monthly statements, and account documents for this unit.">
      {masterDataMessage ? <Text style={commonStyles.helperText}>{masterDataMessage}</Text> : null}
      {backendMessage ? <Text style={commonStyles.helperText}>{backendMessage}</Text> : null}
      <SectionCard title="Lease summary">
        <View style={styles.summaryRow}>
          <View>
            <Text style={styles.title}>{property?.name}</Text>
            <Text style={commonStyles.helperText}>{unit?.label} • {property?.address}</Text>
          </View>
          <Text style={styles.length}>{leaseLength}</Text>
        </View>
        <Text style={commonStyles.helperText}>Move-in date: {formatShortDate(tenant?.moveInDate ?? null)}</Text>
        <Text style={commonStyles.helperText}>Lease start: {formatShortDate(lease?.startDate ?? tenant?.moveInDate ?? null)}</Text>
        <Text style={commonStyles.helperText}>Lease end: {formatShortDate(lease?.endDate ?? tenant?.leaseEndDate ?? null)}</Text>
        <Text style={commonStyles.helperText}>Renewal review: {formatShortDate(lease?.renewalDate ?? null)}</Text>
        <Text style={commonStyles.helperText}>Monthly rent: {formatCurrency(lease?.monthlyRent ?? unit?.monthlyRent ?? 0)}</Text>
        <Text style={commonStyles.helperText}>Security deposit: {formatCurrency(lease?.securityDeposit ?? 0)}</Text>
      </SectionCard>

      <SectionCard title="Bills & statements" subtitle="Recurring bill files and statements posted for your unit.">
        {statementDocuments.length > 0 ? (
          <View style={styles.tiles}>
            {statementDocuments.map((document) => (
              <Pressable
                key={document.id}
                onPress={() => {
                  if (document.fileUrl) {
                    void Linking.openURL(document.fileUrl);
                  }
                }}
                style={styles.tile}>
                <Text style={styles.tileTitle}>{document.title}</Text>
                <Text style={commonStyles.helperText}>
                  {document.unitId ? `${unit?.label ?? 'Unit'} • ` : ''}{documentCategoryLabel(document.category)}
                </Text>
                <Text style={commonStyles.helperText}>Saved {formatShortDate(document.uploadedAt)}</Text>
                <Text style={styles.tileStatus}>{document.fileUrl ? 'Open saved statement' : formatStatusLabel(document.status)}</Text>
              </Pressable>
            ))}
          </View>
        ) : (
          <Text style={commonStyles.helperText}>No bill statements have been uploaded for this unit yet.</Text>
        )}
      </SectionCard>

      <SectionCard title="Documents" subtitle="Lease paperwork, policies, repair documents, and other resident files.">
        <View style={styles.tiles}>
          {leaseDocuments.map((document) => (
            <Pressable
              key={document.id}
              onPress={() => {
                if (document.fileUrl) {
                  void Linking.openURL(document.fileUrl);
                }
              }}
              style={styles.tile}>
              <Text style={styles.tileTitle}>{document.title}</Text>
              <Text style={commonStyles.helperText}>{documentCategoryLabel(document.category)}</Text>
              <Text style={commonStyles.helperText}>Saved {formatShortDate(document.uploadedAt)}</Text>
              <Text style={styles.tileStatus}>
                {document.fileUrl
                  ? 'Open saved file'
                  : formatStatusLabel(document.status)}
              </Text>
            </Pressable>
          ))}
        </View>
      </SectionCard>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  summaryRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  title: {
    color: '#1F2933',
    fontSize: 16,
    fontWeight: '800',
  },
  length: {
    color: '#1D6E5B',
    fontSize: 14,
    fontWeight: '800',
  },
  tiles: {
    gap: 10,
  },
  tile: {
    backgroundColor: '#F3EEE5',
    borderRadius: 18,
    padding: 14,
  },
  tileTitle: {
    color: '#1F2933',
    fontSize: 15,
    fontWeight: '700',
  },
  tileStatus: {
    color: '#B76E3D',
    fontSize: 12,
    fontWeight: '700',
    marginTop: 8,
  },
});
