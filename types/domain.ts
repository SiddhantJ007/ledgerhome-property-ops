export type PropertyStatus = 'active' | 'inactive';
export type OccupancyStatus = 'occupied' | 'vacant' | 'turnover';
export type RentStatus = 'paid' | 'partial' | 'pending' | 'overdue';
export type MaintenanceStatus = 'open' | 'in_progress' | 'completed' | 'deferred';
export type LeaseStatus = 'active' | 'renewal_pending' | 'expired';
export type DocumentCategory = 'lease' | 'move_in' | 'policy' | 'statement' | 'maintenance';
export type DocumentStatus = 'available' | 'pending' | 'placeholder';
export type ContactRequestStatus = 'sent' | 'received' | 'responded';
export type ContactChannel = 'message' | 'call_request';
export type ContactRequestCategory = 'general' | 'billing' | 'maintenance' | 'lease';
export type ContactSenderRole = 'tenant' | 'admin' | 'system';
export type NotificationType = 'rent' | 'maintenance' | 'lease' | 'message' | 'general';
export type NotificationPriority = 'low' | 'normal' | 'high';
export type AppRole = 'admin' | 'tenant';
export type StateCode = string;
export type PaymentMethod =
  | 'ACH transfer'
  | 'Card'
  | 'Bank transfer'
  | 'Manual update'
  | 'Resident portal'
  | 'Check';
export type PaymentRecordStatus = 'posted' | 'processing' | 'failed';
export type PropertyChargeCategory = 'utility' | 'tax';
export type PropertyChargeAllocationMethod = 'property_level' | 'per_unit_flat' | 'per_occupied_unit' | 'manual';
export type PropertyChargeFrequency = 'monthly' | 'quarterly' | 'annual' | 'manual';
export type PropertyChargeBatch = {
  id: string;
  propertyId: string;
  category: PropertyChargeCategory;
  title: string;
  description: string;
  billingPeriodLabel: string;
  dueDate: string;
  totalAmount: number;
  postedUnitCount: number;
  createdAt: string;
};

export type PropertyChargeBatchAllocation = {
  id: string;
  batchId: string;
  unitId: string;
  tenantId: string | null;
  unitLabel: string;
  tenantName: string;
  allocatedAmount: number;
  createdAt: string;
};

export type Neighborhood = {
  id: string;
  stateCode: StateCode;
  name: string;
  city: string;
  note: string;
  isActive: boolean;
};

export type Property = {
  id: string;
  neighborhoodId: string;
  name: string;
  address: string;
  status: PropertyStatus;
  note: string;
  coverImageUrl: string;
};

export type PropertyImage = {
  id: string;
  propertyId: string;
  imageUrl: string;
  label: string;
};

export type PropertyChargeConfig = {
  id: string;
  propertyId: string;
  category: PropertyChargeCategory;
  title: string;
  description: string;
  allocationMethod: PropertyChargeAllocationMethod;
  billingFrequency: PropertyChargeFrequency;
  defaultAmount: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string | null;
};

export type Unit = {
  id: string;
  propertyId: string;
  label: string;
  bedrooms: number;
  bathrooms: number;
  monthlyRent: number;
  occupancyStatus: OccupancyStatus;
  tenantId: string | null;
};

export type Tenant = {
  id: string;
  unitId: string;
  fullName: string;
  email: string;
  phone: string;
  moveInDate: string;
  leaseEndDate: string;
  status: 'active' | 'pending' | 'former';
};

export type TenantProfile = {
  id: string;
  tenantId: string;
  preferredContactMethod: 'email' | 'phone' | 'sms';
  emergencyContactName: string;
  emergencyContactPhone: string;
  avatarUrl: string | null;
  notes: string;
};

export type UserProfile = {
  id: string;
  role: AppRole;
  tenantId: string | null;
  displayName: string;
  email: string | null;
};

export type UserWorkspace = {
  id: string;
  title: string;
  body: string;
  data?: UserWorkspaceBoardData;
  updatedAt: string | null;
};

export type UserWorkspacePlannerStatus = 'open' | 'parked' | 'resolved';

