import type { ImagePickerAsset } from 'expo-image-picker';

import { markBackendUnavailableForSession, resetBackendAvailabilityForSession } from '@/lib/backend-availability';
import { DEMO_MODE } from '@/lib/demo-mode';
import { runtimeAuthSessionAvailable } from '@/lib/runtime-auth-state';
import { supabase, supabaseConfigError } from '@/lib/supabase';
import type { MaintenanceImage, MaintenanceRow, MaintenanceStatus, MaintenanceUpdate } from '@/types/domain';

const MAINTENANCE_BUCKET = 'maintenance-images';

type MaintenanceRequestRow = {
  id: string;
  tenant_id: string | null;
  property_id: string;
  unit_id: string | null;
  title: string;
  type: string;
  priority: 'low' | 'medium' | 'high';
  status: MaintenanceStatus;
  submitted_at: string;
  latest_update_at: string;
  summary: string;
};

type MaintenanceUpdateRow = {
  id: string;
  request_id: string;
  status: MaintenanceStatus;
  note: string;
  updated_at: string;
  updated_by: 'admin' | 'tenant' | 'vendor';
  cost: number;
};

type MaintenanceImageRow = {
  id: string;
  request_id: string;
  bucket: string;
  storage_path: string;
  file_name: string;
  mime_type: string | null;
  size_bytes: number | null;
  uploaded_by: 'admin' | 'tenant' | 'vendor';
  created_at: string;
};

export function maintenanceBackendEnabled() {
  return !DEMO_MODE && Boolean(supabase) && runtimeAuthSessionAvailable();
}

export function maintenanceBackendError() {
  return supabaseConfigError ?? 'Supabase maintenance backend is unavailable.';
}

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
    throw new Error(maintenanceBackendError());
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

function normalizeMaintenanceTimestampInput(value: string) {
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const now = new Date();
    const target = new Date(`${value}T12:00:00`);
    target.setHours(now.getHours(), now.getMinutes(), now.getSeconds(), now.getMilliseconds());
    return target.toISOString();
  }

  const parsed = new Date(value);

  if (Number.isNaN(parsed.getTime())) {
    return value;
  }

  return parsed.toISOString();
}

function toDateOnly(value: string | null) {
  if (!value) {
    return '';
  }

  const trimmed = value.trim();
  return trimmed.includes('T') ? trimmed.slice(0, 10) : trimmed;
}

async function resolveSignedUrl(bucket: string, storagePath: string) {
  const client = requireSupabase();
  const { data, error } = await client.storage.from(bucket).createSignedUrl(storagePath, 60 * 60);

  if (error) {
    return null;
  }

  return data.signedUrl;
}

function toMaintenanceImage(image: MaintenanceImageRow, signedUrl: string | null): MaintenanceImage {
  return {
    id: image.id,
    requestId: image.request_id,
    bucket: image.bucket,
    storagePath: image.storage_path,
    fileName: image.file_name,
    mimeType: image.mime_type,
    sizeBytes: image.size_bytes,
    uploadedBy: image.uploaded_by,
    createdAt: image.created_at,
    signedUrl,
  };
}

