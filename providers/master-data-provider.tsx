import type { PropsWithChildren } from 'react';
import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import type { ImagePickerAsset } from 'expo-image-picker';

import { backendAvailableForSession } from '@/lib/backend-availability';
import { DEMO_MODE } from '@/lib/demo-mode';
import {
  createNeighborhoodInBackend,
  createPropertyInBackend,
  createTenantInBackend,
  createUnitInBackend,
  deactivateTenantInBackend,
  deletePropertyInBackend,
  fetchMasterDataFromBackend,
  removeTenantInBackend,
  updateNeighborhoodInBackend,
  updatePropertyInBackend,
  updateTenantInBackend,
  updateUnitInBackend,
} from '@/lib/master-data-backend';
import { uploadPropertyCoverImageToBackend } from '@/lib/property-images-backend';
import { getPropertyCardSummaries, getPropertyDetail } from '@/lib/prototype-ledger';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/providers/auth-provider';
import { usePrototype } from '@/providers/prototype-provider';
import type {
  OccupancyStatus,
  PropertyStatus,
  PrototypeData,
  StateCode,
  Tenant,
} from '@/types/domain';

type MasterDataContextValue = {
  data: PrototypeData;
  propertyCards: ReturnType<typeof getPropertyCardSummaries>;
  getPropertyDetailById: (propertyId: string) => ReturnType<typeof getPropertyDetail>;
  isMasterDataBackendActive: boolean;
  isMasterDataLoading: boolean;
  masterDataMessage: string | null;
  createNeighborhood: (
    stateCode: StateCode,
    name: string,
    city: string,
    note: string,
    isActive: boolean
  ) => Promise<{ error: string | null }>;
  saveNeighborhood: (
    neighborhoodId: string,
    patch: { stateCode: StateCode; name: string; city: string; note: string; isActive: boolean }
  ) => Promise<{ error: string | null }>;
  createProperty: (
    neighborhoodId: string,
    name: string,
    address: string,
    note: string,
    status: PropertyStatus,
    imageUrl?: string,
    location?: { stateCode: StateCode; neighborhoodName: string; city: string }
  ) => Promise<{ error: string | null; propertyId?: string | null }>;
  savePropertyDetails: (
    propertyId: string,
    patch: {
      name: string;
      address: string;
      note: string;
      status: PropertyStatus;
      neighborhoodId: string;
      coverImageUrl: string;
    }
  ) => Promise<{ error: string | null }>;
  uploadPropertyCoverImage: (
    propertyId: string,
    asset: ImagePickerAsset
  ) => Promise<{ error: string | null; imageUrl?: string | null }>;
  savePropertyNote: (propertyId: string, note: string) => Promise<{ error: string | null }>;
  savePropertyStatus: (propertyId: string, status: PropertyStatus) => Promise<{ error: string | null }>;
  createUnit: (
    propertyId: string,
    label: string,
    bedrooms: number,
    bathrooms: number,
    monthlyRent: number,
    occupancyStatus: OccupancyStatus
  ) => Promise<{ error: string | null }>;
  saveUnitOccupancy: (unitId: string, occupancyStatus: OccupancyStatus) => Promise<{ error: string | null }>;
  createTenant: (
    unitId: string,
    fullName: string,
    phone: string,
    email?: string,
    options?: { moveInDate?: string; leaseEndDate?: string; initialRentAmount?: number | null }
  ) => Promise<{ error: string | null }>;
  saveTenantAssignment: (unitId: string, fullName: string, phone: string) => Promise<{ error: string | null }>;
  deactivateTenant: (tenantId: string, unitId: string) => Promise<{ error: string | null }>;
  removeTenantRecord: (tenantId: string, unitId: string) => Promise<{ error: string | null; action: 'deleted' | 'deactivated' | null }>;
  updateTenant: (
    tenantId: string,
    patch: Partial<Pick<Tenant, 'fullName' | 'phone' | 'email' | 'moveInDate' | 'leaseEndDate' | 'status'>>
  ) => Promise<{ error: string | null }>;
  deletePropertyRecord: (propertyId: string) => Promise<{ error: string | null }>;
};