export type UserWorkspaceCollectionItem = {
  id: string;
  title: string;
  amount: number;
  targetType: 'tenant' | 'unit' | 'property' | 'general';
  targetLabel: string;
  status: UserWorkspacePlannerStatus;
};

export type UserWorkspaceFact = {
  id: string;
  label: string;
  value: string;
};

export type UserWorkspaceBoardData = {
  collectionItems: UserWorkspaceCollectionItem[];
  facts: UserWorkspaceFact[];
};

export type Lease = {
  id: string;
  tenantId: string;
  propertyId: string;
  unitId: string;
  startDate: string;
  endDate: string;
  renewalDate: string | null;
  monthlyRent: number;
  securityDeposit: number;
  status: LeaseStatus;
  signedDocumentId: string | null;
};

export type Document = {
  id: string;
  tenantId: string | null;
  propertyId: string;
  unitId: string | null;
  leaseId: string | null;
  category: DocumentCategory;
  title: string;
  fileUrl: string | null;
  storageBucket?: string | null;
  storagePath?: string | null;
  mimeType?: string | null;
  sizeBytes?: number | null;
  uploadedBy?: 'admin' | 'tenant' | 'system' | null;
  signedUrl?: string | null;
  status: DocumentStatus;
  uploadedAt: string;
};

export type RentCharge = {
  id: string;
  tenantId: string | null;
  propertyId: string;
  unitId: string;
  sourceConfigId?: string | null;
  chargeType: 'rent' | 'fee' | 'credit' | 'balance_forward';
  description: string;
  periodStart: string;
  periodEnd: string;
  dueDate: string;
  monthLabel: string;
  expectedAmount: number;
  collectedAmount: number;
  priorBalanceAmount: number;
  status: RentStatus;
  lastPaymentDate: string | null;
};

export type SupplementalChargeRow = {
  chargeId: string;
  propertyId: string;
  propertyName: string;
  unitId: string;
  unitLabel: string;
  tenantId: string | null;
  tenantName: string;
  sourceConfigId: string | null;
  monthLabel: string;
  description: string;
  expectedAmount: number;
  collectedAmount: number;
  pendingAmount: number;
  status: RentStatus;
  dueDate: string;
};

export type RentPayment = {
  id: string;
  chargeId: string;
  tenantId: string | null;
  propertyId: string;
  unitId: string;
  chargeType?: 'rent' | 'fee' | 'credit' | 'balance_forward' | null;
  chargeLabel?: string;
  chargeDescription?: string;
  monthLabel?: string;
  amount: number;
  paymentDate: string;
  method: PaymentMethod;
  status: PaymentRecordStatus;
  externalReference: string | null;
  note: string;
};

export type MaintenanceRecord = {
  id: string;
  propertyId: string;
  unitId: string | null;
  title: string;
  type: string;
  status: MaintenanceStatus;
  serviceDate: string;
  nextActionDate: string | null;
  cost: number;
  note: string;
};

export type MaintenanceRequest = {
  id: string;
  tenantId: string | null;
  propertyId: string;
  unitId: string | null;
  title: string;
  type: string;
  priority: 'low' | 'medium' | 'high';
  status: MaintenanceStatus;
  submittedAt: string;
  latestUpdateAt: string;
  summary: string;
};

export type MaintenanceUpdate = {
  id: string;
  requestId: string;
  status: MaintenanceStatus;
  note: string;
  updatedAt: string;
  updatedBy: 'admin' | 'tenant' | 'vendor';
  cost: number;
};

export type MaintenanceImage = {
  id: string;
  requestId: string;
  bucket: string;
  storagePath: string;
  fileName: string;
  mimeType: string | null;
  sizeBytes: number | null;
  uploadedBy: 'admin' | 'tenant' | 'vendor';
  createdAt: string;
  signedUrl?: string | null;
};

export type ContactRequest = {
  id: string;
  tenantId: string;
  propertyId: string;
  unitId: string;
  subject: string;
  message: string;
  category: ContactRequestCategory;
  channel: ContactChannel;
  senderRole: ContactSenderRole;
  status: ContactRequestStatus;
  sentAt: string;
  adminReply: string | null;
  respondedAt: string | null;
  updatedAt: string | null;
};

