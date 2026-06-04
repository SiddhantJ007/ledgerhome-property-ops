import type { LedgerRow, MaintenanceRow, PrototypeData } from '@/types/domain';

export const DEMO_TENANT_ID = 'tenant-002';

export function getDemoTenantContext(
  data: PrototypeData,
  ledgerRows: LedgerRow[],
  maintenanceRows: MaintenanceRow[],
  tenantIdOverride?: string | null
) {
  const tenant = tenantIdOverride
    ? data.tenants.find((item) => item.id === tenantIdOverride) ?? null
    : data.tenants.find((item) => item.id === DEMO_TENANT_ID) ?? data.tenants[0] ?? null;
  const unit = data.units.find((item) => item.id === tenant?.unitId);
  const property = data.properties.find((item) => item.id === unit?.propertyId);
  const profile = data.tenantProfiles.find((item) => item.tenantId === tenant?.id) ?? null;
  const lease = data.leases.find((item) => item.tenantId === tenant?.id && item.unitId === unit?.id) ?? null;
  const documents = data.documents.filter((item) => item.tenantId === tenant?.id);
  const rentRow = ledgerRows.find((item) => item.unitId === unit?.id);
  const paymentHistory = data.rentPayments
    .filter((item) => item.tenantId === tenant?.id)
    .sort((a, b) => b.paymentDate.localeCompare(a.paymentDate));
  const maintenance = maintenanceRows.filter(
    (item) => item.unitId === unit?.id || (!item.unitId && item.propertyId === property?.id)
  );
  const maintenanceRequests = data.maintenanceRequests.filter(
    (item) => item.tenantId === tenant?.id || (!item.tenantId && item.propertyId === property?.id)
  );
  const contactRequests = data.contactRequests.filter((item) => item.tenantId === tenant?.id);
  const notifications = data.notifications.filter((item) => item.tenantId === tenant?.id);

  return {
    tenant,
    profile,
    unit,
    property,
    lease,
    documents,
    rentRow,
    paymentHistory,
    maintenance,
    maintenanceRequests,
    contactRequests,
    notifications,
  };
}

export function getLeaseLengthLabel(startDate: string) {
  if (!startDate) {
    return 'N/A';
  }

  const start = new Date(`${startDate}T12:00:00`);
  const now = new Date();
  const monthDiff = (now.getFullYear() - start.getFullYear()) * 12 + (now.getMonth() - start.getMonth());

  if (monthDiff < 0) {
    return '0 months';
  }

  if (monthDiff < 12) {
    return `${monthDiff} months`;
  }

  const years = Math.floor(monthDiff / 12);
  const months = monthDiff % 12;

  return months === 0 ? `${years} years` : `${years}y ${months}m`;
}
