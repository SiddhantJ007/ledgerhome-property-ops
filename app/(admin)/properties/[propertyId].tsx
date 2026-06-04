import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';
import { useLocalSearchParams, useRouter, type Href } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Image, Linking, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { ActionLink } from '@/components/action-link';
import { ImageLightbox } from '@/components/image-lightbox';
import { PrimaryButton } from '@/components/primary-button';
import { ScreenContainer } from '@/components/screen-container';
import { SectionCard } from '@/components/section-card';
import { OptionPillGroup } from '@/components/option-pill-group';
import {
  contactRequestsBackendEnabled,
  fetchContactRequestsFromBackend,
} from '@/lib/contact-requests-backend';
import { DEMO_MODE } from '@/lib/demo-mode';
import {
  fetchPropertyDocumentsFromBackend,
  uploadPropertyChargeBatchDocumentToBackend,
} from '@/lib/leases-documents-backend';
import { createNotificationInBackend, notificationsBackendEnabled } from '@/lib/notifications-backend';
import { fetchLedgerRowsFromBackend, getRentReminderCopy } from '@/lib/payments-backend';
import {
  createPropertyChargeBatchInBackend,
  createPropertyChargeConfigInBackend,
  deletePropertyChargeBatchInBackend,
  deletePropertyChargeConfigInBackend,
  deleteSupplementalChargeInBackend,
  fetchPropertyChargeBatchAllocationsFromBackend,
  fetchPropertyChargeBatchesFromBackend,
  fetchPropertyChargeConfigsFromBackend,
  fetchSupplementalChargeRowsFromBackend,
  getCurrentSupplementalChargeDefaults,
  monthlyEquivalentAmount,
} from '@/lib/property-charge-configs-backend';
import {
  StatusBadge,
  formatRepairStatusLabel,
  formatStatusLabel,
  maintenanceStatusTone,
  occupancyTone,
  propertyStatusTone,
  rentStatusTone,
} from '@/components/status-badge';
import { hasText, isValidPhone, parsePositiveNumber } from '@/lib/form-utils';
import { stateOptions } from '@/lib/master-data';
import { formatCurrency, formatShortDate } from '@/lib/prototype-ledger';
import { commonStyles, palette } from '@/lib/theme';
import { useAuth } from '@/providers/auth-provider';
import { useMasterData } from '@/providers/master-data-provider';
import { useNotifications } from '@/providers/notifications-provider';
import { usePrototype } from '@/providers/prototype-provider';
import type {
  ContactRequest,
  Document,
  OccupancyStatus,
  PropertyChargeAllocationMethod,
  PropertyChargeBatch,
  PropertyChargeBatchAllocation,
  PropertyChargeCategory,
  PropertyChargeConfig,
  PropertyChargeFrequency,
  PropertyStatus,
  SupplementalChargeRow,
} from '@/types/domain';