export type Notification = {
  id: string;
  tenantId: string | null;
  userProfileId?: string | null;
  roleTarget?: AppRole | null;
  type: NotificationType;
  title: string;
  body: string;
  priority?: NotificationPriority;
  createdAt: string;
  updatedAt?: string | null;
  readAt: string | null;
  dismissedAt?: string | null;
  actionLabel: string | null;
  routeTarget?: string | null;
  entityType?: string | null;
  entityId?: string | null;
};

export type PrototypeData = {
  neighborhoods: Neighborhood[];
  properties: Property[];
  propertyImages: PropertyImage[];
  units: Unit[];
  tenants: Tenant[];
  tenantProfiles: TenantProfile[];
  leases: Lease[];
  documents: Document[];
  rentCharges: RentCharge[];
  rentPayments: RentPayment[];
  maintenanceRequests: MaintenanceRequest[];
  maintenanceUpdates: MaintenanceUpdate[];
  maintenanceImages: MaintenanceImage[];
  maintenanceRecords: MaintenanceRecord[];
  contactRequests: ContactRequest[];
  notifications: Notification[];
};

export type PropertyCardSummary = {
  id: string;
  imageUrl: string;
  name: string;
  neighborhood: string;
  address: string;
  status: PropertyStatus;
  totalUnits: number;
  occupiedUnits: number;
  vacantUnits: number;
  expectedRent: number;
  collectedRent: number;
  pendingRent: number;
  overdueCount: number;
};

export type DashboardSummary = {
  totalProperties: number;
  totalUnits: number;
  occupiedUnits: number;
  vacantUnits: number;
  expectedMonthlyRent: number;
  collectedThisMonth: number;
  pendingAmount: number;
  overdueCount: number;
  openMaintenanceCount: number;
  completedMaintenanceCount: number;
};

export type ActivityItem = {
  id: string;
  kind: 'payment' | 'maintenance';
  title: string;
  detail: string;
  amountLabel?: string;
  date: string;
};

export type ReminderItem = {
  id: string;
  title: string;
  detail: string;
  date: string;
};

export type PropertyDetailUnit = {
  unitId: string;
  label: string;
  bedrooms: number;
  bathrooms: number;
  monthlyRent: number;
  occupancyStatus: OccupancyStatus;
  tenantId: string | null;
  tenantName: string;
  tenantPhone: string;
  rentStatus: RentStatus;
  dueDate: string;
  expectedAmount: number;
  collectedAmount: number;
  pendingAmount: number;
  lastPaymentDate: string | null;
  lastMaintenanceStatus: MaintenanceStatus | null;
  lastMaintenanceDate: string | null;
  lastMaintenanceCost: number | null;
};

export type PropertyDetailSummary = {
  id: string;
  name: string;
  neighborhood: string;
  address: string;
  note: string;
  status: PropertyStatus;
  imageUrl: string;
  totalUnits: number;
  occupiedUnits: number;
  vacantUnits: number;
  expectedRent: number;
  collectedRent: number;
  pendingRent: number;
  overdueCount: number;
  openMaintenanceCount: number;
  units: PropertyDetailUnit[];
};

export type LedgerRow = {
  chargeId: string;
  tenantId: string | null;
  propertyId: string;
  propertyName: string;
  unitId: string;
  unitLabel: string;
  tenantName: string;
  monthLabel: string;
  priorBalanceAmount: number;
  expectedAmount: number;
  collectedAmount: number;
  pendingAmount: number;
  status: RentStatus;
  dueDate: string;
  lastPaymentDate: string | null;
  recentPayments: RentPayment[];
};

export type MaintenanceRow = {
  id: string;
  propertyId: string;
  propertyName: string;
  unitId: string | null;
  unitLabel: string;
  title: string;
  type: string;
  status: MaintenanceStatus;
  serviceDate: string;
  nextActionDate: string | null;
  cost: number;
  note: string;
  tenantId?: string | null;
  tenantName?: string | null;
  images?: MaintenanceImage[];
};
