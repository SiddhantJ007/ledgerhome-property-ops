import type { DocumentPickerAsset } from 'expo-document-picker';

import { backendAvailableForSession } from '@/lib/backend-availability';
import { DEMO_MODE } from '@/lib/demo-mode';
import { runtimeAuthSessionAvailable } from '@/lib/runtime-auth-state';
import { supabase, supabaseConfigError } from '@/lib/supabase';
import type { Document, Lease, LeaseStatus } from '@/types/domain';

const DOCUMENTS_BUCKET = 'lease-documents';

type LeaseRow = {
  id: string;
  tenant_id: string;
  property_id: string;
  unit_id: string;
  start_date: string;
  end_date: string;
  renewal_date: string | null;
  monthly_rent: number | string;
  security_deposit: number | string;
  status: LeaseStatus;
  signed_document_id: string | null;
};

type DocumentRow = {
  id: string;
  tenant_id: string | null;
  property_id: string;
  unit_id: string | null;
  lease_id: string | null;
  category: Document['category'];
  title: string;
  file_url: string | null;
  storage_bucket: string | null;
  storage_path: string | null;
  mime_type: string | null;
  size_bytes: number | null;
  uploaded_by: 'admin' | 'tenant' | 'system' | null;
  status: Document['status'];
  uploaded_at: string;
};

function numberValue(value: number | string | null | undefined) {
  return Number(value ?? 0);
}

function normalizeBackendError(error: unknown) {
  const message =
    error instanceof Error
      ? error.message
      : typeof error === 'object' && error !== null && 'message' in error
        ? String((error as { message?: unknown }).message ?? '')
        : String(error);

  if (
    message.toLowerCase().includes('bucket not found') ||
    message.toLowerCase().includes('bucket does not exist')
  ) {
    return 'Supabase document storage is missing the lease-documents bucket or its policies.';
  }

  if (
    message.includes('ERR_NAME_NOT_RESOLVED') ||
    message.includes('Failed to fetch') ||
    message.includes('Network request failed')
  ) {
    return 'Supabase could not be reached from this device or browser.';
  }

  return message;
}

async function readDocumentAsset(asset: DocumentPickerAsset) {
  const assetWithFile = asset as DocumentPickerAsset & { file?: File };

  if (assetWithFile.file && typeof assetWithFile.file.arrayBuffer === 'function') {
    return assetWithFile.file.arrayBuffer();
  }

  const response = await fetch(asset.uri);

  if (!response.ok) {
    throw new Error(`Unable to read the selected file (${response.status}).`);
  }

  return response.arrayBuffer();
}

function requireSupabase() {
  if (!supabase) {
    throw new Error(leasesDocumentsBackendError());
  }

  return supabase;
}

async function resolveSignedUrl(bucket: string, storagePath: string) {
  const client = requireSupabase();
  const { data, error } = await client.storage.from(bucket).createSignedUrl(storagePath, 60 * 60);

  if (error) {
    return null;
  }

  return data.signedUrl;
}

function toLease(row: LeaseRow): Lease {
  return {
    id: row.id,
    tenantId: row.tenant_id,
    propertyId: row.property_id,
    unitId: row.unit_id,
    startDate: row.start_date,
    endDate: row.end_date,
    renewalDate: row.renewal_date,
    monthlyRent: numberValue(row.monthly_rent),
    securityDeposit: numberValue(row.security_deposit),
    status: row.status,
    signedDocumentId: row.signed_document_id,
  };
}

async function toDocument(row: DocumentRow): Promise<Document> {
  const signedUrl =
    row.storage_bucket && row.storage_path
      ? await resolveSignedUrl(row.storage_bucket, row.storage_path)
      : row.file_url;

  return {
    id: row.id,
    tenantId: row.tenant_id,
    propertyId: row.property_id,
    unitId: row.unit_id,
    leaseId: row.lease_id,
    category: row.category,
    title: row.title,
    fileUrl: signedUrl,
    storageBucket: row.storage_bucket,
    storagePath: row.storage_path,
    mimeType: row.mime_type,
    sizeBytes: row.size_bytes,
    uploadedBy: row.uploaded_by,
    signedUrl,
    status: row.status,
    uploadedAt: row.uploaded_at,
  };
}