export async function fetchMaintenanceRowsFromBackend() {
  try {
    const client = requireSupabase();
    const { data: requests, error: requestsError } = await client
      .from('maintenance_requests')
      .select('id, tenant_id, property_id, unit_id, title, type, priority, status, submitted_at, latest_update_at, summary')
      .order('latest_update_at', { ascending: false });

    if (requestsError) {
      throw requestsError;
    }

    const requestRows = (requests ?? []) as MaintenanceRequestRow[];

    if (requestRows.length === 0) {
      return { data: [] as MaintenanceRow[], error: null };
    }

    const requestIds = requestRows.map((item) => item.id);
    const propertyIds = [...new Set(requestRows.map((item) => item.property_id))];
    const unitIds = [...new Set(requestRows.map((item) => item.unit_id).filter(Boolean))] as string[];
    const tenantIds = [...new Set(requestRows.map((item) => item.tenant_id).filter(Boolean))] as string[];

    const [{ data: updates, error: updatesError }, { data: images, error: imagesError }, { data: properties }, { data: units }, { data: tenants }] =
      await Promise.all([
        client
          .from('maintenance_updates')
          .select('id, request_id, status, note, updated_at, updated_by, cost')
          .in('request_id', requestIds),
        client
          .from('maintenance_images')
          .select('id, request_id, bucket, storage_path, file_name, mime_type, size_bytes, uploaded_by, created_at')
          .in('request_id', requestIds),
        client.from('properties').select('id, name').in('id', propertyIds),
        unitIds.length > 0 ? client.from('units').select('id, label').in('id', unitIds) : Promise.resolve({ data: [], error: null }),
        tenantIds.length > 0
          ? client.from('tenants').select('id, full_name').in('id', tenantIds)
          : Promise.resolve({ data: [], error: null }),
      ]);

    if (updatesError) {
      throw updatesError;
    }

    if (imagesError) {
      throw imagesError;
    }

    const updatesByRequest = new Map<string, MaintenanceUpdate[]>();
    ((updates ?? []) as MaintenanceUpdateRow[]).forEach((item) => {
      const nextItem: MaintenanceUpdate = {
        id: item.id,
        requestId: item.request_id,
        status: item.status,
        note: item.note,
        updatedAt: item.updated_at,
        updatedBy: item.updated_by,
        cost: item.cost,
      };

      const currentItems = updatesByRequest.get(item.request_id) ?? [];
      updatesByRequest.set(item.request_id, [...currentItems, nextItem]);
    });

    const imageRows = (images ?? []) as MaintenanceImageRow[];
    const signedImageRows = await Promise.all(
      imageRows.map(async (item) =>
        toMaintenanceImage(item, await resolveSignedUrl(item.bucket, item.storage_path))
      )
    );

    const imagesByRequest = new Map<string, MaintenanceImage[]>();
    signedImageRows.forEach((item) => {
      const currentItems = imagesByRequest.get(item.requestId) ?? [];
      imagesByRequest.set(item.requestId, [...currentItems, item]);
    });

    const propertyNames = new Map(((properties ?? []) as { id: string; name: string }[]).map((item) => [item.id, item.name]));
    const unitLabels = new Map(((units ?? []) as { id: string; label: string }[]).map((item) => [item.id, item.label]));
    const tenantNames = new Map(((tenants ?? []) as { id: string; full_name: string }[]).map((item) => [item.id, item.full_name]));

    const rows: MaintenanceRow[] = requestRows.map((request) => {
      const requestUpdates = (updatesByRequest.get(request.id) ?? []).sort(
        (a, b) =>
          new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime() || b.id.localeCompare(a.id)
      );
      const latestUpdate = requestUpdates[0];
      const effectiveStatus = request.status === 'completed' ? 'completed' : latestUpdate?.status ?? request.status;
      const effectiveServiceDate =
        request.status === 'completed' ? request.latest_update_at : latestUpdate?.updatedAt ?? request.latest_update_at;

      return {
        id: request.id,
        propertyId: request.property_id,
        propertyName: propertyNames.get(request.property_id) ?? 'Property',
        unitId: request.unit_id,
        unitLabel: request.unit_id ? unitLabels.get(request.unit_id) ?? 'Unit' : 'Common area',
        title: request.title,
        type: request.type,
        status: effectiveStatus,
        serviceDate: toDateOnly(effectiveServiceDate),
        nextActionDate: effectiveStatus === 'completed' ? null : toDateOnly(effectiveServiceDate),
        cost: latestUpdate?.cost ?? 0,
        note: latestUpdate?.note ?? request.summary,
        tenantId: request.tenant_id,
        tenantName: request.tenant_id ? tenantNames.get(request.tenant_id) ?? null : null,
        images: imagesByRequest.get(request.id) ?? [],
      };
    });

    resetBackendAvailabilityForSession();
    return { data: rows, error: null };
  } catch (error) {
    return {
      data: [] as MaintenanceRow[],
      error: normalizeBackendError(error) || 'Unable to fetch maintenance requests.',
    };
  }
}

export async function createMaintenanceRequestInBackend(input: {
  tenantId: string | null;
  propertyId: string;
  unitId: string | null;
  title: string;
  type: string;
  note: string;
  images?: ImagePickerAsset[];
}) {
  try {
    const client = requireSupabase();
    const timestamp = new Date().toISOString();

    const { data: insertedRequest, error: requestError } = await client
      .from('maintenance_requests')
      .insert({
        tenant_id: input.tenantId,
        property_id: input.propertyId,
        unit_id: input.unitId,
        title: input.title,
        type: input.type,
        priority: 'medium',
        status: 'open',
        submitted_at: timestamp,
        latest_update_at: timestamp,
        summary: input.note,
      })
      .select('id')
      .single();

    if (requestError) {
      throw requestError;
    }

    const requestId = insertedRequest.id as string;

    const { error: updateError } = await client.from('maintenance_updates').insert({
      request_id: requestId,
      status: 'open',
      note: input.note,
      updated_at: timestamp,
      updated_by: 'tenant',
      cost: 0,
    });

    if (updateError) {
      throw updateError;
    }

    let imageUploadError: string | null = null;

    if (input.images?.length) {
      for (const asset of input.images) {
        const result = await uploadMaintenanceImageToBackend({
          requestId,
          asset,
          uploadedBy: 'tenant',
        });

        if (result.error && !imageUploadError) {
          imageUploadError = result.error;
        }
      }
    }

    resetBackendAvailabilityForSession();
    return { requestId, error: imageUploadError };
  } catch (error) {
    return {
      requestId: null,
      error: normalizeBackendError(error) || 'Unable to create maintenance request.',
    };
  }
}

