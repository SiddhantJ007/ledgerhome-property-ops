import type { PropsWithChildren } from 'react';
import { createContext, useContext, useMemo, useState } from 'react';

import {
  clonePrototypeData,
  createContactRequestEntry,
  createDocumentEntry,
  createMaintenanceEntry,
  createNeighborhoodEntry,
  createPropertyEntry,
  createSeedData,
  createUnitEntry,
  getDashboardSummary,
  getLedgerRows,
  getMaintenanceRows,
  getPropertyCardSummaries,
  getPropertyDetail,
  getRecentActivity,
  getTodayDateString,
  getUpcomingReminders,
  replyToContactRequestEntry,
  syncPaymentForCharge,
  updateCharge,
  updateMaintenance,
  updateNeighborhood,
  updateProperty,
  updateUnit,
  upsertTenantForUnit,
} from '@/lib/prototype-ledger';
import type {
  MaintenanceStatus,
  OccupancyStatus,
  PropertyStatus,
  PrototypeData,
  RentStatus,
  StateCode,
} from '@/types/domain';

type PrototypeContextValue = {
  data: PrototypeData;
  tenantInquiries: PrototypeData['contactRequests'];
  contactRequests: PrototypeData['contactRequests'];
  notifications: PrototypeData['notifications'];
  dashboard: ReturnType<typeof getDashboardSummary>;
  recentActivity: ReturnType<typeof getRecentActivity>;
  reminders: ReturnType<typeof getUpcomingReminders>;
  propertyCards: ReturnType<typeof getPropertyCardSummaries>;
  ledgerRows: ReturnType<typeof getLedgerRows>;
  maintenanceRows: ReturnType<typeof getMaintenanceRows>;
  getPropertyDetailById: (propertyId: string) => ReturnType<typeof getPropertyDetail>;
  reseedData: () => void;
  savePropertyNote: (propertyId: string, note: string) => void;
  savePropertyStatus: (propertyId: string, status: PropertyStatus) => void;
  saveNeighborhood: (
    neighborhoodId: string,
    patch: { stateCode: StateCode; name: string; city: string; note: string; isActive: boolean }
  ) => void;
  saveUnitOccupancy: (unitId: string, occupancyStatus: OccupancyStatus) => void;
  saveTenantAssignment: (unitId: string, fullName: string, phone: string) => void;
  saveChargeUpdate: (
    chargeId: string,
    collectedAmount: number,
    status: RentStatus,
    paymentDate: string,
    dueDate: string,
    paymentAmount?: number
  ) => void;
  saveMaintenanceUpdate: (
    recordId: string,
    status: MaintenanceStatus,
    serviceDate: string,
    cost: number,
    note: string
  ) => void;
  createProperty: (
    neighborhoodId: string,
    name: string,
    address: string,
    note: string,
    status: PropertyStatus,
    imageUrl?: string
  ) => void;
  createNeighborhood: (
    stateCode: StateCode,
    name: string,
    city: string,
    note: string,
    isActive: boolean
  ) => void;
  createUnit: (
    propertyId: string,
    label: string,
    bedrooms: number,
    bathrooms: number,
    monthlyRent: number,
    occupancyStatus: OccupancyStatus
  ) => void;
  createTenant: (unitId: string, fullName: string, phone: string, email?: string) => void;
  createDocument: (
    tenantId: string,
    propertyId: string,
    unitId: string | null,
    leaseId: string | null,
    category: PrototypeData['documents'][number]['category'],
    title: string,
    options?: {
      fileUrl?: string | null;
      mimeType?: string | null;
      sizeBytes?: number | null;
      uploadedBy?: 'admin' | 'tenant' | 'system';
    }
  ) => void;
  createMaintenance: (
    propertyId: string,
    unitId: string | null,
    title: string,
    type: string,
    status: MaintenanceStatus,
    serviceDate: string,
    cost: number,
    note: string,
    options?: {
      tenantId?: string | null;
      images?: Array<{
        uri: string;
        fileName?: string | null;
        mimeType?: string | null;
        fileSize?: number | null;
      }>;
    }
  ) => void;
  sendTenantInquiry: (subject: string, message: string, channel: 'message' | 'call_request') => void;
  replyToTenantInquiry: (requestId: string, reply: string) => void;
  notifyTenant: (tenantId: string, title: string, body: string) => void;
};

const PrototypeContext = createContext<PrototypeContextValue | undefined>(undefined);

