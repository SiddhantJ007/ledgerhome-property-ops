import * as ImagePicker from 'expo-image-picker';
import { useState } from 'react';
import { useRouter } from 'expo-router';
import { StyleSheet, Text, TextInput, View } from 'react-native';

import { ImageLightbox } from '@/components/image-lightbox';
import { OptionPillGroup } from '@/components/option-pill-group';
import { PrimaryButton } from '@/components/primary-button';
import { ScreenContainer } from '@/components/screen-container';
import { SectionCard } from '@/components/section-card';
import { DEMO_MODE } from '@/lib/demo-mode';
import { backendAvailableForSession } from '@/lib/backend-availability';
import {
  createMaintenanceRequestInBackend,
  maintenanceBackendError,
  maintenanceBackendEnabled,
} from '@/lib/maintenance-backend';
import { getTodayDateString } from '@/lib/prototype-ledger';
import { runtimeAuthSessionAvailable } from '@/lib/runtime-auth-state';
import { getDemoTenantContext } from '@/lib/tenant-demo';
import { commonStyles, palette } from '@/lib/theme';
import { useAuth } from '@/providers/auth-provider';
import { useAccess } from '@/providers/access-provider';
import { useMasterData } from '@/providers/master-data-provider';
import { usePrototype } from '@/providers/prototype-provider';