export async function createMaintenanceUpdateInBackend(input: {
  requestId: string;
  status: MaintenanceStatus;
  serviceDate: string;
  cost: number;
  note: string;
  updatedBy?: 'admin' | 'tenant' | 'vendor';
}) {
  try {
    const client = requireSupabase();
    const effectiveTimestamp = normalizeMaintenanceTimestampInput(input.serviceDate);

    const { error: updateInsertError } = await client.from('maintenance_updates').insert({
      request_id: input.requestId,
      status: input.status,
      note: input.note,
      updated_at: effectiveTimestamp,
      updated_by: input.updatedBy ?? 'admin',
      cost: input.cost,
    });

    if (updateInsertError) {
      throw updateInsertError;
    }

    const { error: requestUpdateError } = await client
      .from('maintenance_requests')
      .update({
        status: input.status,
        latest_update_at: effectiveTimestamp,
        summary: input.note,
      })
      .eq('id', input.requestId);

    if (requestUpdateError) {
      throw requestUpdateError;
    }

    resetBackendAvailabilityForSession();
    return { error: null };
  } catch (error) {
    return {
      error: normalizeBackendError(error) || 'Unable to update maintenance request.',
    };
  }
}

export async function uploadMaintenanceImageToBackend(input: {
  requestId: string;
  asset: ImagePickerAsset;
  uploadedBy: 'admin' | 'tenant' | 'vendor';
}) {
  try {
    const client = requireSupabase();

    if (!input.asset.base64) {
      throw new Error('Selected image did not include base64 data.');
    }

    const extension = getFileExtension(input.asset);
    const storagePath = `${input.requestId}/${Date.now()}-${Math.random().toString(36).slice(2)}.${extension}`;
    const fileBytes = base64ToArrayBuffer(input.asset.base64);

    const { error: uploadError } = await client.storage.from(MAINTENANCE_BUCKET).upload(storagePath, fileBytes, {
      contentType: input.asset.mimeType ?? 'image/jpeg',
      upsert: false,
    });

    if (uploadError) {
      throw uploadError;
    }

    const { error: imageError } = await client.from('maintenance_images').insert({
      request_id: input.requestId,
      bucket: MAINTENANCE_BUCKET,
      storage_path: storagePath,
      file_name: input.asset.fileName ?? storagePath.split('/').pop(),
      mime_type: input.asset.mimeType ?? null,
      size_bytes: input.asset.fileSize ?? null,
      uploaded_by: input.uploadedBy,
    });

    if (imageError) {
      throw imageError;
    }

    resetBackendAvailabilityForSession();
    return { error: null };
  } catch (error) {
    return {
      error: normalizeBackendError(error) || 'Unable to upload maintenance image.',
    };
  }
}

export async function deleteMaintenanceRequestInBackend(requestId: string) {
  try {
    const client = requireSupabase();
    const { data: imageRows, error: imageLookupError } = await client
      .from('maintenance_images')
      .select('bucket, storage_path')
      .eq('request_id', requestId);

    if (imageLookupError) {
      throw imageLookupError;
    }

    const images = (imageRows ?? []) as Array<{ bucket: string; storage_path: string }>;

    if (images.length > 0) {
      const storagePathsByBucket = images.reduce<Record<string, string[]>>((acc, item) => {
        acc[item.bucket] = [...(acc[item.bucket] ?? []), item.storage_path];
        return acc;
      }, {});

      await Promise.all(
        Object.entries(storagePathsByBucket).map(async ([bucket, paths]) => {
          const { error } = await client.storage.from(bucket).remove(paths);

          if (error) {
            throw error;
          }
        })
      );

      const { error: imageDeleteError } = await client.from('maintenance_images').delete().eq('request_id', requestId);

      if (imageDeleteError) {
        throw imageDeleteError;
      }
    }

    const { error: updatesDeleteError } = await client.from('maintenance_updates').delete().eq('request_id', requestId);

    if (updatesDeleteError) {
      throw updatesDeleteError;
    }

    const { error } = await client.from('maintenance_requests').delete().eq('id', requestId);

    if (error) {
      throw error;
    }

    resetBackendAvailabilityForSession();
    return { error: null };
  } catch (error) {
    return {
      error: normalizeBackendError(error) || 'Unable to remove maintenance request.',
    };
  }
}