export function PrototypeProvider({ children }: PropsWithChildren) {
  const [data, setData] = useState<PrototypeData>(() => createSeedData());

  const value = useMemo<PrototypeContextValue>(
    () => ({
      data,
      tenantInquiries: data.contactRequests,
      contactRequests: data.contactRequests,
      notifications: data.notifications,
      dashboard: getDashboardSummary(data),
      recentActivity: getRecentActivity(data),
      reminders: getUpcomingReminders(data),
      propertyCards: getPropertyCardSummaries(data),
      ledgerRows: getLedgerRows(data),
      maintenanceRows: getMaintenanceRows(data),
      getPropertyDetailById: (propertyId) => getPropertyDetail(data, propertyId),
      reseedData: () => {
        setData(clonePrototypeData(createSeedData()));
      },
      savePropertyNote: (propertyId, note) => {
        setData((current) => updateProperty(current, propertyId, { note }));
      },
      savePropertyStatus: (propertyId, status) => {
        setData((current) => updateProperty(current, propertyId, { status }));
      },
      saveNeighborhood: (neighborhoodId, patch) => {
        setData((current) => updateNeighborhood(current, neighborhoodId, patch));
      },
      saveUnitOccupancy: (unitId, occupancyStatus) => {
        setData((current) => updateUnit(current, unitId, { occupancyStatus }));
      },
      saveTenantAssignment: (unitId, fullName, phone) => {
        setData((current) => upsertTenantForUnit(current, unitId, { fullName, phone }));
      },
      saveChargeUpdate: (chargeId, collectedAmount, status, paymentDate, dueDate, paymentAmount) => {
        setData((current) => {
          const updated = updateCharge(current, chargeId, {
            collectedAmount,
            status,
            dueDate,
            lastPaymentDate: paymentDate || null,
          });

          return paymentDate && (paymentAmount ?? collectedAmount) > 0
            ? syncPaymentForCharge(updated, chargeId, {
                amount: paymentAmount ?? collectedAmount,
                paymentDate,
              })
            : updated;
        });
      },
      saveMaintenanceUpdate: (recordId, status, serviceDate, cost, note) => {
        setData((current) =>
          updateMaintenance(current, recordId, {
            status,
            serviceDate,
            cost,
            note,
          })
        );
      },
      createProperty: (neighborhoodId, name, address, note, status, imageUrl) => {
        setData((current) =>
          createPropertyEntry(current, {
            neighborhoodId,
            name,
            address,
            note,
            status,
            imageUrl,
          })
        );
      },
      createNeighborhood: (stateCode, name, city, note, isActive) => {
        setData((current) =>
          createNeighborhoodEntry(current, {
            stateCode,
            name,
            city,
            note,
            isActive,
          })
        );
      },
      createUnit: (propertyId, label, bedrooms, bathrooms, monthlyRent, occupancyStatus) => {
        setData((current) =>
          createUnitEntry(current, {
            propertyId,
            label,
            bedrooms,
            bathrooms,
            monthlyRent,
            occupancyStatus,
          })
        );
      },
      createTenant: (unitId, fullName, phone, email) => {
        setData((current) => upsertTenantForUnit(current, unitId, { fullName, phone, email }));
      },
      createDocument: (tenantId, propertyId, unitId, leaseId, category, title, options) => {
        setData((current) =>
          createDocumentEntry(current, {
            tenantId,
            propertyId,
            unitId,
            leaseId,
            category,
            title,
            fileUrl: options?.fileUrl ?? null,
            mimeType: options?.mimeType ?? null,
            sizeBytes: options?.sizeBytes ?? null,
            uploadedBy: options?.uploadedBy ?? 'admin',
          })
        );
      },
      createMaintenance: (propertyId, unitId, title, type, status, serviceDate, cost, note, options) => {
        setData((current) =>
          createMaintenanceEntry(current, {
            propertyId,
            unitId,
            tenantId: options?.tenantId ?? null,
            title,
            type,
            status,
            serviceDate,
            cost,
            note,
            images: options?.images,
          })
        );
      },
      sendTenantInquiry: (subject, message, channel) => {
        setData((current) =>
          createContactRequestEntry(current, {
            tenantId: 'tenant-002',
            propertyId: 'prop-001',
            unitId: 'unit-102',
            subject,
            message,
            channel,
          })
        );
      },
      replyToTenantInquiry: (requestId, reply) => {
        setData((current) =>
          replyToContactRequestEntry(current, requestId, reply, {
            repliedAt: new Date().toISOString(),
          })
        );
      },
      notifyTenant: (tenantId, title, body) => {
        setData((current) => ({
          ...current,
          notifications: [
            {
              id: `notif-${Date.now()}`,
              tenantId,
              roleTarget: 'tenant' as const,
              type: 'message',
              title,
              body,
              priority: 'normal' as const,
              createdAt: getTodayDateString(),
              updatedAt: getTodayDateString(),
              readAt: null,
              dismissedAt: null,
              actionLabel: 'View update',
              routeTarget: '/(tenant)/contact-admin',
              entityType: 'message',
              entityId: `message-${Date.now()}`,
            },
            ...current.notifications,
          ],
        }));
      },
    }),
    [data]
  );

  return <PrototypeContext.Provider value={value}>{children}</PrototypeContext.Provider>;
}

export function usePrototype() {
  const context = useContext(PrototypeContext);

  if (!context) {
    throw new Error('usePrototype must be used within a PrototypeProvider.');
  }

  return context;
}