export function leasesDocumentsBackendEnabled() {
  return !DEMO_MODE && Boolean(supabase) && backendAvailableForSession() && runtimeAuthSessionAvailable();
}

export function leasesDocumentsBackendError() {
  return supabaseConfigError ?? 'Supabase leases/documents backend is unavailable.';
}

export async function fetchLeaseContextFromBackend(input: { tenantId: string; unitId?: string | null }) {
  try {
    const client = requireSupabase();
    let leaseQuery = client
      .from('leases')
      .select(
        'id, tenant_id, property_id, unit_id, start_date, end_date, renewal_date, monthly_rent, security_deposit, status, signed_document_id'
      )
      .eq('tenant_id', input.tenantId)
      .order('start_date', { ascending: false })
      .limit(1);

    if (input.unitId) {
      leaseQuery = leaseQuery.eq('unit_id', input.unitId);
    }

    const { data: leaseRows, error: leaseError } = await leaseQuery;

    if (leaseError) {
      throw leaseError;
    }

    const lease = (leaseRows?.[0] as LeaseRow | undefined) ?? null;

    const { data: documentRows, error: documentsError } = await client
      .from('documents')
      .select(
        'id, tenant_id, property_id, unit_id, lease_id, category, title, file_url, storage_bucket, storage_path, mime_type, size_bytes, uploaded_by, status, uploaded_at'
      )
      .eq('tenant_id', input.tenantId)
      .order('uploaded_at', { ascending: false });

    if (documentsError) {
      throw documentsError;
    }

    const documents = await Promise.all(((documentRows ?? []) as DocumentRow[]).map(toDocument));

    return {
      lease: lease ? toLease(lease) : null,
      documents,
      error: null,
    };
  } catch (error) {
    return {
      lease: null as Lease | null,
      documents: [] as Document[],
      error: normalizeBackendError(error) || 'Unable to fetch lease documents.',
    };
  }
}