export default function PropertyDetailScreen() {
  const { propertyId } = useLocalSearchParams<{ propertyId: string }>();
  const { isAuthenticated, isLoading: isAuthLoading } = useAuth();
  const {
    createUnit,
    data,
    deletePropertyRecord,
    getPropertyDetailById,
    savePropertyDetails,
    saveTenantAssignment,
    saveUnitOccupancy,
    uploadPropertyCoverImage,
    masterDataMessage,
  } = useMasterData();
  const { refreshNotifications } = useNotifications();
  const { notifyTenant } = usePrototype();
  const router = useRouter();
  const property = getPropertyDetailById(propertyId ?? '');
  const propertyRecord = data.properties.find((item) => item.id === (propertyId ?? '')) ?? null;
  const [noteDraft, setNoteDraft] = useState(property?.note ?? '');
  const [nameDraft, setNameDraft] = useState(property?.name ?? '');
  const [addressDraft, setAddressDraft] = useState(property?.address ?? '');
  const [propertyStatus, setPropertyStatus] = useState<PropertyStatus>(property?.status ?? 'active');
  const [stateCode, setStateCode] = useState<string>('NY');
  const [neighborhoodId, setNeighborhoodId] = useState(propertyRecord?.neighborhoodId ?? '');
  const [unitDrafts, setUnitDrafts] = useState<Record<string, { tenantName: string; tenantPhone: string }>>({});
  const [notifyMessage, setNotifyMessage] = useState<Record<string, string>>({});
  const [propertyError, setPropertyError] = useState<string | null>(null);
  const [unitErrors, setUnitErrors] = useState<Record<string, string>>({});
  const [backendPropertyInquiries, setBackendPropertyInquiries] = useState<ContactRequest[] | null>(null);
  const [backendLedgerRows, setBackendLedgerRows] = useState<ReturnType<typeof usePrototype>['ledgerRows'] | null>(null);
  const [propertyChargeConfigs, setPropertyChargeConfigs] = useState<PropertyChargeConfig[]>([]);
  const [propertyChargeMessage, setPropertyChargeMessage] = useState<string | null>(null);
  const [chargeCategory, setChargeCategory] = useState<PropertyChargeCategory>('utility');
  const [chargeTitle, setChargeTitle] = useState('');
  const [chargeDescription, setChargeDescription] = useState('');
  const [chargeAllocationMethod, setChargeAllocationMethod] = useState<PropertyChargeAllocationMethod>('manual');
  const [chargeFrequency, setChargeFrequency] = useState<PropertyChargeFrequency>('monthly');
  const [chargeAmount, setChargeAmount] = useState('');
  const [chargeBatches, setChargeBatches] = useState<PropertyChargeBatch[]>([]);
  const [chargeBatchAllocations, setChargeBatchAllocations] = useState<PropertyChargeBatchAllocation[]>([]);
  const [batchActionMessage, setBatchActionMessage] = useState<Record<string, string>>({});
  const [uploadingBatchId, setUploadingBatchId] = useState<string | null>(null);
  const [propertyDocuments, setPropertyDocuments] = useState<Document[]>([]);
  const [postedSupplementalCharges, setPostedSupplementalCharges] = useState<SupplementalChargeRow[]>([]);
  const [chargePostingDueDate, setChargePostingDueDate] = useState(getCurrentSupplementalChargeDefaults().dueDate);
  const [chargePostingMonthLabel, setChargePostingMonthLabel] = useState(getCurrentSupplementalChargeDefaults().monthLabel);
  const [unitChargeDrafts, setUnitChargeDrafts] = useState<Record<string, string>>({});
  const [isPostingChargeBatch, setIsPostingChargeBatch] = useState(false);
  const [propertyDeleteMessage, setPropertyDeleteMessage] = useState<string | null>(null);
  const [isUploadingCoverImage, setIsUploadingCoverImage] = useState(false);
  const [newUnitLabel, setNewUnitLabel] = useState('');
  const [newUnitBedrooms, setNewUnitBedrooms] = useState('2');
  const [newUnitBathrooms, setNewUnitBathrooms] = useState('1');
  const [newUnitRent, setNewUnitRent] = useState('1850');
  const [newUnitOccupancyStatus, setNewUnitOccupancyStatus] = useState<OccupancyStatus>('vacant');
  const [unitCreateMessage, setUnitCreateMessage] = useState<string | null>(null);
  const lastHydratedPropertySignature = useRef<string | null>(null);
  const lastHydratedUnitChargeSignature = useRef<string | null>(null);

  useEffect(() => {
    if (!property) {
      return;
    }

    const propertyNeighborhood = data.neighborhoods.find((item) => item.id === propertyRecord?.neighborhoodId);
    const nextSignature = JSON.stringify({
      propertyId: property.id,
      name: property.name,
      address: property.address,
      note: property.note,
      status: property.status,
      neighborhoodId: propertyRecord?.neighborhoodId ?? '',
      stateCode: propertyNeighborhood?.stateCode ?? 'NY',
      units: property.units.map((unit) => ({
        unitId: unit.unitId,
        tenantName: unit.tenantName === 'Unassigned' ? '' : unit.tenantName,
        tenantPhone: unit.tenantPhone,
      })),
    });

    if (lastHydratedPropertySignature.current === nextSignature) {
      return;
    }

    lastHydratedPropertySignature.current = nextSignature;

    setNoteDraft(property.note);
    setNameDraft(property.name);
    setAddressDraft(property.address);
    setPropertyStatus(property.status);
    setNeighborhoodId(propertyRecord?.neighborhoodId ?? '');
    setStateCode(propertyNeighborhood?.stateCode ?? 'NY');
    setUnitDrafts(
      Object.fromEntries(
        property.units.map((unit) => [unit.unitId, { tenantName: unit.tenantName === 'Unassigned' ? '' : unit.tenantName, tenantPhone: unit.tenantPhone }])
      )
    );
  }, [data.neighborhoods, property, propertyRecord?.neighborhoodId]);

  const neighborhoodsForState = data.neighborhoods.filter(
    (item) => item.stateCode === stateCode && item.isActive
  );
  const selectedNeighborhood =
    data.neighborhoods.find((item) => item.id === neighborhoodId) ?? neighborhoodsForState[0] ?? null;

  useEffect(() => {
    let isActive = true;

    async function loadPropertyLedger() {
      if (DEMO_MODE || isAuthLoading || !isAuthenticated || !propertyId) {
        return;
      }

      const result = await fetchLedgerRowsFromBackend();

      if (!isActive || result.error) {
        return;
      }

      setBackendLedgerRows(result.data.filter((row) => row.propertyId === propertyId));
    }

    void loadPropertyLedger();

    return () => {
      isActive = false;
    };
  }, [isAuthenticated, isAuthLoading, propertyId]);

  useEffect(() => {
    let isActive = true;

    async function loadPropertyChargeConfigs() {
      if (DEMO_MODE || !propertyId) {
        setPropertyChargeConfigs([]);
        return;
      }

      const result = await fetchPropertyChargeConfigsFromBackend({ propertyId });

      if (!isActive) {
        return;
      }

      if (result.error) {
        setPropertyChargeConfigs([]);
        setPropertyChargeMessage(result.error);
        return;
      }

        setPropertyChargeConfigs(result.data);
      setPropertyChargeMessage(
        result.data.length > 0
          ? 'Live charge templates are active for this property.'
          : 'No charge templates have been added for this property yet.'
      );
    }

    void loadPropertyChargeConfigs();

    return () => {
      isActive = false;
    };
  }, [propertyId]);

  useEffect(() => {
    let isActive = true;

    async function loadPropertyDocuments() {
      if (DEMO_MODE || !propertyId) {
        setPropertyDocuments([]);
        return;
      }

      const result = await fetchPropertyDocumentsFromBackend({ propertyId, category: 'statement' });

      if (!isActive) {
        return;
      }

      if (result.error) {
        setPropertyChargeMessage(result.error);
        return;
      }

      setPropertyDocuments(result.documents);
    }

    void loadPropertyDocuments();

    return () => {
      isActive = false;
    };
  }, [propertyId]);

  useEffect(() => {
    let isActive = true;

    async function loadPropertyChargeBatches() {
      if (DEMO_MODE || !propertyId) {
        setChargeBatches([]);
        setChargeBatchAllocations([]);
        return;
      }

      const [result, allocationsResult] = await Promise.all([
        fetchPropertyChargeBatchesFromBackend({ propertyId }),
        fetchPropertyChargeBatchAllocationsFromBackend({ propertyId }),
      ]);

      if (!isActive) {
        return;
      }

      if (result.error) {
        setPropertyChargeMessage(result.error);
        return;
      }

      setChargeBatches(result.data);

      if (allocationsResult.error) {
        setPropertyChargeMessage(allocationsResult.error);
        return;
      }

      setChargeBatchAllocations(allocationsResult.data);
    }

    void loadPropertyChargeBatches();

    return () => {
      isActive = false;
    };
  }, [propertyId]);

  useEffect(() => {
    let isActive = true;

    async function loadPostedSupplementalCharges() {
      if (DEMO_MODE || !propertyId) {
        setPostedSupplementalCharges([]);
        return;
      }

      const result = await fetchSupplementalChargeRowsFromBackend({ propertyId });

      if (!isActive) {
        return;
      }

      if (result.error) {
        setPostedSupplementalCharges([]);
        setPropertyChargeMessage(result.error);
        return;
      }

      setPostedSupplementalCharges(result.data);
    }

    void loadPostedSupplementalCharges();

    return () => {
      isActive = false;
    };
  }, [propertyId]);

  useEffect(() => {
    let isActive = true;

    async function loadPropertyInquiries() {
      if (!property || !contactRequestsBackendEnabled()) {
        return;
      }

      const result = await fetchContactRequestsFromBackend({ propertyId: property.id });

      if (!isActive || result.error) {
        return;
      }

      setBackendPropertyInquiries(result.data);
    }

    void loadPropertyInquiries();

    return () => {
      isActive = false;
    };
  }, [property]);

  useEffect(() => {
    if (!property) {
      return;
    }

    const nextSignature = JSON.stringify(
      property.units.map((unit) => ({
        unitId: unit.unitId,
      }))
    );

    if (lastHydratedUnitChargeSignature.current === nextSignature) {
      return;
    }

    lastHydratedUnitChargeSignature.current = nextSignature;

    setUnitChargeDrafts((current) =>
      Object.fromEntries(
        property.units.map((unit) => [unit.unitId, current[unit.unitId] ?? '0'])
      )
    );
  }, [property]);

  if (!property) {
    return (
      <ScreenContainer title="Property not found" subtitle="The requested property record could not be loaded." />
    );
  }

  const handleTenantDraftChange = (unitId: string, key: 'tenantName' | 'tenantPhone', value: string) => {
    setUnitDrafts((current) => ({
      ...current,
      [unitId]: {
        tenantName: current[unitId]?.tenantName ?? '',
        tenantPhone: current[unitId]?.tenantPhone ?? '',
        [key]: value,
      },
    }));
  };

  const propertyExpectedRent = DEMO_MODE
    ? property.expectedRent
    : (backendLedgerRows ?? []).reduce((sum, row) => sum + row.expectedAmount, 0);
  const propertyPendingRent = DEMO_MODE
    ? property.pendingRent
    : (backendLedgerRows ?? []).reduce((sum, row) => sum + row.pendingAmount + row.priorBalanceAmount, 0);
  const propertyOverdueCount = DEMO_MODE
    ? property.overdueCount
    : (backendLedgerRows ?? []).filter((row) => row.status === 'overdue').length;
  const backendLedgerByUnitId = new Map((backendLedgerRows ?? []).map((row) => [row.unitId, row]));
  const propertyChargeMonthlyTotal = propertyChargeConfigs
    .filter((item) => item.isActive)
    .reduce((sum, item) => sum + monthlyEquivalentAmount(item), 0);
  const firstVacantUnit = property.units.find((unit) => unit.tenantId === null);
  const occupiedUnits = property.units.filter((unit) => unit.tenantId);

  const applyEqualSplitToUnits = () => {
    const totalAmount = Number(chargeAmount || 0);

    if (!Number.isFinite(totalAmount) || totalAmount <= 0 || occupiedUnits.length === 0) {
      setPropertyChargeMessage('Enter a bill amount above $0 before splitting it across units.');
      return;
    }

    const perUnitBase = Math.floor((totalAmount / occupiedUnits.length) * 100) / 100;
    let remainder = Math.round(totalAmount * 100 - perUnitBase * 100 * occupiedUnits.length);

    setUnitChargeDrafts(
      Object.fromEntries(
        property.units.map((unit) => {
          if (!unit.tenantId) {
            return [unit.unitId, '0'];
          }

          const extraCent = remainder > 0 ? 0.01 : 0;
          if (remainder > 0) {
            remainder -= 1;
          }

          return [unit.unitId, (perUnitBase + extraCent).toFixed(2)];
        })
      )
    );
    setPropertyChargeMessage('Bill split equally across occupied units. You can still adjust any unit manually below.');
  };

  const allocationTotal = property.units.reduce((sum, unit) => sum + Number(unitChargeDrafts[unit.unitId] || 0), 0);

  const isValidIsoDate = (value: string) => /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(new Date(`${value}T12:00:00`).getTime());

  const handleBatchBillUpload = async (batch: PropertyChargeBatch) => {
    setBatchActionMessage((current) => ({ ...current, [batch.id]: '' }));
    setUploadingBatchId(batch.id);
    const result = await DocumentPicker.getDocumentAsync({
      copyToCacheDirectory: true,
      multiple: false,
      type: ['application/pdf', 'image/*'],
    });

    if (result.canceled || !result.assets?.length) {
      setBatchActionMessage((current) => ({ ...current, [batch.id]: 'Bill upload was cancelled before any file was selected.' }));
      setUploadingBatchId(null);
      return;
    }

    const upload = await uploadPropertyChargeBatchDocumentToBackend({
      batchId: batch.id,
      title: `${batch.title} • ${batch.billingPeriodLabel}`,
      asset: result.assets[0],
      uploadedBy: 'admin',
    });

    if (upload.error) {
      setPropertyChargeMessage(upload.error);
      setBatchActionMessage((current) => ({ ...current, [batch.id]: upload.error ?? 'Unable to upload bill statement.' }));
      setUploadingBatchId(null);
      return;
    }

    if (upload.documents.length > 0) {
      setPropertyDocuments((current) => {
        const next = [...upload.documents, ...current];
        const seen = new Set<string>();

        return next.filter((document) => {
          if (seen.has(document.id)) {
            return false;
          }

          seen.add(document.id);
          return true;
        });
      });
    } else {
      const refreshed = await fetchPropertyDocumentsFromBackend({ propertyId: property.id, category: 'statement' });

      if (!refreshed.error) {
        setPropertyDocuments(refreshed.documents);
      }
    }

    const successMessage =
      upload.documents.length > 0
        ? `Statement uploaded for ${upload.documents.length} tenant record${upload.documents.length === 1 ? '' : 's'}. Tenants can view it in Lease & Documents.`
        : 'Statement uploaded. Linked tenants can now view the statement in their documents tab.';

    setPropertyChargeMessage(successMessage);
    setBatchActionMessage((current) => ({
      ...current,
      [batch.id]: successMessage,
    }));
    setUploadingBatchId(null);
  };

  const pickAndUploadCoverImage = async () => {
    setPropertyError(null);

    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (!permission.granted) {
      setPropertyError('Photo access is required to upload a property cover image.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.8,
      base64: true,
    });

    if (result.canceled || !result.assets[0]) {
      return;
    }

    setIsUploadingCoverImage(true);
    const uploadResult = await uploadPropertyCoverImage(property.id, result.assets[0]);
    setIsUploadingCoverImage(false);

    if (uploadResult.error) {
      setPropertyError(uploadResult.error);
      return;
    }
  };
  const showPropertyProfile = false;
  const showOptionalBillTools = false;
  const showPropertyControls = false;

  return (
    <ScreenContainer
      eyebrow="Property Detail"
      title={property.name}
      subtitle={`${property.neighborhood} • ${property.address}`}>
      {property.imageUrl ? (
        <>
          <Image source={{ uri: property.imageUrl }} style={styles.heroImage} />
          <ImageLightbox
            images={[
              {
                id: property.id,
                uri: property.imageUrl,
                label: `${property.name} cover image`,
              },
            ]}
            thumbnailSize={84}
          />
        </>
      ) : (
        <View style={styles.heroPlaceholder}>
          <Text style={styles.heroPlaceholderTitle}>No property image</Text>
          <Text style={styles.heroPlaceholderCopy}>This building does not have a cover image yet.</Text>
        </View>
      )}

      <SectionCard title="Property overview" subtitle="Fast paths for the records used most often.">
        <View style={styles.metricsGrid}>
          <View style={styles.metricTile}>
            <Text style={styles.metricValue}>{property.totalUnits}</Text>
            <Text style={styles.metricLabel}>Units</Text>
          </View>
          <View style={styles.metricTile}>
            <Text style={styles.metricValue}>{property.occupiedUnits}</Text>
            <Text style={styles.metricLabel}>Occupied</Text>
          </View>
          <View style={styles.metricTile}>
            <Text style={styles.metricValue}>{property.vacantUnits}</Text>
            <Text style={styles.metricLabel}>Vacant / turnover</Text>
          </View>
          <View style={styles.metricTile}>
            <Text style={styles.metricValue}>{formatCurrency(propertyPendingRent)}</Text>
            <Text style={styles.metricLabel}>Amount owed</Text>
          </View>
        </View>
        <View style={styles.statusRow}>
          <StatusBadge label={formatStatusLabel(property.status)} tone={propertyStatusTone(property.status)} />
          <StatusBadge
            label={propertyOverdueCount > 0 ? `${propertyOverdueCount} overdue` : 'rent stable'}
            tone={propertyOverdueCount > 0 ? rentStatusTone('overdue') : rentStatusTone('paid')}
          />
          <StatusBadge
            label={`${property.openMaintenanceCount} repair${property.openMaintenanceCount === 1 ? '' : 's'}`}
            tone={property.openMaintenanceCount > 0 ? maintenanceStatusTone('open') : maintenanceStatusTone('completed')}
          />
        </View>
        <View style={styles.shortcutGrid}>
          <View style={styles.shortcutItem}>
            <ActionLink href="/units" label="Open units" />
          </View>
          <View style={styles.shortcutItem}>
            <ActionLink href="/tenants" label="Open tenants" />
          </View>
          <View style={styles.shortcutItem}>
            <ActionLink href={{ pathname: '/units/add', params: { propertyId: property.id } }} label="Add unit" />
          </View>
          {firstVacantUnit?.unitId ? (
            <View style={styles.shortcutItem}>
              <ActionLink
                href={{ pathname: '/tenants/add', params: { propertyId: property.id, unitId: firstVacantUnit.unitId } }}
                label="Add tenant"
              />
            </View>
          ) : null}
        </View>
      </SectionCard>

      {showPropertyProfile ? (
      <SectionCard
        collapsible
        defaultCollapsed
        title="Property profile"
        subtitle="Edit the building record, image, status, and notes.">
        <Text style={styles.fieldLabel}>Property name</Text>
        <TextInput
          onChangeText={setNameDraft}
          placeholder="Enter property name"
          placeholderTextColor={palette.mutedText}
          style={styles.inlineInput}
          value={nameDraft}
        />

        <Text style={styles.fieldLabel}>Address</Text>
        <TextInput
          onChangeText={setAddressDraft}
          placeholder="Enter property address"
          placeholderTextColor={palette.mutedText}
          style={styles.inlineInput}
          value={addressDraft}
        />

        <Text style={styles.fieldLabel}>State</Text>
        <OptionPillGroup
          onChange={(value) => {
            const nextState = value as 'NY' | 'NJ' | 'PA';
            setStateCode(nextState);
            const nextNeighborhood = data.neighborhoods.find(
              (item) => item.stateCode === nextState && item.isActive
            );
            setNeighborhoodId(nextNeighborhood?.id ?? '');
          }}
          options={stateOptions}
          selectedValue={stateCode}
        />

        <Text style={styles.fieldLabel}>Neighborhood / Borough</Text>
        {neighborhoodsForState.length > 0 ? (
          <OptionPillGroup
            onChange={setNeighborhoodId}
            options={neighborhoodsForState.map((item) => ({ label: item.name, value: item.id }))}
            selectedValue={selectedNeighborhood?.id ?? ''}
          />
        ) : (
          <Text style={styles.errorText}>Add an active neighborhood in {stateCode} before moving this property.</Text>
        )}

        <Text style={styles.fieldLabel}>Cover image</Text>
        <View style={styles.imageActionRow}>
          <View style={styles.imageAction}>
            <PrimaryButton
              label={isUploadingCoverImage ? 'Uploading image...' : property.imageUrl ? 'Replace image' : 'Upload image'}
              onPress={pickAndUploadCoverImage}
              variant="secondary"
            />
          </View>
          {property.imageUrl ? (
            <View style={styles.imageAction}>
              <PrimaryButton
                label="Remove image"
                onPress={async () => {
                  const result = await savePropertyDetails(property.id, {
                    name: nameDraft.trim() || property.name,
                    address: addressDraft.trim() || property.address,
                    note: noteDraft.trim() || property.note,
                    status: propertyStatus,
                    neighborhoodId: selectedNeighborhood?.id ?? propertyRecord?.neighborhoodId ?? '',
                    coverImageUrl: '',
                  });

                  if (result.error) {
                    setPropertyError(result.error);
                    return;
                  }

                  setPropertyError(null);
                }}
                variant="secondary"
              />
            </View>
          ) : null}
        </View>

        <Text style={styles.fieldLabel}>Building status</Text>
        <OptionPillGroup
          onChange={(value) => setPropertyStatus(value as PropertyStatus)}
          options={[
            { label: 'Active', value: 'active' },
            { label: 'Inactive', value: 'inactive' },
          ]}
          selectedValue={propertyStatus}
        />

        <Text style={styles.fieldLabel}>Property notes</Text>
        <TextInput
          multiline
          onChangeText={setNoteDraft}
          placeholder="Add property operating notes"
          placeholderTextColor={palette.mutedText}
          style={styles.notesInput}
          value={noteDraft}
        />
        {masterDataMessage ? <Text style={commonStyles.helperText}>{masterDataMessage}</Text> : null}
        {propertyError ? <Text style={styles.errorText}>{propertyError}</Text> : null}

        <View style={styles.buttonRow}>
          <PrimaryButton label="Save property updates" onPress={async () => {
            if (!hasText(nameDraft) || !hasText(addressDraft)) {
              setPropertyError('Property name and address are required.');
              return;
            }

            if (!hasText(noteDraft)) {
              setPropertyError('Property notes cannot be empty.');
              return;
            }

            if (!selectedNeighborhood) {
              setPropertyError('Choose a valid neighborhood before saving this property.');
              return;
            }

            setPropertyError(null);
            const saveResult = await savePropertyDetails(property.id, {
              name: nameDraft.trim(),
              address: addressDraft.trim(),
              note: noteDraft.trim(),
              status: propertyStatus,
              neighborhoodId: selectedNeighborhood.id,
              coverImageUrl: property.imageUrl,
            });
            if (saveResult.error) {
              setPropertyError(saveResult.error ?? 'Unable to save property updates.');
            }
          }} />
        </View>
      </SectionCard>
      ) : null}

      <SectionCard title="Units & occupancy" subtitle="Add units here first, then assign residents as the building fills up.">
        <View style={styles.statusRow}>
          <StatusBadge label={`${property.totalUnits} total units`} tone="neutral" />
          <StatusBadge label={`${property.occupiedUnits} occupied`} tone={occupancyTone('occupied')} />
          <StatusBadge label={`${property.vacantUnits} vacant / turnover`} tone={occupancyTone('vacant')} />
        </View>

        {firstVacantUnit?.unitId ? (
          <View style={styles.summaryPanel}>
            <Text style={styles.summaryTitle}>Next vacancy ready for leasing</Text>
            <Text style={commonStyles.helperText}>
              {firstVacantUnit.label} can be assigned immediately from this property.
            </Text>
            <ActionLink
              href={{ pathname: '/tenants/add', params: { propertyId: property.id, unitId: firstVacantUnit.unitId } }}
              label="Add tenant to vacant unit"
            />
          </View>
        ) : (
          <View style={styles.summaryPanel}>
            <Text style={styles.summaryTitle}>No vacant units available</Text>
            <Text style={commonStyles.helperText}>
              Add a new unit below or move a current unit into turnover before assigning a new tenant.
            </Text>
          </View>
        )}

        <Text style={styles.fieldLabel}>New unit label</Text>
        <TextInput
          onChangeText={setNewUnitLabel}
          placeholder="Unit 3A"
          placeholderTextColor={palette.mutedText}
          style={styles.inlineInput}
          value={newUnitLabel}
        />

        <View style={styles.inlineRow}>
          <View style={styles.fieldBlock}>
            <Text style={styles.fieldLabel}>Bedrooms</Text>
            <TextInput
              keyboardType="numeric"
              onChangeText={setNewUnitBedrooms}
              placeholder="2"
              placeholderTextColor={palette.mutedText}
              style={styles.inlineInput}
              value={newUnitBedrooms}
            />
          </View>
          <View style={styles.fieldBlock}>
            <Text style={styles.fieldLabel}>Bathrooms</Text>
            <TextInput
              keyboardType="numeric"
              onChangeText={setNewUnitBathrooms}
              placeholder="1"
              placeholderTextColor={palette.mutedText}
              style={styles.inlineInput}
              value={newUnitBathrooms}
            />
          </View>
        </View>

        <Text style={styles.fieldLabel}>Monthly rent</Text>
        <TextInput
          keyboardType="numeric"
          onChangeText={setNewUnitRent}
          placeholder="1850"
          placeholderTextColor={palette.mutedText}
          style={styles.inlineInput}
          value={newUnitRent}
        />

        <Text style={styles.fieldLabel}>Occupancy status</Text>
        <OptionPillGroup
          onChange={(value) => setNewUnitOccupancyStatus(value as OccupancyStatus)}
          options={[
            { label: 'Vacant', value: 'vacant' },
            { label: 'Turnover', value: 'turnover' },
            { label: 'Occupied', value: 'occupied' },
          ]}
          selectedValue={newUnitOccupancyStatus}
        />

        <View style={styles.buttonRow}>
          <PrimaryButton
            label="Add unit to this property"
            onPress={async () => {
              const nextBedrooms = parsePositiveNumber(newUnitBedrooms);
              const nextBathrooms = parsePositiveNumber(newUnitBathrooms);
              const nextMonthlyRent = parsePositiveNumber(newUnitRent);
              const duplicateLabel = data.units.some(
                (unit) =>
                  unit.propertyId === property.id &&
                  unit.label.trim().toLowerCase() === newUnitLabel.trim().toLowerCase()
              );

              if (!hasText(newUnitLabel)) {
                setUnitCreateMessage('Unit label is required.');
                return;
              }

              if (duplicateLabel) {
                setUnitCreateMessage('Unit label must be unique within this property.');
                return;
              }

              if (nextBedrooms == null || nextBathrooms == null || nextMonthlyRent == null || nextMonthlyRent <= 0) {
                setUnitCreateMessage('Bedrooms, bathrooms, and monthly rent must be valid numbers.');
                return;
              }

              const result = await createUnit(
                property.id,
                newUnitLabel.trim(),
                nextBedrooms,
                nextBathrooms,
                nextMonthlyRent,
                newUnitOccupancyStatus
              );

              if (result.error) {
                setUnitCreateMessage(result.error);
                return;
              }

              setUnitCreateMessage('Unit added to this property.');
              setNewUnitLabel('');
              setNewUnitBedrooms('2');
              setNewUnitBathrooms('1');
              setNewUnitRent('1850');
              setNewUnitOccupancyStatus('vacant');
            }}
          />
        </View>
        {unitCreateMessage ? <Text style={unitCreateMessage.includes('added') ? styles.successText : styles.errorText}>{unitCreateMessage}</Text> : null}
      </SectionCard>

      <SectionCard title="Asset summary" subtitle="Core health, collections, and open work across the property.">
        <View style={styles.statusRow}>
          <StatusBadge label={formatStatusLabel(property.status)} tone={propertyStatusTone(property.status)} />
          <StatusBadge
            label={propertyOverdueCount > 0 ? `${propertyOverdueCount} overdue` : 'rent stable'}
            tone={propertyOverdueCount > 0 ? rentStatusTone('overdue') : rentStatusTone('paid')}
          />
          <StatusBadge
            label={`${property.openMaintenanceCount} open repair${property.openMaintenanceCount === 1 ? '' : 's'}`}
            tone={property.openMaintenanceCount > 0 ? maintenanceStatusTone('open') : maintenanceStatusTone('completed')}
          />
        </View>

        <View style={styles.metricsGrid}>
          <View style={styles.metricTile}>
            <Text style={styles.metricValue}>{property.totalUnits}</Text>
            <Text style={styles.metricLabel}>Total units</Text>
          </View>
          <View style={styles.metricTile}>
            <Text style={styles.metricValue}>
              {property.occupiedUnits}/{property.totalUnits}
            </Text>
            <Text style={styles.metricLabel}>Occupied</Text>
          </View>
          <View style={styles.metricTile}>
            <Text style={styles.metricValue}>{formatCurrency(propertyExpectedRent)}</Text>
            <Text style={styles.metricLabel}>Expected rent</Text>
          </View>
          <View style={styles.metricTile}>
            <Text style={styles.metricValue}>{formatCurrency(propertyPendingRent)}</Text>
            <Text style={styles.metricLabel}>Pending balance</Text>
          </View>
        </View>
      </SectionCard>

      {showOptionalBillTools ? (
      <SectionCard
        collapsible
        defaultCollapsed
        title="Optional bill tools"
        subtitle="Advanced owner bill tools are collapsed by default to keep the property record focused.">
        {propertyChargeMessage ? <Text style={commonStyles.helperText}>{propertyChargeMessage}</Text> : null}
        <View style={styles.metricsGrid}>
          <View style={styles.metricTile}>
            <Text style={styles.metricValue}>{chargeBatches.length}</Text>
            <Text style={styles.metricLabel}>Bills posted</Text>
          </View>
          <View style={styles.metricTile}>
            <Text style={styles.metricValue}>{formatCurrency(postedSupplementalCharges.reduce((sum, item) => sum + item.pendingAmount, 0))}</Text>
            <Text style={styles.metricLabel}>Still due from tenants</Text>
          </View>
        </View>

        <View style={styles.summaryPanel}>
          <Text style={styles.summaryTitle}>Post a new bill</Text>
          <Text style={commonStyles.helperText}>
            Use this when the owner receives an actual bill. Leave a unit at $0 to exclude it. Vacant units can stay at $0 and remain owner-covered.
          </Text>
        </View>

        <Text style={styles.fieldLabel}>Category</Text>
        <OptionPillGroup
          onChange={(value) => setChargeCategory(value as PropertyChargeCategory)}
          options={[
            { label: 'Shared bill', value: 'utility' },
            { label: 'Property bill', value: 'tax' },
          ]}
          selectedValue={chargeCategory}
        />

        <Text style={styles.fieldLabel}>Bill title</Text>
        <TextInput
          onChangeText={setChargeTitle}
          placeholder={chargeCategory === 'utility' ? 'Shared building bill' : 'Property bill installment'}
          placeholderTextColor={palette.mutedText}
          style={styles.inlineInput}
          value={chargeTitle}
        />

        <Text style={styles.fieldLabel}>Bill note</Text>
        <TextInput
          onChangeText={setChargeDescription}
          placeholder="Optional note for the admin team"
          placeholderTextColor={palette.mutedText}
          style={styles.inlineInput}
          value={chargeDescription}
        />

        <View style={styles.inlineRow}>
          <View style={styles.fieldBlock}>
            <Text style={styles.fieldLabel}>Billing period label</Text>
            <TextInput
              onChangeText={setChargePostingMonthLabel}
              placeholder="April 2026"
              placeholderTextColor={palette.mutedText}
              style={styles.inlineInput}
              value={chargePostingMonthLabel}
            />
          </View>
          <View style={styles.fieldBlock}>
            <Text style={styles.fieldLabel}>Due date</Text>
            <TextInput
              onChangeText={setChargePostingDueDate}
              placeholder="YYYY-MM-DD"
              placeholderTextColor={palette.mutedText}
              style={styles.inlineInput}
              value={chargePostingDueDate}
            />
          </View>
        </View>

        <Text style={styles.fieldLabel}>Total bill amount</Text>
        <TextInput
          keyboardType="numeric"
          onChangeText={setChargeAmount}
          placeholder="0"
          placeholderTextColor={palette.mutedText}
          style={styles.inlineInput}
          value={chargeAmount}
        />

        <View style={styles.buttonRow}>
          <PrimaryButton label="Split equally across occupied units" onPress={applyEqualSplitToUnits} variant="secondary" />
        </View>

        <Text style={styles.fieldLabel}>Unit allocations</Text>
        <Text style={commonStyles.helperText}>
          Allocation total {formatCurrency(allocationTotal)} of {formatCurrency(Number(chargeAmount || 0))}
        </Text>
        <View style={styles.chargeList}>
          {property.units.map((unit) => (
            <View key={unit.unitId} style={styles.chargeCard}>
              <View style={commonStyles.rowBetween}>
                <View style={styles.tenantCopy}>
                  <Text style={styles.tenantName}>{unit.label}</Text>
                  <Text style={commonStyles.helperText}>
                    {unit.tenantName} • {formatStatusLabel(unit.occupancyStatus)}
                  </Text>
                </View>
                <View style={styles.allocationInputWrap}>
                  <TextInput
                    keyboardType="numeric"
                    onChangeText={(value) =>
                      setUnitChargeDrafts((current) => ({
                        ...current,
                        [unit.unitId]: value,
                      }))
                    }
                    placeholder="0"
                    placeholderTextColor={palette.mutedText}
                    style={styles.inlineInput}
                    value={unitChargeDrafts[unit.unitId] ?? '0'}
                  />
                </View>
              </View>
            </View>
          ))}
        </View>

        <View style={styles.buttonRow}>
          <PrimaryButton
            label={isPostingChargeBatch ? 'Posting bill...' : 'Post bill to selected units'}
            loading={isPostingChargeBatch}
            onPress={async () => {
              setIsPostingChargeBatch(true);
              try {
                const parsedAmount = Number(chargeAmount || 0);
                const normalizedAllocationTotal = Number(allocationTotal.toFixed(2));

                if (!hasText(chargeTitle)) {
                  setPropertyChargeMessage('Enter a title for this bill.');
                  return;
                }

                if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
                  setPropertyChargeMessage('Enter a valid total bill amount above $0.');
                  return;
                }

                if (!hasText(chargePostingMonthLabel)) {
                  setPropertyChargeMessage('Enter a billing period label before posting the bill.');
                  return;
                }

                if (!isValidIsoDate(chargePostingDueDate)) {
                  setPropertyChargeMessage('Enter a valid due date in YYYY-MM-DD format.');
                  return;
                }

                if (Math.abs(normalizedAllocationTotal - parsedAmount) > 0.01) {
                  setPropertyChargeMessage(
                    `Allocated total ${formatCurrency(normalizedAllocationTotal)} must equal the bill total ${formatCurrency(parsedAmount)} before posting.`
                  );
                  return;
                }

                const allocations = property.units.map((unit) => ({
                  unitId: unit.unitId,
                  tenantId: unit.tenantId,
                  allocatedAmount: Number(unitChargeDrafts[unit.unitId] || 0),
                }));

                if (!allocations.some((item) => item.tenantId && item.allocatedAmount > 0)) {
                  setPropertyChargeMessage('Assign at least one positive allocation to an occupied unit before posting.');
                  return;
                }

                const result = await createPropertyChargeBatchInBackend({
                  propertyId: property.id,
                  category: chargeCategory,
                  title: chargeTitle.trim(),
                  description: chargeDescription.trim(),
                  billingPeriodLabel: chargePostingMonthLabel.trim(),
                  dueDate: chargePostingDueDate,
                  totalAmount: parsedAmount,
                  allocations,
                });

                if (result.error) {
                  setPropertyChargeMessage(result.error);
                  return;
                }

                const [batchesResult, chargesResult, allocationsResult] = await Promise.all([
                  fetchPropertyChargeBatchesFromBackend({ propertyId: property.id }),
                  fetchSupplementalChargeRowsFromBackend({ propertyId: property.id }),
                  fetchPropertyChargeBatchAllocationsFromBackend({ propertyId: property.id }),
                ]);

                if (!batchesResult.error) {
                  setChargeBatches(batchesResult.data);
                }

                if (!chargesResult.error) {
                  setPostedSupplementalCharges(chargesResult.data);
                }

                if (!allocationsResult.error) {
                  setChargeBatchAllocations(allocationsResult.data);
                }

                await refreshNotifications();

                setPropertyChargeMessage(
                  `Posted ${chargeCategory} bill to ${result.postedCount} occupied unit${result.postedCount === 1 ? '' : 's'}. Due ${formatShortDate(result.effectiveDueDate)}. Units left at $0 stayed excluded.`
                );
                setChargeTitle('');
                setChargeDescription('');
                setChargeAmount('');
                setUnitChargeDrafts(
                  Object.fromEntries(property.units.map((unit) => [unit.unitId, '0']))
                );
              } catch (error) {
                setPropertyChargeMessage(
                  error instanceof Error ? error.message : 'Unable to post the bill right now.'
                );
              } finally {
                setIsPostingChargeBatch(false);
              }
            }}
            variant="secondary"
          />
        </View>
        {propertyChargeMessage ? (
          <Text style={propertyChargeMessage.toLowerCase().includes('posted') || propertyChargeMessage.toLowerCase().includes('uploaded') || propertyChargeMessage.toLowerCase().includes('saved')
            ? styles.successText
            : styles.errorText}>
            {propertyChargeMessage}
          </Text>
        ) : null}

        {chargeBatches.length > 0 ? (
          <>
            <Text style={styles.fieldLabel}>Recently posted bills</Text>
            <View style={styles.chargeList}>
              {chargeBatches.slice(0, 5).map((batch) => {
                const batchAllocations = chargeBatchAllocations.filter((item) => item.batchId === batch.id);

                return (
                  <View key={batch.id} style={styles.chargeCard}>
                    <View style={commonStyles.rowBetween}>
                      <View style={styles.tenantCopy}>
                        <Text style={styles.tenantName}>{batch.title}</Text>
                        <Text style={commonStyles.helperText}>
                          {formatStatusLabel(batch.category)} • {batch.billingPeriodLabel} • Due {formatShortDate(batch.dueDate)}
                        </Text>
                        {batch.description ? <Text style={commonStyles.helperText}>{batch.description}</Text> : null}
                      </View>
                      <StatusBadge label={`${batch.postedUnitCount} units`} tone="neutral" />
                    </View>
                    <Text style={commonStyles.helperText}>Total posted {formatCurrency(batch.totalAmount)}</Text>
                    {batchAllocations.length > 0 ? (
                      <Text style={commonStyles.helperText}>
                        Assigned to {batchAllocations.map((item) => `${item.tenantName} (${item.unitLabel} • ${formatCurrency(item.allocatedAmount)})`).join(', ')}
                      </Text>
                    ) : (
                      <Text style={commonStyles.helperText}>No tenant allocations are attached to this bill yet.</Text>
                    )}
                    <View style={styles.chargeActionRow}>
                      <PrimaryButton
                        label={uploadingBatchId === batch.id ? 'Uploading statement...' : 'Upload statement for tenants'}
                        onPress={async () => {
                          await handleBatchBillUpload(batch);
                        }}
                        loading={uploadingBatchId === batch.id}
                        variant="secondary"
                      />
                    </View>
                    {batchActionMessage[batch.id] ? (
                      <Text style={batchActionMessage[batch.id].toLowerCase().includes('uploaded') ? styles.successText : styles.errorText}>
                        {batchActionMessage[batch.id]}
                      </Text>
                    ) : null}
                    <View style={styles.chargeActionRow}>
                      <PrimaryButton
                        label="Remove this bill posting"
                        onPress={async () => {
                          const result = await deletePropertyChargeBatchInBackend({
                            batchId: batch.id,
                            propertyId: batch.propertyId,
                            title: batch.title,
                            billingPeriodLabel: batch.billingPeriodLabel,
                            dueDate: batch.dueDate,
                          });

                          if (result.error) {
                            setPropertyChargeMessage(result.error);
                            return;
                          }

                          const [batchesResult, chargesResult, allocationsResult] = await Promise.all([
                            fetchPropertyChargeBatchesFromBackend({ propertyId: property.id }),
                            fetchSupplementalChargeRowsFromBackend({ propertyId: property.id }),
                            fetchPropertyChargeBatchAllocationsFromBackend({ propertyId: property.id }),
                          ]);

                          if (!batchesResult.error) {
                            setChargeBatches(batchesResult.data);
                          }

                          if (!chargesResult.error) {
                            setPostedSupplementalCharges(chargesResult.data);
                          }

                          if (!allocationsResult.error) {
                            setChargeBatchAllocations(allocationsResult.data);
                          }

                          await refreshNotifications();
                          setPropertyChargeMessage('Posted bill and its resident charges were removed.');
                        }}
                        variant="secondary"
                      />
                    </View>
                  </View>
                );
              })}
            </View>
          </>
        ) : null}

        <Text style={styles.fieldLabel}>Uploaded bill statements</Text>
        {propertyDocuments.length > 0 ? (
          <View style={styles.chargeList}>
            {propertyDocuments.slice(0, 12).map((document) => (
              <Pressable
                key={document.id}
                onPress={() => {
                  if (document.fileUrl) {
                    void Linking.openURL(document.fileUrl);
                  }
                }}
                style={styles.chargeCard}>
                <View style={commonStyles.rowBetween}>
                  <View style={styles.tenantCopy}>
                    <Text style={styles.tenantName}>{document.title}</Text>
                    <Text style={commonStyles.helperText}>
                      {document.tenantId
                        ? `${data.tenants.find((tenant) => tenant.id === document.tenantId)?.fullName ?? 'Tenant'} • ${document.unitId ? data.units.find((unit) => unit.id === document.unitId)?.label ?? 'Unit' : 'Unit'}`
                        : document.unitId
                          ? data.units.find((unit) => unit.id === document.unitId)?.label ?? 'Unit'
                          : 'Property statement'} • Uploaded {formatShortDate(document.uploadedAt)}
                    </Text>
                  </View>
                  <StatusBadge label="Document" tone="neutral" />
                </View>
              </Pressable>
            ))}
          </View>
        ) : (
          <Text style={commonStyles.helperText}>
            No bill statements have been uploaded for this property yet. Upload one from a posted bill card above.
          </Text>
        )}

        {postedSupplementalCharges.length > 0 ? (
          <>
            <Text style={styles.fieldLabel}>Posted resident charges</Text>
            <View style={styles.chargeList}>
              {postedSupplementalCharges.map((charge) => (
                <View key={charge.chargeId} style={styles.chargeCard}>
                  <View style={commonStyles.rowBetween}>
                    <View style={styles.tenantCopy}>
                      <Text style={styles.tenantName}>{charge.unitLabel} • {charge.description}</Text>
                      <Text style={commonStyles.helperText}>
                        {charge.tenantName} • {charge.monthLabel} • Due {formatShortDate(charge.dueDate)}
                      </Text>
                      <Text style={commonStyles.helperText}>
                        Expected {formatCurrency(charge.expectedAmount)} • Pending {formatCurrency(charge.pendingAmount)}
                      </Text>
                    </View>
                    <StatusBadge label={formatStatusLabel(charge.status)} tone={rentStatusTone(charge.status)} />
                  </View>
                  <View style={styles.chargeActionRow}>
                    <PrimaryButton
                      label="Remove posted charge"
                      onPress={async () => {
                        const result = await deleteSupplementalChargeInBackend(charge.chargeId);

                        if (result.error) {
                          setPropertyChargeMessage(result.error);
                          return;
                        }

                        setPostedSupplementalCharges((current) => current.filter((item) => item.chargeId !== charge.chargeId));
                        setPropertyChargeMessage('Posted charge removed.');
                      }}
                      variant="secondary"
                    />
                  </View>
                </View>
              ))}
            </View>
          </>
        ) : null}

        <Text style={styles.fieldLabel}>Recurring defaults</Text>
        <Text style={commonStyles.helperText}>
          These saved defaults are optional helpers only. Actual tenant billing happens from the posted bill flow above.
        </Text>
        <View style={styles.metricsGrid}>
          <View style={styles.metricTile}>
            <Text style={styles.metricValue}>{propertyChargeConfigs.length}</Text>
            <Text style={styles.metricLabel}>Saved defaults</Text>
          </View>
          <View style={styles.metricTile}>
            <Text style={styles.metricValue}>{formatCurrency(propertyChargeMonthlyTotal)}</Text>
            <Text style={styles.metricLabel}>Monthly reference</Text>
          </View>
        </View>

        {propertyChargeConfigs.length > 0 ? (
          <View style={styles.chargeList}>
            {propertyChargeConfigs.map((config) => (
              <View key={config.id} style={styles.chargeCard}>
                <View style={commonStyles.rowBetween}>
                  <View style={styles.tenantCopy}>
                    <Text style={styles.tenantName}>{config.title}</Text>
                    <Text style={commonStyles.helperText}>
                      {formatStatusLabel(config.category)} • {formatStatusLabel(config.billingFrequency)}
                    </Text>
                    {config.description ? <Text style={commonStyles.helperText}>{config.description}</Text> : null}
                  </View>
                  <StatusBadge label={config.isActive ? 'Active' : 'Inactive'} tone={config.isActive ? 'success' : 'neutral'} />
                </View>
                <Text style={commonStyles.helperText}>Default {formatCurrency(config.defaultAmount)}</Text>
                <View style={styles.chargeActionRow}>
                  <PrimaryButton
                    label="Remove default"
                    onPress={async () => {
                      const result = await deletePropertyChargeConfigInBackend(config.id);

                      if (result.error) {
                        setPropertyChargeMessage(result.error);
                        return;
                      }

                      setPropertyChargeConfigs((current) => current.filter((item) => item.id !== config.id));
                      setPropertyChargeMessage('Charge template removed.');
                    }}
                    variant="secondary"
                  />
                </View>
              </View>
            ))}
          </View>
        ) : null}

        <Text style={styles.fieldLabel}>Save a new recurring default</Text>
        <Text style={styles.fieldLabel}>Default title</Text>
        <TextInput
          onChangeText={setChargeTitle}
          placeholder="Building bill reserve"
          placeholderTextColor={palette.mutedText}
          style={styles.inlineInput}
          value={chargeTitle}
        />

        <Text style={styles.fieldLabel}>Default description</Text>
        <TextInput
          onChangeText={setChargeDescription}
          placeholder="Optional internal note for this default"
          placeholderTextColor={palette.mutedText}
          style={styles.inlineInput}
          value={chargeDescription}
        />

        <Text style={styles.fieldLabel}>Default allocation style</Text>
        <OptionPillGroup
          onChange={(value) => setChargeAllocationMethod(value as PropertyChargeAllocationMethod)}
          options={[
            { label: 'Split bill equally', value: 'property_level' },
            { label: 'Same amount per billed unit', value: 'per_unit_flat' },
            { label: 'Occupied units only', value: 'per_occupied_unit' },
            { label: 'Manual only', value: 'manual' },
          ]}
          selectedValue={chargeAllocationMethod}
        />

        <Text style={styles.fieldLabel}>Default frequency</Text>
        <OptionPillGroup
          onChange={(value) => setChargeFrequency(value as PropertyChargeFrequency)}
          options={[
            { label: 'Monthly', value: 'monthly' },
            { label: 'Quarterly', value: 'quarterly' },
            { label: 'Annual', value: 'annual' },
            { label: 'Ad hoc', value: 'manual' },
          ]}
          selectedValue={chargeFrequency}
        />

        <Text style={styles.fieldLabel}>Default amount</Text>
        <TextInput
          keyboardType="numeric"
          onChangeText={setChargeAmount}
          placeholder="0"
          placeholderTextColor={palette.mutedText}
          style={styles.inlineInput}
          value={chargeAmount}
        />

        <View style={styles.buttonRow}>
          <PrimaryButton
            label="Save recurring default"
            onPress={async () => {
              const parsedAmount = Number(chargeAmount || 0);

              if (!hasText(chargeTitle)) {
                setPropertyChargeMessage('A title is required for the recurring default.');
                return;
              }

              if (!Number.isFinite(parsedAmount) || parsedAmount < 0) {
                setPropertyChargeMessage('Enter a valid default amount.');
                return;
              }

              const result = await createPropertyChargeConfigInBackend({
                propertyId: property.id,
                category: chargeCategory,
                title: chargeTitle.trim(),
                description: chargeDescription.trim(),
                allocationMethod: chargeAllocationMethod,
                billingFrequency: chargeFrequency,
                defaultAmount: parsedAmount,
                isActive: true,
              });

              if (result.error || !result.config) {
                setPropertyChargeMessage(result.error ?? 'Unable to save the recurring default.');
                return;
              }

              setPropertyChargeConfigs((current) => [...current, result.config!]);
              setPropertyChargeMessage('Recurring charge template saved.');
              setChargeTitle('');
              setChargeDescription('');
              setChargeAmount('');
            }}
            variant="secondary"
          />
        </View>
      </SectionCard>
      ) : null}

      <SectionCard title="Units & tenants" subtitle="Occupancy, tenant assignment, rent status, and latest repairs by unit">
        {property.units.map((unit) => (
          <View key={unit.unitId} style={styles.unitCard}>
            {(() => {
              const liveLedger = DEMO_MODE ? null : backendLedgerByUnitId.get(unit.unitId);
              const tenantProfile = unit.tenantId
                ? data.tenantProfiles.find((item) => item.tenantId === unit.tenantId)
                : null;
              const tenantCharges = DEMO_MODE && unit.tenantId
                ? data.rentCharges.filter((item) => item.tenantId === unit.tenantId)
                : [];
              const tenantMaintenance = unit.tenantId
                ? data.maintenanceRequests.filter((item) => item.tenantId === unit.tenantId)
                : [];
              const residentConcerns = unit.tenantId
                ? (backendPropertyInquiries ?? data.contactRequests).filter((item) => item.tenantId === unit.tenantId)
                : [];
              const regularPayer = DEMO_MODE
                ? tenantCharges.every((item) => item.status !== 'overdue')
                : liveLedger
                  ? liveLedger.status !== 'overdue'
                  : false;
              const missedPayments = DEMO_MODE
                ? tenantCharges.filter((item) => item.status === 'overdue').length
                : liveLedger?.status === 'overdue'
                  ? 1
                  : 0;

              return (
                <>
            <View style={commonStyles.rowBetween}>
              <View>
                <Text style={styles.unitTitle}>
                  {unit.label} • {unit.bedrooms} bed / {unit.bathrooms} bath
                </Text>
                <Text style={commonStyles.helperText}>{formatCurrency(unit.monthlyRent)} monthly</Text>
              </View>
              <StatusBadge label={formatStatusLabel(unit.occupancyStatus)} tone={occupancyTone(unit.occupancyStatus)} />
            </View>

            <View style={styles.statusRow}>
              {DEMO_MODE ? (
                <StatusBadge label={formatStatusLabel(unit.rentStatus)} tone={rentStatusTone(unit.rentStatus)} />
              ) : liveLedger ? (
                <StatusBadge label={formatStatusLabel(liveLedger.status)} tone={rentStatusTone(liveLedger.status)} />
              ) : (
                <Text style={commonStyles.helperText}>No current rent charge posted</Text>
              )}
              {unit.lastMaintenanceStatus ? (
                <StatusBadge
                  label={`Repair ${formatRepairStatusLabel(unit.lastMaintenanceStatus)}`}
                  tone={maintenanceStatusTone(unit.lastMaintenanceStatus)}
                />
              ) : null}
            </View>

            {unit.tenantId ? (
              <View style={styles.tenantPanel}>
                <View style={commonStyles.rowBetween}>
                  <View style={styles.tenantCopy}>
                    <Text style={styles.tenantName}>{unit.tenantName}</Text>
                    <Text style={commonStyles.helperText}>
                      {DEMO_MODE
                        ? regularPayer
                          ? 'Regular payer'
                          : 'Needs collections follow-up'
                        : liveLedger
                          ? regularPayer
                            ? 'Regular payer'
                            : 'Needs collections follow-up'
                          : 'No rent charge posted'}{' '}
                      • {missedPayments} missed payment{missedPayments === 1 ? '' : 's'}
                    </Text>
                    <Text style={commonStyles.helperText}>
                      {tenantMaintenance.length} repair item{tenantMaintenance.length === 1 ? '' : 's'} •{' '}
                      {residentConcerns.length} message{residentConcerns.length === 1 ? '' : 's'}
                    </Text>
                    {tenantProfile?.notes ? <Text style={commonStyles.helperText}>{tenantProfile.notes}</Text> : null}
                  </View>
                  <StatusBadge
                    label={
                      !DEMO_MODE && !liveLedger
                        ? 'No Charge'
                        : regularPayer
                          ? 'Regular Payer'
                          : 'Follow Up'
                    }
                    tone={
                      !DEMO_MODE && !liveLedger
                        ? 'neutral'
                        : regularPayer
                          ? rentStatusTone('paid')
                          : rentStatusTone('overdue')
                    }
                  />
                </View>

                <View style={styles.tenantActionRow}>
                  <View style={styles.tenantAction}>
                    <ActionLink
                      href={{ pathname: '/tenants/[tenantId]', params: { tenantId: unit.tenantId } }}
                      label="Open tenant record"
                    />
                  </View>
                  <View style={styles.tenantAction}>
                    <PrimaryButton
                      label="Notify tenant"
                      onPress={async () => {
                        const reminderCopy = liveLedger
                          ? getRentReminderCopy(liveLedger, 'tenant')
                          : {
                              title: `Admin update from ${property.name}`,
                              body: `${unit.label}: please review your current account and latest unit update in the app.`,
                            };
                        if (notificationsBackendEnabled() && unit.tenantId) {
                          const result = await createNotificationInBackend({
                            tenantId: unit.tenantId,
                            roleTarget: 'tenant',
                            type: liveLedger ? 'rent' : 'message',
                            title: reminderCopy.title,
                            body: reminderCopy.body,
                            priority: liveLedger?.status === 'overdue' ? 'high' : 'normal',
                            actionLabel: liveLedger ? 'Open rent' : 'Open contact thread',
                            routeTarget: liveLedger ? '/(tenant)/(tabs)/ledger' : '/(tenant)/contact-admin',
                            entityType: liveLedger ? 'rent_charge' : 'message',
                            entityId: liveLedger?.chargeId ?? unit.tenantId,
                          });

                          if (!result.error) {
                            await refreshNotifications();
                            setNotifyMessage((current) => ({
                              ...current,
                              [unit.unitId]: 'Notification sent to the tenant notification feed.',
                            }));
                            return;
                          }

                          setNotifyMessage((current) => ({
                            ...current,
                            [unit.unitId]: result.error ?? 'Unable to notify the tenant right now.',
                          }));
                        }

                        notifyTenant(
                          unit.tenantId ?? '',
                          reminderCopy.title,
                          reminderCopy.body
                        );
                        setNotifyMessage((current) => ({
                          ...current,
                          [unit.unitId]: 'Notification sent to the tenant notification feed.',
                        }));
                      }}
                      variant="secondary"
                    />
                  </View>
                </View>

                {notifyMessage[unit.unitId] ? (
                  <Text style={styles.successText}>{notifyMessage[unit.unitId]}</Text>
                ) : null}
              </View>
            ) : (
              <View style={styles.tenantPanel}>
                <Text style={styles.tenantName}>No tenant assigned</Text>
                <Text style={commonStyles.helperText}>
                  Add a resident to this vacant unit so rent, documents, messages, and login access can be managed from one record.
                </Text>
                <View style={styles.tenantActionRow}>
                  <View style={styles.tenantAction}>
                    <ActionLink
                      href={{
                        pathname: '/tenants/add',
                        params: { propertyId: property.id, unitId: unit.unitId },
                      } as Href}
                      label="Add tenant to this unit"
                    />
                  </View>
                </View>
              </View>
            )}

            <Text style={styles.fieldLabel}>Occupancy</Text>
            <OptionPillGroup
              onChange={async (value) => {
                const nextOccupancy = value as OccupancyStatus;
                if (nextOccupancy !== 'occupied' && unit.tenantId) {
                  setUnitErrors((current) => ({
                    ...current,
                    [unit.unitId]:
                      'Remove the tenant record first before moving this unit to vacant or turnover.',
                  }));
                  return;
                }

                const result = await saveUnitOccupancy(unit.unitId, value as OccupancyStatus);
                if (result.error) {
                  setUnitErrors((current) => ({
                    ...current,
                    [unit.unitId]: result.error!,
                  }));
                } else {
                  setUnitErrors((current) => ({
                    ...current,
                    [unit.unitId]: '',
                  }));
                }
              }}
              options={[
                { label: 'Occupied', value: 'occupied' },
                { label: 'Vacant', value: 'vacant' },
                { label: 'Turnover', value: 'turnover' },
              ]}
              selectedValue={unit.occupancyStatus}
            />

            <Text style={styles.fieldLabel}>Tenant name</Text>
            <TextInput
              onChangeText={(value) => handleTenantDraftChange(unit.unitId, 'tenantName', value)}
              placeholder="Assign tenant"
              placeholderTextColor={palette.mutedText}
              style={styles.inlineInput}
              value={unitDrafts[unit.unitId]?.tenantName ?? ''}
            />

            <Text style={styles.fieldLabel}>Tenant phone</Text>
            <TextInput
              onChangeText={(value) => handleTenantDraftChange(unit.unitId, 'tenantPhone', value)}
              placeholder="(555) 000-0000"
              placeholderTextColor={palette.mutedText}
              style={styles.inlineInput}
              value={unitDrafts[unit.unitId]?.tenantPhone ?? ''}
            />

            <Text style={commonStyles.helperText}>
              Due {formatShortDate(DEMO_MODE ? unit.dueDate : liveLedger?.dueDate ?? null)} • Collected{' '}
              {formatCurrency(DEMO_MODE ? unit.collectedAmount : liveLedger?.collectedAmount ?? 0)} • Pending{' '}
              {formatCurrency(
                DEMO_MODE
                  ? unit.pendingAmount
                  : liveLedger
                    ? liveLedger.pendingAmount + liveLedger.priorBalanceAmount
                    : 0
              )}
            </Text>
            <Text style={commonStyles.helperText}>
              Last repair: {unit.lastMaintenanceDate ? formatShortDate(unit.lastMaintenanceDate) : 'No recent record'}{' '}
              {unit.lastMaintenanceCost ? `• ${formatCurrency(unit.lastMaintenanceCost)}` : ''}
            </Text>

            <View style={styles.buttonRow}>
              <PrimaryButton
                label="Save unit updates"
                onPress={async () => {
                  const nextName = unitDrafts[unit.unitId]?.tenantName ?? '';
                  const nextPhone = unitDrafts[unit.unitId]?.tenantPhone ?? '';

                  if (!hasText(nextName) || !isValidPhone(nextPhone)) {
                    setUnitErrors((current) => ({
                      ...current,
                      [unit.unitId]: 'Tenant name and a valid phone number are required.',
                    }));
                    return;
                  }

                  setUnitErrors((current) => ({
                    ...current,
                    [unit.unitId]: '',
                  }));
                  const result = await saveTenantAssignment(unit.unitId, nextName.trim(), nextPhone.trim());
                  if (result.error) {
                    setUnitErrors((current) => ({
                      ...current,
                      [unit.unitId]: result.error!,
                    }));
                  }
                }}
                variant="secondary"
              />
            </View>
            {unitErrors[unit.unitId] ? <Text style={styles.errorText}>{unitErrors[unit.unitId]}</Text> : null}
                </>
              );
            })()}
          </View>
        ))}
      </SectionCard>

      {showPropertyControls ? (
      <SectionCard
        collapsible
        defaultCollapsed
        title="Property controls"
        subtitle="Use carefully when retiring an empty building record from the system.">
        <PrimaryButton
          label="Delete empty property"
          onPress={async () => {
            const result = await deletePropertyRecord(property.id);

            if (result.error) {
              setPropertyDeleteMessage(result.error);
              return;
            }

            setPropertyDeleteMessage('Property deleted.');
            router.replace('/properties');
          }}
          variant="secondary"
        />
        <Text style={commonStyles.helperText}>
          Property deletion is only allowed when no units remain under the property, so live tenant and ledger relationships cannot be broken accidentally.
        </Text>
        {propertyDeleteMessage ? <Text style={styles.successText}>{propertyDeleteMessage}</Text> : null}
      </SectionCard>
      ) : null}
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  heroImage: {
    borderRadius: 24,
    height: 220,
    marginBottom: 16,
    width: '100%',
  },
  heroPlaceholder: {
    alignItems: 'flex-start',
    backgroundColor: '#F3EEE5',
    borderColor: palette.border,
    borderRadius: 24,
    borderWidth: 1,
    justifyContent: 'center',
    marginBottom: 16,
    minHeight: 220,
    padding: 22,
    width: '100%',
  },
  heroPlaceholderTitle: {
    color: palette.text,
    fontSize: 18,
    fontWeight: '800',
  },
  heroPlaceholderCopy: {
    color: palette.mutedText,
    fontSize: 14,
    lineHeight: 21,
    marginTop: 8,
    maxWidth: 320,
  },
  imageActionRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 12,
  },
  imageAction: {
    flex: 1,
  },
  inlineRow: {
    flexDirection: 'row',
    gap: 10,
  },
  fieldBlock: {
    flex: 1,
  },
  summaryPanel: {
    backgroundColor: palette.surfaceMuted,
    borderRadius: 16,
    marginTop: 10,
    padding: 14,
  },
  summaryTitle: {
    color: palette.text,
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 4,
  },
  statusRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 14,
  },
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 14,
  },
  shortcutGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  shortcutItem: {
    flexBasis: '47%',
    flexGrow: 1,
    minWidth: 150,
  },
  metricTile: {
    backgroundColor: '#F3EEE5',
    borderRadius: 16,
    minWidth: '47%',
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  chargeList: {
    gap: 10,
    marginBottom: 10,
  },
  chargeCard: {
    backgroundColor: '#F7F2EA',
    borderRadius: 16,
    padding: 12,
  },
  chargeActionRow: {
    marginTop: 6,
  },
  allocationInputWrap: {
    minWidth: 108,
  },
  metricValue: {
    color: '#1F2933',
    fontSize: 17,
    fontWeight: '800',
  },
  metricLabel: {
    color: '#66707A',
    fontSize: 12,
    fontWeight: '600',
    marginTop: 4,
  },
  fieldLabel: {
    color: '#1F2933',
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 8,
    marginTop: 10,
  },
  notesInput: {
    backgroundColor: '#FFFFFF',
    borderColor: '#D9CCB9',
    borderRadius: 16,
    borderWidth: 1,
    color: '#1F2933',
    minHeight: 92,
    padding: 14,
    textAlignVertical: 'top',
  },
  inlineInput: {
    backgroundColor: '#FFFFFF',
    borderColor: '#D9CCB9',
    borderRadius: 14,
    borderWidth: 1,
    color: '#1F2933',
    minHeight: 46,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  buttonRow: {
    marginTop: 14,
  },
  secondaryButtonSpacing: {
    marginTop: 10,
  },
  unitCard: {
    backgroundColor: '#F7F2EA',
    borderRadius: 18,
    marginBottom: 12,
    padding: 14,
  },
  unitTitle: {
    color: '#1F2933',
    fontSize: 15,
    fontWeight: '800',
  },
  tenantPanel: {
    backgroundColor: '#F3EEE5',
    borderRadius: 16,
    marginBottom: 12,
    padding: 12,
  },
  tenantCopy: {
    flex: 1,
    paddingRight: 12,
  },
  tenantName: {
    color: '#1F2933',
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 4,
  },
  tenantActionRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginTop: 12,
  },
  tenantAction: {
    flexBasis: '47%',
    flexGrow: 1,
    minWidth: 150,
  },
  successText: {
    color: '#1D6E5B',
    fontSize: 13,
    fontWeight: '700',
    marginTop: 10,
  },
  errorText: {
    color: '#A3373A',
    fontSize: 12,
    fontWeight: '600',
    marginTop: 8,
  },
});
