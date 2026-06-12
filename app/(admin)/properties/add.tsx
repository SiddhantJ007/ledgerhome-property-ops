import * as ImagePicker from 'expo-image-picker';
import { useState } from 'react';
import { useRouter, type Href } from 'expo-router';
import { StyleSheet, Text, TextInput, View } from 'react-native';

import { ImageLightbox } from '@/components/image-lightbox';
import { OptionPillGroup } from '@/components/option-pill-group';
import { PrimaryButton } from '@/components/primary-button';
import { ScreenContainer } from '@/components/screen-container';
import { SectionCard } from '@/components/section-card';
import { hasText } from '@/lib/form-utils';
import { commonStyles, palette } from '@/lib/theme';
import { useMasterData } from '@/providers/master-data-provider';
import type { PropertyStatus, StateCode } from '@/types/domain';

export default function AddPropertyScreen() {
  const router = useRouter();
  const { createProperty, uploadPropertyCoverImage, masterDataMessage } = useMasterData();
  const [stateCode, setStateCode] = useState<StateCode>('NY');
  const [neighborhoodName, setNeighborhoodName] = useState('');
  const [city, setCity] = useState('');
  const [name, setName] = useState('');
  const [address, setAddress] = useState('');
  const [note, setNote] = useState('');
  const [status, setStatus] = useState<PropertyStatus>('active');
  const [imageUrl, setImageUrl] = useState('');
  const [selectedImage, setSelectedImage] = useState<ImagePicker.ImagePickerAsset | null>(null);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [isCreatingProperty, setIsCreatingProperty] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const pickCoverImage = async () => {
    setErrorMessage(null);
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (!permission.granted) {
      setErrorMessage('Photo access is required to choose a cover image.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.8,
      base64: true,
    });

    if (!result.canceled && result.assets[0]) {
      setSelectedImage(result.assets[0]);
      setImageUrl('');
    }
  };

  return (
    <ScreenContainer
      eyebrow="Admin setup"
      title="Create property"
      subtitle="Add a new building to the live portfolio with the core details needed for operations.">
      <SectionCard title="Location" subtitle="Enter the state code, neighborhood or borough, and city directly">
        <Text style={styles.label}>State code</Text>
        <TextInput
          autoCapitalize="characters"
          maxLength={2}
          onChangeText={(value) => setStateCode(value.replace(/[^a-z]/gi, '').toUpperCase())}
          placeholder="NY"
          placeholderTextColor={palette.mutedText}
          style={styles.input}
          value={stateCode}
        />
        <Text style={commonStyles.helperText}>Use the 2-letter state code, for example NY, NJ, PA, or CA.</Text>

        <Text style={styles.label}>Neighborhood / Borough</Text>
        <TextInput
          onChangeText={setNeighborhoodName}
          placeholder="Downtown, Williamsburg, Journal Square"
          placeholderTextColor={palette.mutedText}
          style={styles.input}
          value={neighborhoodName}
        />

        <Text style={styles.label}>City</Text>
        <TextInput
          onChangeText={setCity}
          placeholder="Austin"
          placeholderTextColor={palette.mutedText}
          style={styles.input}
          value={city}
        />
        <View style={styles.summaryPanel}>
          <Text style={styles.summaryTitle}>Location will be saved with the property</Text>
          <Text style={commonStyles.helperText}>
            If this neighborhood or borough already exists, the app will reuse it. If not, it will be created automatically.
          </Text>
        </View>
      </SectionCard>

      <SectionCard title="Property details" subtitle="Use realistic naming so the new asset feels native to the existing portfolio">

        <Text style={styles.label}>Property name</Text>
        <TextInput onChangeText={setName} placeholder="Cedar House Lofts" placeholderTextColor={palette.mutedText} style={styles.input} value={name} />

        <Text style={styles.label}>Address</Text>
        <TextInput onChangeText={setAddress} placeholder="100 Demo St, Riverton, NY" placeholderTextColor={palette.mutedText} style={styles.input} value={address} />

        <Text style={styles.label}>Cover image</Text>
        <View style={styles.actionRow}>
          <PrimaryButton
            label={selectedImage ? 'Replace selected image' : 'Choose image'}
            onPress={pickCoverImage}
            variant="secondary"
          />
        </View>
        {selectedImage ? (
          <ImageLightbox
            images={[
              {
                id: 'new-property-cover',
                uri: selectedImage.uri,
                label: selectedImage.fileName ?? 'Selected cover image',
              },
            ]}
            thumbnailSize={84}
          />
        ) : null}
        <Text style={commonStyles.helperText}>
          Uploaded images are saved to cloud storage and remain available on the property record.
        </Text>
        <Text style={commonStyles.helperText}>Or paste an external image URL if you do not want to upload a file yet.</Text>
        <TextInput onChangeText={setImageUrl} placeholder="Optional external image URL" placeholderTextColor={palette.mutedText} style={styles.input} value={imageUrl} />

        <Text style={styles.label}>Status</Text>
        <OptionPillGroup
          onChange={(value) => setStatus(value as PropertyStatus)}
          options={[
            { label: 'Active', value: 'active' },
            { label: 'Inactive', value: 'inactive' },
          ]}
          selectedValue={status}
        />

        <Text style={styles.label}>Operator note</Text>
        <TextInput multiline onChangeText={setNote} placeholder="Quick note for leasing, repairs, or collections." placeholderTextColor={palette.mutedText} style={styles.notesInput} value={note} />
        {errorMessage ? <Text style={commonStyles.errorText}>{errorMessage}</Text> : null}
        {masterDataMessage ? <Text style={commonStyles.helperText}>{masterDataMessage}</Text> : null}

        <View style={styles.actionRow}>
          <PrimaryButton
            disabled={isCreatingProperty || isUploadingImage}
          label={isUploadingImage ? 'Uploading image...' : isCreatingProperty ? 'Creating property...' : 'Create property'}
          loading={isCreatingProperty || isUploadingImage}
          onPress={async () => {
              if (!hasText(stateCode) || stateCode.trim().length !== 2) {
                setErrorMessage('Enter a valid 2-letter state code.');
                return;
              }

              if (!hasText(neighborhoodName) || !hasText(city)) {
                setErrorMessage('Neighborhood or borough and city are required.');
                return;
              }

              if (!hasText(name) || !hasText(address)) {
                setErrorMessage('Property name and address are required.');
                return;
              }

              setErrorMessage(null);
              setIsCreatingProperty(true);
              const result = await createProperty(
                '',
                name.trim(),
                address.trim(),
                note.trim(),
                status,
                selectedImage ? undefined : imageUrl.trim(),
                {
                  stateCode: stateCode.trim().toUpperCase(),
                  neighborhoodName: neighborhoodName.trim(),
                  city: city.trim(),
                }
              );
              if (result.error) {
                setErrorMessage(result.error);
                setIsCreatingProperty(false);
                return;
              }
              if (selectedImage && result.propertyId) {
                setIsUploadingImage(true);
                const uploadResult = await uploadPropertyCoverImage(result.propertyId, selectedImage);
                setIsUploadingImage(false);

                if (uploadResult.error) {
                  setErrorMessage(uploadResult.error);
                  setIsCreatingProperty(false);
                  return;
                }
              }
              setIsCreatingProperty(false);
              router.replace('/(admin)/(tabs)/properties' as Href);
            }}
          />
        </View>
      </SectionCard>

      <SectionCard title="Next steps">
        <Text style={commonStyles.helperText}>The property appears immediately in the portfolio list and dashboard totals.</Text>
        <Text style={commonStyles.helperText}>Units, tenants, rent charges, and repairs can be added afterward from the admin flows.</Text>
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