export async function uploadLeaseDocumentToBackend(input: {
  tenantId: string;
  propertyId: string;
  unitId: string | null;
  leaseId: string | null;
  category: Document['category'];
  title: string;
  asset: DocumentPickerAsset;
  uploadedBy?: 'admin' | 'tenant' | 'system';
}) {
  try {
    const client = requireSupabase();
    const arrayBuffer = await readDocumentAsset(input.asset);
    const fileName = input.asset.name || `${Date.now()}.bin`;
    const storagePath = `${input.tenantId}/${Date.now()}-${fileName}`;

    const { error: uploadError } = await client.storage.from(DOCUMENTS_BUCKET).upload(storagePath, arrayBuffer, {
      contentType: input.asset.mimeType ?? 'application/octet-stream',
      upsert: false,
    });

    if (uploadError) {
      throw uploadError;
    }

    const { data: inserted, error: insertError } = await client
      .from('documents')
      .insert({
        tenant_id: input.tenantId,
        property_id: input.propertyId,
        unit_id: input.unitId,
        lease_id: input.leaseId,
        category: input.category,
        title: input.title,
        file_url: null,
        storage_bucket: DOCUMENTS_BUCKET,
        storage_path: storagePath,
        mime_type: input.asset.mimeType ?? null,
        size_bytes: input.asset.size ?? null,
        uploaded_by: input.uploadedBy ?? 'admin',
        status: 'available',
        uploaded_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .select(
        'id, tenant_id, property_id, unit_id, lease_id, category, title, file_url, storage_bucket, storage_path, mime_type, size_bytes, uploaded_by, status, uploaded_at'
      )
      .single();

    if (insertError) {
      throw insertError;
    }

    return {
      document: await toDocument(inserted as DocumentRow),
      error: null,
    };
  } catch (error) {
    return {
      document: null as Document | null,
      error: normalizeBackendError(error) || 'Unable to upload lease document.',
    };
  }
}

export async function fetchPropertyDocumentsFromBackend(input: {
  propertyId: string;
  category?: Document['category'];
}) {
  try {
    const client = requireSupabase();
    let query = client
      .from('documents')
      .select(
        'id, tenant_id, property_id, unit_id, lease_id, category, title, file_url, storage_bucket, storage_path, mime_type, size_bytes, uploaded_by, status, uploaded_at'
      )
      .eq('property_id', input.propertyId)
      .order('uploaded_at', { ascending: false });

    if (input.category) {
      query = query.eq('category', input.category);
    }

    const { data, error } = await query;

    if (error) {
      throw error;
    }

    return {
      documents: await Promise.all(((data ?? []) as DocumentRow[]).map(toDocument)),
      error: null,
    };
  } catch (error) {
    return {
      documents: [] as Document[],
      error: normalizeBackendError(error) || 'Unable to fetch property documents.',
    };
  }
}

export async function uploadPropertyChargeBatchDocumentToBackend(input: {
  batchId: string;
  title?: string;
  asset: DocumentPickerAsset;
  uploadedBy?: 'admin' | 'tenant' | 'system';
}) {
  try {
    const client = requireSupabase();
    const { data: batchRow, error: batchError } = await client
      .from('property_charge_batches')
      .select('id, property_id, title, billing_period_label')
      .eq('id', input.batchId)
      .single();

    if (batchError) {
      throw batchError;
    }

    const { data: allocationRows, error: allocationError } = await client
      .from('property_charge_allocations')
      .select('unit_id, tenant_id')
      .eq('batch_id', input.batchId);

    if (allocationError) {
      throw allocationError;
    }

    const tenantAllocations = ((allocationRows ?? []) as Array<{ unit_id: string; tenant_id: string | null }>).filter(
      (row) => row.tenant_id
    ) as Array<{ unit_id: string; tenant_id: string }>;

    if (tenantAllocations.length === 0) {
      throw new Error('No tenant-linked allocations exist for this bill yet.');
    }

    const arrayBuffer = await readDocumentAsset(input.asset);
    const fileName = input.asset.name || `${Date.now()}.bin`;
    const storagePath = `${batchRow.property_id}/bills/${input.batchId}/${Date.now()}-${fileName}`;

    const { error: uploadError } = await client.storage.from(DOCUMENTS_BUCKET).upload(storagePath, arrayBuffer, {
      contentType: input.asset.mimeType ?? 'application/octet-stream',
      upsert: false,
    });

    if (uploadError) {
      throw uploadError;
    }

    const documentTitle = input.title?.trim() || `${batchRow.title} • ${batchRow.billing_period_label}`;
    const uploadedAt = new Date().toISOString();
    const { data: insertedRows, error: insertError } = await client
      .from('documents')
      .insert(
        tenantAllocations.map((allocation) => ({
          tenant_id: allocation.tenant_id,
          property_id: batchRow.property_id,
          unit_id: allocation.unit_id,
          lease_id: null,
          category: 'statement',
          title: documentTitle,
          file_url: null,
          storage_bucket: DOCUMENTS_BUCKET,
          storage_path: storagePath,
          mime_type: input.asset.mimeType ?? null,
          size_bytes: input.asset.size ?? null,
          uploaded_by: input.uploadedBy ?? 'admin',
          status: 'available',
          uploaded_at: uploadedAt,
          updated_at: uploadedAt,
        }))
      )
      .select(
        'id, tenant_id, property_id, unit_id, lease_id, category, title, file_url, storage_bucket, storage_path, mime_type, size_bytes, uploaded_by, status, uploaded_at'
      );

    if (insertError) {
      throw insertError;
    }

    return {
      documents: await Promise.all(((insertedRows ?? []) as DocumentRow[]).map(toDocument)),
      error: null,
    };
  } catch (error) {
    return {
      documents: [] as Document[],
      error: normalizeBackendError(error) || 'Unable to upload the utility or tax bill.',
    };
  }
}