export default function MaintenanceRequestScreen() {
  const router = useRouter();
  const { configError, isAuthenticated } = useAuth();
  const { currentTenantId, statusMessage: accessStatusMessage } = useAccess();
  const { data, masterDataMessage } = useMasterData();
  const { ledgerRows, maintenanceRows, createMaintenance } = usePrototype();
  const { tenant, unit, property } = getDemoTenantContext(data, ledgerRows, maintenanceRows, currentTenantId);
  const [type, setType] = useState('Plumbing');
  const [title, setTitle] = useState('');
  const [note, setNote] = useState('');
  const [selectedImages, setSelectedImages] = useState<ImagePicker.ImagePickerAsset[]>([]);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [fieldError, setFieldError] = useState<string | null>(null);

  const liveMaintenanceBlockReason = (() => {
    if (DEMO_MODE) {
      return null;
    }

    if (configError) {
      return configError;
    }

    if (!isAuthenticated) {
      return 'You are signed out. Log in again to submit a repair request.';
    }

    if (!runtimeAuthSessionAvailable()) {
      return 'Your live session is still initializing. Reopen this screen and try again.';
    }

    if (!backendAvailableForSession()) {
      return 'Live backend access is temporarily paused after a recent network/storage error. Wait a few seconds and try again.';
    }

    if (accessStatusMessage) {
      return accessStatusMessage;
    }

    return null;
  })();

  const pickImages = async () => {
    setStatusMessage(null);
    setFieldError(null);

    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (!permission.granted) {
      setStatusMessage('Photo access is required to attach repair images.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsMultipleSelection: true,
      quality: 0.7,
      base64: true,
    });

    if (!result.canceled) {
      setSelectedImages(result.assets);
    }
  };

  const handleSubmit = async () => {
    const trimmedTitle = title.trim();
    const trimmedNote = note.trim();

    if (!trimmedTitle || !trimmedNote) {
      setFieldError('Please complete both the issue title and notes before submitting.');
      return;
    }

    setIsSubmitting(true);
    setStatusMessage(null);
    setFieldError(null);

    const requestTitle = trimmedTitle;
    const requestNote = trimmedNote;
    const today = getTodayDateString();

    if (maintenanceBackendEnabled()) {
      const backendResult = await createMaintenanceRequestInBackend({
        tenantId: tenant?.id ?? null,
        propertyId: property?.id ?? 'prop-001',
        unitId: unit?.id ?? null,
        title: requestTitle,
        type,
        note: requestNote,
        images: selectedImages,
      });

      if (backendResult.requestId) {
        setStatusMessage(
          backendResult.error
            ? `Repair request saved, but photo upload could not complete: ${backendResult.error}`
            : 'Repair request saved. Any attached photos are stored with the request.'
        );
        setIsSubmitting(false);
        setTimeout(() => {
          router.replace('/(tenant)/(tabs)/maintenance' as never);
        }, 700);
        return;
      }

      setStatusMessage(backendResult.error ?? 'Unable to submit the repair request right now.');
      setIsSubmitting(false);
      return;
    }

    if (!maintenanceBackendEnabled() && !property) {
      setStatusMessage('Property context is missing for this tenant request.');
      setIsSubmitting(false);
      return;
    }

    if (!maintenanceBackendEnabled() && !tenant && !DEMO_MODE) {
      setStatusMessage('A live tenant record is required before sending repair requests.');
      setIsSubmitting(false);
      return;
    }

    if (!maintenanceBackendEnabled() && !DEMO_MODE) {
      setStatusMessage(liveMaintenanceBlockReason ?? maintenanceBackendError());
      setIsSubmitting(false);
      return;
    }

    createMaintenance(
      property?.id ?? 'prop-001',
      unit?.id ?? null,
      requestTitle,
      type,
      'open',
      today,
      0,
      requestNote
      ,
      {
        tenantId: tenant?.id ?? null,
        images: selectedImages.map((image) => ({
          uri: image.uri,
          fileName: image.fileName ?? null,
          mimeType: image.mimeType ?? null,
          fileSize: image.fileSize ?? null,
        })),
      }
    );
    setStatusMessage('Repair request saved. Any attached photos stay available with the request.');
    setIsSubmitting(false);
    setTimeout(() => {
      router.replace('/(tenant)/(tabs)/maintenance' as never);
    }, 700);
  };

  return (
    <ScreenContainer
      eyebrow="Tenant Portal"
      title="New repair request"
      subtitle="Submit a repair request with optional photos and send it directly to the property team.">
      <SectionCard title="Request details">
        {masterDataMessage ? <Text style={commonStyles.helperText}>{masterDataMessage}</Text> : null}
        {liveMaintenanceBlockReason ? <Text style={styles.fieldError}>{liveMaintenanceBlockReason}</Text> : null}
        <Text style={commonStyles.helperText}>
          {property?.name} • {unit?.label}
        </Text>

        <Text style={styles.label}>Issue type</Text>
        <OptionPillGroup
          onChange={setType}
          options={[
            { label: 'Plumbing', value: 'Plumbing' },
            { label: 'HVAC', value: 'HVAC' },
            { label: 'Electrical', value: 'Electrical' },
            { label: 'General', value: 'General' },
          ]}
          selectedValue={type}
        />

        <Text style={styles.label}>Issue title</Text>
        <TextInput onChangeText={setTitle} placeholder="Bathroom faucet leaking" placeholderTextColor={palette.mutedText} style={styles.input} value={title} />

        <Text style={styles.label}>Notes</Text>
        <TextInput multiline onChangeText={setNote} placeholder="Describe what’s happening and when you first noticed it." placeholderTextColor={palette.mutedText} style={styles.notesInput} value={note} />

        <Text style={styles.label}>Photos</Text>
        <PrimaryButton
          disabled={isSubmitting}
          label={selectedImages.length > 0 ? `Update photos (${selectedImages.length})` : 'Attach photos'}
          onPress={pickImages}
          variant="secondary"
        />
        {selectedImages.length > 0 ? (
          <>
            <Text style={commonStyles.helperText}>
              {selectedImages.length} photo{selectedImages.length === 1 ? '' : 's'} selected. They will be saved with the repair request.
            </Text>
            <ImageLightbox
              images={selectedImages.map((image) => ({
                id: image.assetId ?? image.uri,
                uri: image.uri,
                label: image.fileName ?? 'Repair photo',
              }))}
              thumbnailSize={82}
            />
          </>
        ) : (
          <Text style={commonStyles.helperText}>Optional. Add clear photos so the property team can review the issue faster.</Text>
        )}

        {fieldError ? <Text style={styles.fieldError}>{fieldError}</Text> : null}
        {statusMessage ? <Text style={styles.statusMessage}>{statusMessage}</Text> : null}

        <View style={styles.buttonRow}>
          <PrimaryButton
            disabled={isSubmitting}
            label={isSubmitting ? 'Submitting...' : 'Submit repair request'}
            loading={isSubmitting}
            onPress={() => void handleSubmit()}
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
    minHeight: 96,
    padding: 12,
    textAlignVertical: 'top',
  },
  buttonRow: {
    marginTop: 16,
  },
  statusMessage: {
    color: '#1D6E5B',
    fontSize: 13,
    fontWeight: '700',
    marginTop: 12,
  },
  fieldError: {
    color: '#A3373A',
    fontSize: 13,
    fontWeight: '700',
    marginTop: 12,
  },
});