const MasterDataContext = createContext<MasterDataContextValue | undefined>(undefined);

type BackendMasterData = Pick<PrototypeData, 'neighborhoods' | 'properties' | 'units' | 'tenants'>;

function withMasterData(
  baseData: PrototypeData,
  backendData: BackendMasterData | null,
  useDemoFallback: boolean
): PrototypeData {
  if (!backendData && useDemoFallback) {
    return baseData;
  }

  return {
    ...baseData,
    neighborhoods: backendData?.neighborhoods ?? [],
    properties: backendData?.properties ?? [],
    units: backendData?.units ?? [],
    tenants: backendData?.tenants ?? [],
    propertyImages: (backendData?.properties ?? []).map((property) => ({
      id: `backend-image-${property.id}`,
      propertyId: property.id,
      imageUrl: property.coverImageUrl,
      label: 'Cover',
    })),
  };
}

export function MasterDataProvider({ children }: PropsWithChildren) {
  const { isAuthenticated, isLoading: isAuthLoading } = useAuth();
  const prototype = usePrototype();
  const [backendData, setBackendData] = useState<BackendMasterData | null>(null);
  const [isMasterDataLoading, setIsMasterDataLoading] = useState(true);
  const [masterDataMessage, setMasterDataMessage] = useState<string | null>(null);
  const isMasterDataBackendActive =
    !DEMO_MODE && !isAuthLoading && isAuthenticated && Boolean(supabase) && backendAvailableForSession();

  useEffect(() => {
    let isActive = true;

    async function loadMasterData() {
      if (DEMO_MODE) {
        setBackendData(null);
        setMasterDataMessage(null);
        setIsMasterDataLoading(false);
        return;
      }

      if (isAuthLoading) {
        setIsMasterDataLoading(true);
        return;
      }

      if (!isAuthenticated) {
        setBackendData({
          neighborhoods: [],
          properties: [],
          units: [],
          tenants: [],
        });
        setMasterDataMessage(null);
        setIsMasterDataLoading(false);
        return;
      }

      if (!isMasterDataBackendActive) {
        setBackendData({
          neighborhoods: [],
          properties: [],
          units: [],
          tenants: [],
        });
        setMasterDataMessage('Live data is not available yet.');
        setIsMasterDataLoading(false);
        return;
      }

      setIsMasterDataLoading(true);
      const result = await fetchMasterDataFromBackend();

      if (!isActive) {
        return;
      }

      if (!result.data) {
        setBackendData({
          neighborhoods: [],
          properties: [],
          units: [],
          tenants: [],
        });
        setMasterDataMessage(result.error ?? 'Live property records could not be loaded.');
        setIsMasterDataLoading(false);
        return;
      }

      setBackendData(result.data);
      setMasterDataMessage(result.error ?? null);
      setIsMasterDataLoading(false);
    }

    void loadMasterData();

    return () => {
      isActive = false;
    };
  }, [isAuthenticated, isAuthLoading, isMasterDataBackendActive]);

  const data = useMemo(
    () => withMasterData(prototype.data, backendData, DEMO_MODE),
    [backendData, prototype.data]
  );

  const propertyCards = useMemo(() => getPropertyCardSummaries(data), [data]);

  const value = useMemo<MasterDataContextValue>(
    () => ({
      data,
      propertyCards,
      getPropertyDetailById: (propertyId) => getPropertyDetail(data, propertyId),
      isMasterDataBackendActive,
      isMasterDataLoading,
      masterDataMessage,
      createNeighborhood: async (stateCode, name, city, note, isActive) => {
        if (DEMO_MODE) {
          prototype.createNeighborhood(stateCode, name, city, note, isActive);
          return { error: null };
        }
        if (!isMasterDataBackendActive) {
          return { error: 'Live data is not available yet.' };
        }

        const result = await createNeighborhoodInBackend({ stateCode, name, city, note, isActive });

        if (result.error || !result.neighborhood) {
          setMasterDataMessage(result.error ?? 'Unable to create neighborhood right now.');
          return { error: result.error };
        }

        setBackendData((current) =>
          current
            ? { ...current, neighborhoods: [result.neighborhood!, ...current.neighborhoods] }
            : { neighborhoods: [result.neighborhood!], properties: [], units: [], tenants: [] }
        );
        setMasterDataMessage('Neighborhood saved.');
        return { error: null };
      },
      saveNeighborhood: async (neighborhoodId, patch) => {
        if (DEMO_MODE) {
          prototype.saveNeighborhood(neighborhoodId, patch);
          return { error: null };
        }
        if (!isMasterDataBackendActive) {
          return { error: 'Live data is not available yet.' };
        }

        const result = await updateNeighborhoodInBackend(neighborhoodId, patch);

        if (result.error || !result.neighborhood) {
          setMasterDataMessage(result.error ?? 'Unable to update neighborhood right now.');
          return { error: result.error };
        }

        setBackendData((current) =>
          current
            ? {
                ...current,
                neighborhoods: current.neighborhoods.map((item) =>
                  item.id === neighborhoodId ? result.neighborhood! : item
                ),
              }
            : current
        );
        setMasterDataMessage('Neighborhood updated.');
        return { error: null };
      },
      createProperty: async (neighborhoodId, name, address, note, status, imageUrl, location) => {
        const normalizedNeighborhoodName = location?.neighborhoodName.trim().toLowerCase() ?? '';
        const existingNeighborhood = normalizedNeighborhoodName
          ? data.neighborhoods.find(
              (item) =>
                item.stateCode === location?.stateCode &&
                item.name.trim().toLowerCase() === normalizedNeighborhoodName
            )
          : null;
        const fallbackNeighborhood =
          data.neighborhoods.find((item) => item.stateCode === location?.stateCode && item.isActive) ??
          data.neighborhoods[0] ??
          null;
        let effectiveNeighborhoodId = neighborhoodId || existingNeighborhood?.id || fallbackNeighborhood?.id || '';

        if (DEMO_MODE) {
          prototype.createProperty(effectiveNeighborhoodId, name, address, note, status, imageUrl);
          return { error: null, propertyId: null };
        }
        if (!isMasterDataBackendActive) {
          return { error: 'Live data is not available yet.', propertyId: null };
        }

        let createdNeighborhood: PrototypeData['neighborhoods'][number] | null = null;

        if (!effectiveNeighborhoodId && !location) {
          setMasterDataMessage('Enter a state and neighborhood or borough before creating the property.');
          return { error: 'Enter a state and neighborhood or borough before creating the property.', propertyId: null };
        }

        if (!existingNeighborhood && location) {
          const neighborhoodResult = await createNeighborhoodInBackend({
            stateCode: location.stateCode,
            name: location.neighborhoodName.trim(),
            city: location.city.trim() || location.neighborhoodName.trim(),
            note: 'Created from property setup.',
            isActive: true,
          });

          if (neighborhoodResult.error || !neighborhoodResult.neighborhood) {
            setMasterDataMessage(neighborhoodResult.error ?? 'Unable to save the property location right now.');
            return { error: neighborhoodResult.error, propertyId: null };
          }

          createdNeighborhood = neighborhoodResult.neighborhood;
          effectiveNeighborhoodId = neighborhoodResult.neighborhood.id;
        }

        const result = await createPropertyInBackend({ neighborhoodId: effectiveNeighborhoodId, name, address, note, status, imageUrl });

        if (result.error || !result.property) {
          setMasterDataMessage(result.error ?? 'Unable to create property right now.');
          return { error: result.error, propertyId: null };
        }

        setBackendData((current) =>
          current
            ? {
                ...current,
                neighborhoods: createdNeighborhood ? [createdNeighborhood, ...current.neighborhoods] : current.neighborhoods,
                properties: [result.property!, ...current.properties],
              }
            : {
                neighborhoods: createdNeighborhood ? [createdNeighborhood] : [],
                properties: [result.property!],
                units: [],
                tenants: [],
              }
        );
        setMasterDataMessage('Property saved.');
        return { error: null, propertyId: result.property.id };
      },
      savePropertyDetails: async (propertyId, patch) => {
        if (DEMO_MODE) {
          prototype.savePropertyNote(propertyId, patch.note);
          prototype.savePropertyStatus(propertyId, patch.status);
          return { error: null };
        }
        if (!isMasterDataBackendActive) {
          return { error: 'Live data is not available yet.' };
        }

        const result = await updatePropertyInBackend(propertyId, patch);

        if (result.error || !result.property) {
          setMasterDataMessage(result.error ?? 'Unable to update property right now.');
          return { error: result.error };
        }

        setBackendData((current) =>
          current
            ? {
                ...current,
                properties: current.properties.map((item) =>
                  item.id === propertyId ? result.property! : item
                ),
              }
            : current
        );
        setMasterDataMessage('Property updated.');
        return { error: null };
      },
      savePropertyNote: async (propertyId, note) => {
        if (DEMO_MODE) {
          prototype.savePropertyNote(propertyId, note);
          return { error: null };
        }
        if (!isMasterDataBackendActive) {
          return { error: 'Live data is not available yet.' };
        }

        const result = await updatePropertyInBackend(propertyId, { note });

        if (result.error || !result.property) {
          setMasterDataMessage(result.error ?? 'Unable to update the property note right now.');
          return { error: result.error };
        }

        setBackendData((current) =>
          current
            ? {
                ...current,
                properties: current.properties.map((item) =>
                  item.id === propertyId ? result.property! : item
                ),
              }
            : current
        );
        setMasterDataMessage('Property note saved.');
        return { error: null };
      },
      savePropertyStatus: async (propertyId, status) => {
        if (DEMO_MODE) {
          prototype.savePropertyStatus(propertyId, status);
          return { error: null };
        }
        if (!isMasterDataBackendActive) {
          return { error: 'Live data is not available yet.' };
        }

        const result = await updatePropertyInBackend(propertyId, { status });

        if (result.error || !result.property) {
          setMasterDataMessage(result.error ?? 'Unable to update the property status right now.');
          return { error: result.error };
        }

        setBackendData((current) =>
          current
            ? {
                ...current,
                properties: current.properties.map((item) =>
                  item.id === propertyId ? result.property! : item
                ),
              }
            : current
        );
        setMasterDataMessage('Property status updated.');
        return { error: null };
      },
      uploadPropertyCoverImage: async (propertyId, asset) => {
        if (DEMO_MODE) {
          return { error: 'Property image upload is only available in real mode.', imageUrl: null };
        }
        if (!isMasterDataBackendActive) {
          return { error: 'Live data is not available yet.', imageUrl: null };
        }

        const upload = await uploadPropertyCoverImageToBackend({
          propertyId,
          asset,
        });

        if (upload.error || !upload.imageUrl) {
          setMasterDataMessage(upload.error ?? 'Unable to upload property cover image.');
          return { error: upload.error, imageUrl: null };
        }

        const result = await updatePropertyInBackend(propertyId, { coverImageUrl: upload.imageUrl });

        if (result.error || !result.property) {
          setMasterDataMessage(result.error ?? 'Image uploaded, but property record could not be updated.');
          return { error: result.error, imageUrl: null };
        }

        setBackendData((current) =>
          current
            ? {
                ...current,
                properties: current.properties.map((item) =>
                  item.id === propertyId ? result.property! : item
                ),
              }
            : current
        );
        setMasterDataMessage('Property cover image uploaded and saved in cloud storage.');
        return { error: null, imageUrl: upload.imageUrl };
      },
      createUnit: async (propertyId, label, bedrooms, bathrooms, monthlyRent, occupancyStatus) => {
        if (DEMO_MODE) {
          prototype.createUnit(propertyId, label, bedrooms, bathrooms, monthlyRent, occupancyStatus);
          return { error: null };
        }
        if (!isMasterDataBackendActive) {
          return { error: 'Live data is not available yet.' };
        }

        const result = await createUnitInBackend({
          propertyId,
          label,
          bedrooms,
          bathrooms,
          monthlyRent,
          occupancyStatus,
        });

        if (result.error || !result.unit) {
          setMasterDataMessage(result.error ?? 'Unable to create the unit right now.');
          return { error: result.error };
        }

        setBackendData((current) =>
          current
            ? { ...current, units: [result.unit!, ...current.units] }
            : { neighborhoods: [], properties: [], units: [result.unit!], tenants: [] }
        );
        setMasterDataMessage('Unit saved.');
        return { error: null };
      },
      saveUnitOccupancy: async (unitId, occupancyStatus) => {
        if (DEMO_MODE) {
          prototype.saveUnitOccupancy(unitId, occupancyStatus);
          return { error: null };
        }
        if (!isMasterDataBackendActive) {
          return { error: 'Live data is not available yet.' };
        }

        const result = await updateUnitInBackend(unitId, { occupancyStatus });

        if (result.error || !result.unit) {
          setMasterDataMessage(result.error ?? 'Unable to update unit occupancy right now.');
          return { error: result.error };
        }

        setBackendData((current) =>
          current
            ? {
                ...current,
                units: current.units.map((item) => (item.id === unitId ? result.unit! : item)),
              }
            : current
        );
        setMasterDataMessage('Unit occupancy updated.');
        return { error: null };
      },
      createTenant: async (unitId, fullName, phone, email, options) => {
        if (DEMO_MODE) {
          prototype.createTenant(unitId, fullName, phone, email);
          prototype.saveUnitOccupancy(unitId, 'occupied');
          return { error: null };
        }
        if (!isMasterDataBackendActive) {
          return { error: 'Live data is not available yet.' };
        }

        const result = await createTenantInBackend({
          unitId,
          fullName,
          phone,
          email,
          moveInDate: options?.moveInDate,
          leaseEndDate: options?.leaseEndDate,
          initialRentAmount: options?.initialRentAmount,
        });

        if (result.error || !result.tenant) {
          setMasterDataMessage(result.error ?? 'Unable to create the tenant right now.');
          return { error: result.error };
        }

        setBackendData((current) =>
          current
            ? {
                ...current,
                tenants: [result.tenant!, ...current.tenants],
                units: current.units.map((item) =>
                  item.id === unitId
                    ? { ...item, tenantId: result.tenant!.id, occupancyStatus: 'occupied' }
                    : item
                ),
              }
            : current
        );
        setMasterDataMessage('Tenant saved.');
        return { error: null };
      },
      saveTenantAssignment: async (unitId, fullName, phone) => {
        const existingTenant = data.tenants.find((item) => item.unitId === unitId);

        if (DEMO_MODE) {
          prototype.saveTenantAssignment(unitId, fullName, phone);
          return { error: null };
        }
        if (!isMasterDataBackendActive) {
          return { error: 'Live data is not available yet.' };
        }

        if (existingTenant) {
          const result = await updateTenantInBackend(existingTenant.id, {
            fullName,
            phone,
          });

          if (result.error || !result.tenant) {
            setMasterDataMessage(result.error ?? 'Unable to update the tenant assignment right now.');
            return { error: result.error };
          }

          setBackendData((current) =>
            current
              ? {
                  ...current,
                  tenants: current.tenants.map((item) =>
                    item.id === existingTenant.id ? result.tenant! : item
                  ),
                }
              : current
          );
          setMasterDataMessage('Tenant assignment updated.');
          return { error: null };
        }

        const createResult = await createTenantInBackend({ unitId, fullName, phone });

        if (createResult.error || !createResult.tenant) {
          setMasterDataMessage(createResult.error ?? 'Unable to create the tenant assignment right now.');
          return { error: createResult.error };
        }

        setBackendData((current) =>
          current
            ? {
                ...current,
                tenants: [createResult.tenant!, ...current.tenants],
                units: current.units.map((item) =>
                  item.id === unitId
                    ? { ...item, tenantId: createResult.tenant!.id, occupancyStatus: 'occupied' }
                    : item
                ),
              }
            : current
        );
        setMasterDataMessage('Tenant assignment saved.');
        return { error: null };
      },
      deactivateTenant: async (tenantId, unitId) => {
        if (DEMO_MODE) {
          prototype.saveUnitOccupancy(unitId, 'turnover');
          return { error: null };
        }
        if (!isMasterDataBackendActive) {
          return { error: 'Live data is not available yet.' };
        }

        const result = await deactivateTenantInBackend(tenantId, unitId);

        if (result.error) {
          setMasterDataMessage(result.error);
          return { error: result.error };
        }

        setBackendData((current) =>
          current
            ? {
                ...current,
                tenants: current.tenants.map((item) =>
                  item.id === tenantId ? { ...item, status: 'former' } : item
                ),
                units: current.units.map((item) =>
                  item.id === unitId ? { ...item, tenantId: null, occupancyStatus: 'turnover' } : item
                ),
              }
            : current
        );
        setMasterDataMessage('Tenant marked as former and unit moved to turnover.');
        return { error: null };
      },
      removeTenantRecord: async (tenantId, unitId) => {
        if (DEMO_MODE) {
          prototype.saveUnitOccupancy(unitId, 'turnover');
          return { error: null, action: 'deactivated' as const };
        }
        if (!isMasterDataBackendActive) {
          return {
            error: 'Live data is not available yet.',
            action: null,
          };
        }

        const result = await removeTenantInBackend(tenantId, unitId);

        if (result.error) {
          setMasterDataMessage(result.error);
          return { error: result.error, action: result.action };
        }

        setBackendData((current) =>
          current
            ? {
                ...current,
                tenants:
                  result.action === 'deleted'
                    ? current.tenants.filter((item) => item.id !== tenantId)
                    : current.tenants.map((item) =>
                        item.id === tenantId ? { ...item, status: 'former' } : item
                      ),
                units: current.units.map((item) =>
                  item.id === unitId ? { ...item, tenantId: null, occupancyStatus: 'turnover' } : item
                ),
              }
            : current
        );
        setMasterDataMessage(
          result.action === 'deleted'
            ? 'Tenant record deleted. Related unit moved to turnover.'
            : 'Tenant history exists, so the record was safely moved to former status and the unit moved to turnover.'
        );
        return { error: null, action: result.action };
      },
      updateTenant: async (tenantId, patch) => {
        if (!isMasterDataBackendActive) {
          return { error: 'Tenant updates are not available right now.' };
        }

        const result = await updateTenantInBackend(tenantId, patch);

        if (result.error || !result.tenant) {
          setMasterDataMessage(result.error);
          return { error: result.error };
        }

        setBackendData((current) =>
          current
            ? {
                ...current,
                tenants: current.tenants.map((item) => (item.id === tenantId ? result.tenant! : item)),
              }
            : current
        );
        setMasterDataMessage('Tenant record updated.');
        return { error: null };
      },
      deletePropertyRecord: async (propertyId) => {
        if (DEMO_MODE) {
          return { error: 'Property deletion is not available right now.' };
        }
        if (!isMasterDataBackendActive) {
          return { error: 'Live data is not available yet.' };
        }

        const result = await deletePropertyInBackend(propertyId);

        if (result.error) {
          setMasterDataMessage(result.error);
          return { error: result.error };
        }

        setBackendData((current) =>
          current
            ? {
                ...current,
                properties: current.properties.filter((item) => item.id !== propertyId),
              }
            : current
        );
        setMasterDataMessage('Property deleted.');
        return { error: null };
      },
    }),
    [data, isMasterDataBackendActive, isMasterDataLoading, masterDataMessage, propertyCards, prototype]
  );

  return <MasterDataContext.Provider value={value}>{children}</MasterDataContext.Provider>;
}

export function useMasterData() {
  const context = useContext(MasterDataContext);

  if (!context) {
    throw new Error('useMasterData must be used within a MasterDataProvider.');
  }

  return context;
}
