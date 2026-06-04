import type { ImagePickerAsset } from 'expo-image-picker';

import { backendAvailableForSession, markBackendUnavailableForSession } from '@/lib/backend-availability';
import { DEMO_MODE } from '@/lib/demo-mode';
import { runtimeAuthSessionAvailable } from '@/lib/runtime-auth-state';
import { supabase, supabaseConfigError } from '@/lib/supabase';

const PROPERTY_IMAGES_BUCKET = 'property-images';

function normalizeBackendError(error: unknown) {
  const message = error instanceof Error ? error.message : String(error);

  if (
    message.includes('ERR_NAME_NOT_RESOLVED') ||
    message.includes('Failed to fetch') ||
    message.includes('Network request failed') ||
    message.includes('fetch')
  ) {
    markBackendUnavailableForSession();
    return 'Supabase could not be reached from this device or browser.';
  }

  return message;
}

function requireSupabase() {
  if (!supabase) {
    throw new Error(propertyImagesBackendError());
  }

  return supabase;
}

function base64ToArrayBuffer(base64: string) {
  const atobFn = globalThis.atob;

  if (!atobFn) {
    throw new Error('Base64 decoder is not available in this runtime.');
  }

  const binary = atobFn(base64);
  const bytes = new Uint8Array(binary.length);

  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }

  return bytes.buffer;
}

function getFileExtension(asset: ImagePickerAsset) {
  const fromName = asset.fileName?.split('.').pop();

  if (fromName) {
    return fromName;
  }

  const fromMime = asset.mimeType?.split('/').pop();
  return fromMime || 'jpg';
}

export function propertyImagesBackendEnabled() {
  return !DEMO_MODE && Boolean(supabase) && backendAvailableForSession() && runtimeAuthSessionAvailable();
}

export function propertyImagesBackendError() {
  return supabaseConfigError ?? 'Supabase property image storage is unavailable.';
}

export async function uploadPropertyCoverImageToBackend(input: {
  propertyId: string;
  asset: ImagePickerAsset;
}) {
  try {
    if (!input.asset.base64) {
      throw new Error('Selected image could not be prepared for upload.');
    }

    const client = requireSupabase();
    const fileExtension = getFileExtension(input.asset);
    const storagePath = `${input.propertyId}/${Date.now()}.${fileExtension}`;
    const fileBytes = base64ToArrayBuffer(input.asset.base64);

    const { error: uploadError } = await client.storage.from(PROPERTY_IMAGES_BUCKET).upload(storagePath, fileBytes, {
      cacheControl: '3600',
      contentType: input.asset.mimeType ?? 'image/jpeg',
      upsert: true,
    });

    if (uploadError) {
      throw uploadError;
    }

    const { data } = client.storage.from(PROPERTY_IMAGES_BUCKET).getPublicUrl(storagePath);

    return {
      imageUrl: data.publicUrl,
      storagePath,
      error: null,
    };
  } catch (error) {
    return {
      imageUrl: null as string | null,
      storagePath: null as string | null,
      error: normalizeBackendError(error) || 'Unable to upload property cover image.',
    };
  }
}
