import type {
  ActivityItem,
  ContactRequest,
  DocumentCategory,
  DocumentStatus,
  DashboardSummary,
  Document,
  LedgerRow,
  Lease,
  MaintenanceRecord,
  MaintenanceImage,
  MaintenanceRequest,
  MaintenanceUpdate,
  MaintenanceRow,
  Neighborhood,
  Notification,
  PropertyCardSummary,
  PropertyDetailSummary,
  PropertyImage,
  PrototypeData,
  ReminderItem,
  RentCharge,
  RentPayment,
  Tenant,
  Unit,
} from '@/types/domain';

const currentMonthLabel = 'March 2026';
const defaultPropertyImage =
  'https://placehold.co/1200x800/FBF8EE/010C4A?text=LedgerHome+Demo+Property';

export function formatCurrency(value: number) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(value);
}

export function formatShortDate(value: string | null) {
  if (!value) {
    return 'Not recorded';
  }

  const parsedDate = value.includes('T') ? new Date(value) : new Date(`${value}T12:00:00`);

  if (Number.isNaN(parsedDate.getTime())) {
    return 'Not recorded';
  }

  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
  }).format(parsedDate);
}

export function getTodayDateString() {
  return new Date().toISOString().slice(0, 10);
}

function formatLabel(value: string) {
  return value
    .replace(/_/g, ' ')
    .split(' ')
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

export function clonePrototypeData(data: PrototypeData): PrototypeData {
  return JSON.parse(JSON.stringify(data)) as PrototypeData;
}

export function createSeedData(): PrototypeData {
  return {
    neighborhoods: [
      {
        id: 'neigh-001',
        stateCode: 'NY',
        name: 'Downtown Core',
        city: 'Riverton, NY',
        note: 'Dense multifamily corridor near transit and retail.',
        isActive: true,
      },
      {
        id: 'neigh-002',
        stateCode: 'NJ',
        name: 'River North',
        city: 'Lakeside, NJ',
        note: 'Waterfront area with higher rents and frequent turnover inquiries.',
        isActive: true,
      },
      {
        id: 'neigh-003',
        stateCode: 'NJ',
        name: 'Midtown East',
        city: 'Hillview, NJ',
        note: 'Stable workforce housing with steady collections.',
        isActive: true,
      },
    ],
    properties: [
      {
        id: 'prop-001',
        neighborhoodId: 'neigh-001',
        name: 'Cedar Grove Apartments',
        address: '101 Cedar Ave, Riverton, NY',
        status: 'active',
        note: 'Strong collections overall. Lobby paint refresh scheduled before leasing season.',
        coverImageUrl:
          'https://placehold.co/1200x800/F2E8C9/010C4A?text=Cedar+Grove+Apartments',
      },
      {
        id: 'prop-002',
        neighborhoodId: 'neigh-002',
        name: 'Harbor Point Flats',
        address: '42 Harbor St, Lakeside, NJ',
        status: 'active',
        note: 'Best-performing asset by revenue. Elevator vendor on retainer.',
        coverImageUrl:
          'https://placehold.co/1200x800/E9EEF8/010C4A?text=Harbor+Point+Flats',
      },
      {
        id: 'prop-003',
        neighborhoodId: 'neigh-003',
        name: 'Oak Terrace Homes',
        address: '890 Elm St, Hillview, NJ',
        status: 'inactive',
        note: 'Being repositioned. One wing remains offline during phased improvements.',
        coverImageUrl:
          'https://placehold.co/1200x800/F7F1E2/010C4A?text=Oak+Terrace+Homes',
      },
    ],
    propertyImages: [
      {
        id: 'img-001',
        propertyId: 'prop-001',
        imageUrl:
          'https://placehold.co/1200x800/F2E8C9/010C4A?text=Cedar+Grove+Apartments',
        label: 'Facade',
      },
      {
        id: 'img-002',
        propertyId: 'prop-002',
        imageUrl:
          'https://placehold.co/1200x800/E9EEF8/010C4A?text=Harbor+Point+Flats',
        label: 'Exterior',
      },
      {
        id: 'img-003',
        propertyId: 'prop-003',
        imageUrl:
          'https://placehold.co/1200x800/F7F1E2/010C4A?text=Oak+Terrace+Homes',
        label: 'Building',
      },
    ],
    units: [
      {
        id: 'unit-101',
        propertyId: 'prop-001',
        label: 'Unit 1A',
        bedrooms: 1,
        bathrooms: 1,
        monthlyRent: 1650,
        occupancyStatus: 'occupied',
        tenantId: 'tenant-001',
      },
      {
        id: 'unit-102',
        propertyId: 'prop-001',
        label: 'Unit 2B',
        bedrooms: 2,
        bathrooms: 1,
        monthlyRent: 1950,
        occupancyStatus: 'occupied',
        tenantId: 'tenant-002',
      },
      {
        id: 'unit-103',
        propertyId: 'prop-001',
        label: 'Unit 3A',
        bedrooms: 1,
        bathrooms: 1,
        monthlyRent: 1525,
        occupancyStatus: 'vacant',
        tenantId: null,
      },
      {
        id: 'unit-201',
        propertyId: 'prop-002',
        label: 'Unit 4C',
        bedrooms: 3,
        bathrooms: 2,
        monthlyRent: 2550,
        occupancyStatus: 'occupied',
        tenantId: 'tenant-003',
      },
      {
        id: 'unit-202',
        propertyId: 'prop-002',
        label: 'Unit 5A',
        bedrooms: 2,
        bathrooms: 2,
        monthlyRent: 2325,
        occupancyStatus: 'occupied',
        tenantId: 'tenant-004',
      },
      {
        id: 'unit-203',
        propertyId: 'prop-002',
        label: 'Unit 6B',
        bedrooms: 1,
        bathrooms: 1,
        monthlyRent: 1890,
        occupancyStatus: 'turnover',
        tenantId: null,
      },
      {
        id: 'unit-301',
        propertyId: 'prop-003',
        label: 'Unit 1C',
        bedrooms: 2,
        bathrooms: 1,
        monthlyRent: 1710,
        occupancyStatus: 'occupied',
        tenantId: 'tenant-005',
      },
      {
        id: 'unit-302',
        propertyId: 'prop-003',
        label: 'Unit 2D',
        bedrooms: 2,
        bathrooms: 1,
        monthlyRent: 1680,
        occupancyStatus: 'vacant',
        tenantId: null,
      },
    ],
    tenants: [
      {
        id: 'tenant-001',
        unitId: 'unit-101',
        fullName: 'Casey Harper',
        email: 'casey.harper@example.com',
        phone: '(555) 210-1040',
        moveInDate: '2025-02-01',
        leaseEndDate: '2026-01-31',
        status: 'active',
      },
      {
        id: 'tenant-002',
        unitId: 'unit-102',
        fullName: 'Riley Morgan',
        email: 'riley.morgan@example.com',
        phone: '(555) 220-7780',
        moveInDate: '2024-09-15',
        leaseEndDate: '2025-09-14',
        status: 'active',
      },
      {
        id: 'tenant-003',
        unitId: 'unit-201',
        fullName: 'Taylor Brooks',
        email: 'taylor.brooks@example.com',
        phone: '(555) 301-8844',
        moveInDate: '2025-07-01',
        leaseEndDate: '2026-06-30',
        status: 'active',
      },
      {
        id: 'tenant-004',
        unitId: 'unit-202',
        fullName: 'Alex Parker',
        email: 'alex.parker@example.com',
        phone: '(555) 401-4433',
        moveInDate: '2024-11-15',
        leaseEndDate: '2025-11-14',
        status: 'active',
      },
      {
        id: 'tenant-005',
        unitId: 'unit-301',
        fullName: 'Sam Rivera',
        email: 'sam.rivera@example.com',
        phone: '(555) 501-9981',
        moveInDate: '2023-12-01',
        leaseEndDate: '2025-11-30',
        status: 'active',
      },
    ],
    tenantProfiles: [
      {
        id: 'profile-001',
        tenantId: 'tenant-001',
        preferredContactMethod: 'email',
        emergencyContactName: 'Jamie Harper',
        emergencyContactPhone: '(555) 210-9044',
        avatarUrl: null,
        notes: 'Prefers weekday email updates.',
      },
      {
        id: 'profile-002',
        tenantId: 'tenant-002',
        preferredContactMethod: 'sms',
        emergencyContactName: 'Logan Morgan',
        emergencyContactPhone: '(555) 220-8801',
        avatarUrl: null,
        notes: 'Demo tenant profile used across tenant-side screens.',
      },
      {
        id: 'profile-003',
        tenantId: 'tenant-003',
        preferredContactMethod: 'email',
        emergencyContactName: 'Cameron Brooks',
        emergencyContactPhone: '(555) 301-8801',
        avatarUrl: null,
        notes: '',
      },
      {
        id: 'profile-004',
        tenantId: 'tenant-004',
        preferredContactMethod: 'phone',
        emergencyContactName: 'Mina Lee',
        emergencyContactPhone: '(555) 901-4402',
        avatarUrl: null,
        notes: '',
      },
      {
        id: 'profile-005',
        tenantId: 'tenant-005',
        preferredContactMethod: 'email',
        emergencyContactName: 'Karan Patel',
        emergencyContactPhone: '(555) 713-1140',
        avatarUrl: null,
        notes: '',
      },
    ],
    leases: [
      {
        id: 'lease-001',
        tenantId: 'tenant-001',
        propertyId: 'prop-001',
        unitId: 'unit-101',
        startDate: '2025-02-01',
        endDate: '2026-01-31',
        renewalDate: '2025-12-01',
        monthlyRent: 1650,
        securityDeposit: 1650,
        status: 'active',
        signedDocumentId: 'doc-lease-001',
      },
      {
        id: 'lease-002',
        tenantId: 'tenant-002',
        propertyId: 'prop-001',
        unitId: 'unit-102',
        startDate: '2024-09-15',
        endDate: '2025-09-14',
        renewalDate: '2025-08-01',
        monthlyRent: 1950,
        securityDeposit: 1950,
        status: 'renewal_pending',
        signedDocumentId: 'doc-lease-002',
      },
      {
        id: 'lease-003',
        tenantId: 'tenant-003',
        propertyId: 'prop-002',
        unitId: 'unit-201',
        startDate: '2025-07-01',
        endDate: '2026-06-30',
        renewalDate: '2026-05-15',
        monthlyRent: 2550,
        securityDeposit: 2550,
        status: 'active',
        signedDocumentId: 'doc-lease-003',
      },
      {
        id: 'lease-004',
        tenantId: 'tenant-004',
        propertyId: 'prop-002',
        unitId: 'unit-202',
        startDate: '2024-11-15',
        endDate: '2025-11-14',
        renewalDate: '2025-10-01',
        monthlyRent: 2325,
        securityDeposit: 2325,
        status: 'active',
        signedDocumentId: 'doc-lease-004',
      },
      {
        id: 'lease-005',
        tenantId: 'tenant-005',
        propertyId: 'prop-003',
        unitId: 'unit-301',
        startDate: '2023-12-01',
        endDate: '2025-11-30',
        renewalDate: '2025-10-15',
        monthlyRent: 1710,
        securityDeposit: 1710,
        status: 'active',
        signedDocumentId: 'doc-lease-005',
      },
    ],
    documents: [
      {
        id: 'doc-lease-001',
        tenantId: 'tenant-001',
        propertyId: 'prop-001',
        unitId: 'unit-101',
        leaseId: 'lease-001',
        category: 'lease',
        title: 'Signed Lease PDF',
        fileUrl: null,
        status: 'placeholder',
        uploadedAt: '2025-02-01',
      },
      {
        id: 'doc-lease-002',
        tenantId: 'tenant-002',
        propertyId: 'prop-001',
        unitId: 'unit-102',
        leaseId: 'lease-002',
        category: 'lease',
        title: 'Signed Lease PDF',
        fileUrl: null,
        status: 'placeholder',
        uploadedAt: '2024-09-15',
      },
      {
        id: 'doc-movein-002',
        tenantId: 'tenant-002',
        propertyId: 'prop-001',
        unitId: 'unit-102',
        leaseId: 'lease-002',
        category: 'move_in',
        title: 'Move-In Checklist',
        fileUrl: null,
        status: 'placeholder',
        uploadedAt: '2024-09-15',
      },
      {
        id: 'doc-policy-002',
        tenantId: 'tenant-002',
        propertyId: 'prop-001',
        unitId: 'unit-102',
        leaseId: null,
        category: 'policy',
        title: 'House Rules',
        fileUrl: null,
        status: 'placeholder',
        uploadedAt: '2024-09-10',
      },
    ],
    rentCharges: [
      {
        id: 'charge-001',
        tenantId: 'tenant-001',
        propertyId: 'prop-001',
        unitId: 'unit-101',
        chargeType: 'rent',
        description: 'Monthly base rent',
        periodStart: '2026-03-01',
        periodEnd: '2026-03-31',
        dueDate: '2026-03-05',
        monthLabel: currentMonthLabel,
        expectedAmount: 1650,
        collectedAmount: 1650,
        priorBalanceAmount: 0,
        status: 'paid',
        lastPaymentDate: '2026-03-03',
      },
      {
        id: 'charge-002',
        tenantId: 'tenant-002',
        propertyId: 'prop-001',
        unitId: 'unit-102',
        chargeType: 'rent',
        description: 'Monthly base rent',
        periodStart: '2026-03-01',
        periodEnd: '2026-03-31',
        dueDate: '2026-03-05',
        monthLabel: currentMonthLabel,
        expectedAmount: 1950,
        collectedAmount: 1150,
        priorBalanceAmount: 125,
        status: 'partial',
        lastPaymentDate: '2026-03-06',
      },
      {
        id: 'charge-003',
        tenantId: null,
        propertyId: 'prop-001',
        unitId: 'unit-103',
        chargeType: 'rent',
        description: 'Monthly base rent',
        periodStart: '2026-03-01',
        periodEnd: '2026-03-31',
        dueDate: '2026-03-05',
        monthLabel: currentMonthLabel,
        expectedAmount: 1525,
        collectedAmount: 0,
        priorBalanceAmount: 0,
        status: 'pending',
        lastPaymentDate: null,
      },
      {
        id: 'charge-004',
        tenantId: 'tenant-003',
        propertyId: 'prop-002',
        unitId: 'unit-201',
        chargeType: 'rent',
        description: 'Monthly base rent',
        periodStart: '2026-03-01',
        periodEnd: '2026-03-31',
        dueDate: '2026-03-04',
        monthLabel: currentMonthLabel,
        expectedAmount: 2550,
        collectedAmount: 2550,
        priorBalanceAmount: 0,
        status: 'paid',
        lastPaymentDate: '2026-03-02',
      },
      {
        id: 'charge-005',
        tenantId: 'tenant-004',
        propertyId: 'prop-002',
        unitId: 'unit-202',
        chargeType: 'rent',
        description: 'Monthly base rent',
        periodStart: '2026-03-01',
        periodEnd: '2026-03-31',
        dueDate: '2026-03-04',
        monthLabel: currentMonthLabel,
        expectedAmount: 2325,
        collectedAmount: 900,
        priorBalanceAmount: 0,
        status: 'overdue',
        lastPaymentDate: '2026-03-05',
      },
      {
        id: 'charge-006',
        tenantId: null,
        propertyId: 'prop-002',
        unitId: 'unit-203',
        chargeType: 'rent',
        description: 'Monthly base rent',
        periodStart: '2026-03-01',
        periodEnd: '2026-03-31',
        dueDate: '2026-03-04',
        monthLabel: currentMonthLabel,
        expectedAmount: 1890,
        collectedAmount: 0,
        priorBalanceAmount: 0,
        status: 'pending',
        lastPaymentDate: null,
      },
      {
        id: 'charge-007',
        tenantId: 'tenant-005',
        propertyId: 'prop-003',
        unitId: 'unit-301',
        chargeType: 'rent',
        description: 'Monthly base rent',
        periodStart: '2026-03-01',
        periodEnd: '2026-03-31',
        dueDate: '2026-03-06',
        monthLabel: currentMonthLabel,
        expectedAmount: 1710,
        collectedAmount: 1710,
        priorBalanceAmount: 0,
        status: 'paid',
        lastPaymentDate: '2026-03-06',
      },
      {
        id: 'charge-008',
        tenantId: null,
        propertyId: 'prop-003',
        unitId: 'unit-302',
        chargeType: 'rent',
        description: 'Monthly base rent',
        periodStart: '2026-03-01',
        periodEnd: '2026-03-31',
        dueDate: '2026-03-06',
        monthLabel: currentMonthLabel,
        expectedAmount: 1680,
        collectedAmount: 0,
        priorBalanceAmount: 0,
        status: 'pending',
        lastPaymentDate: null,
      },
    ],
    rentPayments: [
      {
        id: 'pay-001',
        chargeId: 'charge-001',
        tenantId: 'tenant-001',
        propertyId: 'prop-001',
        unitId: 'unit-101',
        amount: 1650,
        paymentDate: '2026-03-03',
        method: 'ACH transfer',
        status: 'posted',
        externalReference: 'ach_001_20260303',
        note: 'On-time full payment',
      },
      {
        id: 'pay-002',
        chargeId: 'charge-002',
        tenantId: 'tenant-002',
        propertyId: 'prop-001',
        unitId: 'unit-102',
        amount: 1150,
        paymentDate: '2026-03-06',
        method: 'Card',
        status: 'posted',
        externalReference: 'card_002_20260306',
        note: 'Partial payment, balance due next week',
      },
      {
        id: 'pay-003',
        chargeId: 'charge-004',
        tenantId: 'tenant-003',
        propertyId: 'prop-002',
        unitId: 'unit-201',
        amount: 2550,
        paymentDate: '2026-03-02',
        method: 'ACH transfer',
        status: 'posted',
        externalReference: 'ach_003_20260302',
        note: 'Early autopay',
      },
      {
        id: 'pay-004',
        chargeId: 'charge-005',
        tenantId: 'tenant-004',
        propertyId: 'prop-002',
        unitId: 'unit-202',
        amount: 900,
        paymentDate: '2026-03-05',
        method: 'Bank transfer',
        status: 'posted',
        externalReference: 'bank_004_20260305',
        note: 'Partial, waiting on remaining balance',
      },
      {
        id: 'pay-005',
        chargeId: 'charge-007',
        tenantId: 'tenant-005',
        propertyId: 'prop-003',
        unitId: 'unit-301',
        amount: 1710,
        paymentDate: '2026-03-06',
        method: 'ACH transfer',
        status: 'posted',
        externalReference: 'ach_005_20260306',
        note: 'Paid in full',
      },
    ],
    maintenanceRequests: [
      {
        id: 'mreq-001',
        tenantId: null,
        propertyId: 'prop-001',
        unitId: null,
        title: 'Lobby paint refresh',
        type: 'Capital upkeep',
        priority: 'medium',
        status: 'in_progress',
        submittedAt: '2026-03-09',
        latestUpdateAt: '2026-03-12',
        summary: 'Vendor started prep work, final coat scheduled next week.',
      },
      {
        id: 'mreq-002',
        tenantId: 'tenant-002',
        propertyId: 'prop-001',
        unitId: 'unit-102',
        title: 'Kitchen sink leak',
        type: 'Plumbing',
        priority: 'high',
        status: 'open',
        submittedAt: '2026-03-11',
        latestUpdateAt: '2026-03-11',
        summary: 'Tenant reported recurring drip under sink trap.',
      },
      {
        id: 'mreq-003',
        tenantId: null,
        propertyId: 'prop-002',
        unitId: null,
        title: 'Elevator inspection',
        type: 'Compliance',
        priority: 'medium',
        status: 'completed',
        submittedAt: '2026-03-07',
        latestUpdateAt: '2026-03-07',
        summary: 'Inspection passed. Certificate renewed.',
      },
      {
        id: 'mreq-004',
        tenantId: 'tenant-004',
        propertyId: 'prop-002',
        unitId: 'unit-202',
        title: 'Bedroom HVAC check',
        type: 'HVAC',
        priority: 'low',
        status: 'deferred',
        submittedAt: '2026-03-10',
        latestUpdateAt: '2026-03-10',
        summary: 'Tenant requested evening access window.',
      },
      {
        id: 'mreq-005',
        tenantId: 'tenant-005',
        propertyId: 'prop-003',
        unitId: 'unit-301',
        title: 'Hallway lighting replacement',
        type: 'Electrical',
        priority: 'medium',
        status: 'completed',
        submittedAt: '2026-03-04',
        latestUpdateAt: '2026-03-04',
        summary: 'Two fixtures replaced and timer reset.',
      },
    ],
    maintenanceUpdates: [
      {
        id: 'mupd-001',
        requestId: 'mreq-001',
        status: 'in_progress',
        note: 'Vendor started prep work, final coat scheduled next week.',
        updatedAt: '2026-03-12',
        updatedBy: 'vendor',
        cost: 680,
      },
      {
        id: 'mupd-002',
        requestId: 'mreq-002',
        status: 'open',
        note: 'Tenant reported recurring drip under sink trap.',
        updatedAt: '2026-03-11',
        updatedBy: 'tenant',
        cost: 220,
      },
      {
        id: 'mupd-003',
        requestId: 'mreq-003',
        status: 'completed',
        note: 'Inspection passed. Certificate renewed.',
        updatedAt: '2026-03-07',
        updatedBy: 'admin',
        cost: 540,
      },
      {
        id: 'mupd-004',
        requestId: 'mreq-004',
        status: 'deferred',
        note: 'Tenant requested evening access window.',
        updatedAt: '2026-03-10',
        updatedBy: 'admin',
        cost: 160,
      },
      {
        id: 'mupd-005',
        requestId: 'mreq-005',
        status: 'completed',
        note: 'Two fixtures replaced and timer reset.',
        updatedAt: '2026-03-04',
        updatedBy: 'vendor',
        cost: 140,
      },
    ],
    maintenanceImages: [],
    maintenanceRecords: [
      {
        id: 'maint-001',
        propertyId: 'prop-001',
        unitId: null,
        title: 'Lobby paint refresh',
        type: 'Capital upkeep',
        status: 'in_progress',
        serviceDate: '2026-03-09',
        nextActionDate: '2026-03-18',
        cost: 680,
        note: 'Vendor started prep work, final coat scheduled next week.',
      },
      {
        id: 'maint-002',
        propertyId: 'prop-001',
        unitId: 'unit-102',
        title: 'Kitchen sink leak',
        type: 'Plumbing',
        status: 'open',
        serviceDate: '2026-03-11',
        nextActionDate: '2026-03-14',
        cost: 220,
        note: 'Tenant reported recurring drip under sink trap.',
      },
      {
        id: 'maint-003',
        propertyId: 'prop-002',
        unitId: null,
        title: 'Elevator inspection',
        type: 'Compliance',
        status: 'completed',
        serviceDate: '2026-03-07',
        nextActionDate: null,
        cost: 540,
        note: 'Inspection passed. Certificate renewed.',
      },
      {
        id: 'maint-004',
        propertyId: 'prop-002',
        unitId: 'unit-202',
        title: 'Bedroom HVAC check',
        type: 'HVAC',
        status: 'deferred',
        serviceDate: '2026-03-10',
        nextActionDate: '2026-03-20',
        cost: 160,
        note: 'Tenant requested evening access window.',
      },
      {
        id: 'maint-005',
        propertyId: 'prop-003',
        unitId: 'unit-301',
        title: 'Hallway lighting replacement',
        type: 'Electrical',
        status: 'completed',
        serviceDate: '2026-03-04',
        nextActionDate: null,
        cost: 140,
        note: 'Two fixtures replaced and timer reset.',
      },
    ],
    contactRequests: [
      {
        id: 'creq-001',
        tenantId: 'tenant-002',
        propertyId: 'prop-001',
        unitId: 'unit-102',
        subject: 'Parking pass renewal',
        message: 'Checking when the updated parking pass will be available for pickup.',
        category: 'general',
        channel: 'message',
        senderRole: 'tenant',
        status: 'sent',
        sentAt: '2026-03-09',
        adminReply: null,
        respondedAt: null,
        updatedAt: '2026-03-09',
      },
    ],
    notifications: [
      {
        id: 'notif-001',
        tenantId: 'tenant-002',
        roleTarget: 'tenant' as const,
        type: 'rent',
        title: 'Monthly rent payment pending',
        body: 'Your March balance still shows an outstanding amount after the recent card payment.',
        priority: 'normal',
        createdAt: '2026-03-06',
        updatedAt: '2026-03-06',
        readAt: null,
        dismissedAt: null,
        actionLabel: 'View dues',
        routeTarget: '/(tenant)/(tabs)/ledger',
        entityType: 'rent_charge',
        entityId: 'charge-002',
      },
      {
        id: 'notif-002',
        tenantId: 'tenant-002',
        roleTarget: 'tenant' as const,
        type: 'maintenance',
        title: 'Kitchen sink request received',
        body: 'Your maintenance request has been logged and is awaiting scheduling.',
        priority: 'normal',
        createdAt: '2026-03-11',
        updatedAt: '2026-03-11',
        readAt: '2026-03-11',
        dismissedAt: null,
        actionLabel: 'View maintenance',
        routeTarget: '/(tenant)/(tabs)/maintenance',
        entityType: 'maintenance_request',
        entityId: 'mreq-002',
      },
      {
        id: 'notif-003',
        tenantId: 'tenant-002',
        roleTarget: 'tenant' as const,
        type: 'maintenance',
        title: 'Repair in process: Kitchen sink leak',
        body: 'The plumbing request is active and the next update is scheduled after the service visit.',
        priority: 'normal',
        createdAt: '2026-03-12',
        updatedAt: '2026-03-12',
        readAt: null,
        dismissedAt: null,
        actionLabel: 'Open repairs',
        routeTarget: '/(tenant)/(tabs)/maintenance',
        entityType: 'maintenance_request',
        entityId: 'mreq-002',
      },
      {
        id: 'notif-004',
        tenantId: 'tenant-002',
        roleTarget: 'tenant' as const,
        type: 'maintenance',
        title: 'Repair complete: Hallway lighting',
        body: 'The lighting repair has been marked complete. Review the repair history if anything still needs attention.',
        priority: 'low',
        createdAt: '2026-03-14',
        updatedAt: '2026-03-14',
        readAt: null,
        dismissedAt: null,
        actionLabel: 'Open repairs',
        routeTarget: '/(tenant)/(tabs)/maintenance',
        entityType: 'maintenance_request',
        entityId: 'mreq-005',
      },
    ],
  };
}

function getNeighborhoodName(data: PrototypeData, neighborhoodId: string) {
  return data.neighborhoods.find((item) => item.id === neighborhoodId)?.name ?? 'Unknown';
}

function getPropertyImage(data: PrototypeData, propertyId: string) {
  return (
    data.propertyImages.find((item) => item.propertyId === propertyId)?.imageUrl ??
    data.properties.find((item) => item.id === propertyId)?.coverImageUrl ??
    ''
  );
}

function getCurrentChargesForProperty(data: PrototypeData, propertyId: string) {
  const unitIds = data.units.filter((unit) => unit.propertyId === propertyId).map((unit) => unit.id);
  return data.rentCharges.filter(
    (charge) => unitIds.includes(charge.unitId) && charge.monthLabel === currentMonthLabel
  );
}

function getLatestMaintenanceForUnit(data: PrototypeData, unitId: string) {
  const request = data.maintenanceRequests
    .filter((record) => record.unitId === unitId)
    .sort((a, b) => b.latestUpdateAt.localeCompare(a.latestUpdateAt))[0];

  if (!request) {
    return undefined;
  }

  const latestUpdate = data.maintenanceUpdates
    .filter((item) => item.requestId === request.id)
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))[0];

  return {
    status: latestUpdate?.status ?? request.status,
    serviceDate: latestUpdate?.updatedAt ?? request.latestUpdateAt,
    cost: latestUpdate?.cost ?? 0,
  };
}

function propertyUnitMetrics(data: PrototypeData, propertyId: string) {
  const units = data.units.filter((unit) => unit.propertyId === propertyId);
  const charges = getCurrentChargesForProperty(data, propertyId);
  const chargedUnitIds = new Set(charges.map((charge) => charge.unitId));
  const fallbackExpectedRent = units
    .filter((unit) => unit.occupancyStatus === 'occupied' && !chargedUnitIds.has(unit.id))
    .reduce((sum, unit) => sum + unit.monthlyRent, 0);

  const occupiedUnits = units.filter((unit) => unit.occupancyStatus === 'occupied').length;
  const vacantUnits = units.length - occupiedUnits;
  const expectedRent = charges.reduce((sum, charge) => sum + charge.expectedAmount, 0) + fallbackExpectedRent;
  const collectedRent = charges.reduce((sum, charge) => sum + charge.collectedAmount, 0);
  const pendingRent = Math.max(expectedRent - collectedRent, 0);
  const overdueCount = charges.filter((charge) => charge.status === 'overdue').length;

  return {
    occupiedUnits,
    vacantUnits,
    expectedRent,
    collectedRent,
    pendingRent,
    overdueCount,
  };
}

export function getDashboardSummary(data: PrototypeData): DashboardSummary {
  const totalProperties = data.properties.length;
  const totalUnits = data.units.length;
  const occupiedUnits = data.units.filter((unit) => unit.occupancyStatus === 'occupied').length;
  const vacantUnits = data.units.filter((unit) => unit.occupancyStatus !== 'occupied').length;
  const expectedMonthlyRent = data.rentCharges.reduce((sum, charge) => sum + charge.expectedAmount, 0);
  const collectedThisMonth = data.rentCharges.reduce((sum, charge) => sum + charge.collectedAmount, 0);
  const pendingAmount = Math.max(expectedMonthlyRent - collectedThisMonth, 0);
  const overdueCount = data.rentCharges.filter((charge) => charge.status === 'overdue').length;
  const openMaintenanceCount = data.maintenanceRequests.filter(
    (record) => record.status === 'open' || record.status === 'in_progress' || record.status === 'deferred'
  ).length;
  const completedMaintenanceCount = data.maintenanceRequests.filter(
    (record) => record.status === 'completed'
  ).length;

  return {
    totalProperties,
    totalUnits,
    occupiedUnits,
    vacantUnits,
    expectedMonthlyRent,
    collectedThisMonth,
    pendingAmount,
    overdueCount,
    openMaintenanceCount,
    completedMaintenanceCount,
  };
}

export function getPropertyCardSummaries(data: PrototypeData): PropertyCardSummary[] {
  return data.properties.map((property) => {
    const units = data.units.filter((unit) => unit.propertyId === property.id);
    const metrics = propertyUnitMetrics(data, property.id);

    return {
      id: property.id,
      imageUrl: getPropertyImage(data, property.id),
      name: property.name,
      neighborhood: getNeighborhoodName(data, property.neighborhoodId),
      address: property.address,
      status: property.status,
      totalUnits: units.length,
      occupiedUnits: metrics.occupiedUnits,
      vacantUnits: metrics.vacantUnits,
      expectedRent: metrics.expectedRent,
      collectedRent: metrics.collectedRent,
      pendingRent: metrics.pendingRent,
      overdueCount: metrics.overdueCount,
    };
  });
}

export function getRecentActivity(data: PrototypeData): ActivityItem[] {
  const paymentItems: ActivityItem[] = data.rentPayments.map((payment) => {
    const unit = data.units.find((item) => item.id === payment.unitId);
    const property = data.properties.find((item) => item.id === payment.propertyId);

    return {
      id: payment.id,
      kind: 'payment',
      title: `${property?.name ?? 'Property'} • ${unit?.label ?? 'Unit'}`,
      detail: payment.note,
      amountLabel: formatCurrency(payment.amount),
      date: payment.paymentDate,
    };
  });

  const maintenanceItems: ActivityItem[] = data.maintenanceRequests.map((record) => {
    const property = data.properties.find((item) => item.id === record.propertyId);
    const latestUpdate = data.maintenanceUpdates
      .filter((item) => item.requestId === record.id)
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))[0];

    return {
      id: record.id,
      kind: 'maintenance',
      title: `${property?.name ?? 'Property'} • ${record.title}`,
      detail: latestUpdate?.note ?? record.summary,
      amountLabel: latestUpdate ? formatCurrency(latestUpdate.cost) : undefined,
      date: latestUpdate?.updatedAt ?? record.latestUpdateAt,
    };
  });

  return [...paymentItems, ...maintenanceItems]
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, 6);
}

export function getUpcomingReminders(data: PrototypeData): ReminderItem[] {
  const chargeReminders: ReminderItem[] = data.rentCharges
    .filter((charge) => charge.status === 'overdue' || charge.status === 'partial')
    .map((charge) => {
      const unit = data.units.find((item) => item.id === charge.unitId);
      const property = data.properties.find((item) => item.id === unit?.propertyId);

      return {
        id: charge.id,
        title: `${property?.name ?? 'Property'} • ${unit?.label ?? 'Unit'}`,
        detail: `${charge.status} rent balance of ${formatCurrency(
          Math.max(charge.expectedAmount - charge.collectedAmount, 0)
        )}`,
        date: charge.dueDate,
      };
    });

  const maintenanceReminders: ReminderItem[] = data.maintenanceRequests
    .filter((record) => record.status === 'open' || record.status === 'in_progress' || record.status === 'deferred')
    .map((record) => {
      const property = data.properties.find((item) => item.id === record.propertyId);
      const latestUpdate = data.maintenanceUpdates
        .filter((item) => item.requestId === record.id)
        .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))[0];

      return {
        id: record.id,
        title: `${property?.name ?? 'Property'} • ${record.title}`,
        detail: `Next action: ${formatLabel(record.status)}`,
        date: latestUpdate?.updatedAt ?? record.latestUpdateAt,
      };
    });

  return [...chargeReminders, ...maintenanceReminders]
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(0, 5);
}

export function getPropertyDetail(data: PrototypeData, propertyId: string): PropertyDetailSummary | null {
  const property = data.properties.find((item) => item.id === propertyId);

  if (!property) {
    return null;
  }

  const propertyUnits = data.units.filter((unit) => unit.propertyId === propertyId);
  const metrics = propertyUnitMetrics(data, propertyId);
  const openMaintenanceCount = data.maintenanceRequests.filter(
    (record) =>
      record.propertyId === propertyId && (record.status === 'open' || record.status === 'in_progress' || record.status === 'deferred')
  ).length;

  return {
    id: property.id,
    name: property.name,
    neighborhood: getNeighborhoodName(data, property.neighborhoodId),
    address: property.address,
    note: property.note,
    status: property.status,
    imageUrl: getPropertyImage(data, property.id),
    totalUnits: propertyUnits.length,
    occupiedUnits: metrics.occupiedUnits,
    vacantUnits: metrics.vacantUnits,
    expectedRent: metrics.expectedRent,
    collectedRent: metrics.collectedRent,
    pendingRent: metrics.pendingRent,
    overdueCount: metrics.overdueCount,
    openMaintenanceCount,
    units: propertyUnits.map((unit) => {
      const tenant = data.tenants.find((item) => item.id === unit.tenantId);
      const charge = data.rentCharges.find(
        (item) => item.unitId === unit.id && item.monthLabel === currentMonthLabel
      );
      const maintenance = getLatestMaintenanceForUnit(data, unit.id);
      const expectedAmount = charge?.expectedAmount ?? (unit.occupancyStatus === 'occupied' ? unit.monthlyRent : 0);
      const collectedAmount = charge?.collectedAmount ?? 0;

      return {
        unitId: unit.id,
        label: unit.label,
        bedrooms: unit.bedrooms,
        bathrooms: unit.bathrooms,
        monthlyRent: unit.monthlyRent,
        occupancyStatus: unit.occupancyStatus,
        tenantId: tenant?.id ?? null,
        tenantName: tenant?.fullName ?? 'Unassigned',
        tenantPhone: tenant?.phone ?? '',
        rentStatus: charge?.status ?? 'pending',
        dueDate: charge?.dueDate ?? '',
        expectedAmount,
        collectedAmount,
        pendingAmount: Math.max(expectedAmount - collectedAmount, 0),
        lastPaymentDate: charge?.lastPaymentDate ?? null,
        lastMaintenanceStatus: maintenance?.status ?? null,
        lastMaintenanceDate: maintenance?.serviceDate ?? null,
        lastMaintenanceCost: maintenance?.cost ?? null,
      };
    }),
  };
}

export function getLedgerRows(data: PrototypeData): LedgerRow[] {
  return data.rentCharges
    .map((charge) => {
      const unit = data.units.find((item) => item.id === charge.unitId);

      if (!unit) {
        return null;
      }

      const property = data.properties.find((item) => item.id === unit.propertyId);
      const tenant = data.tenants.find((item) => item.id === unit.tenantId);
      const recentPayments = data.rentPayments
        .filter((payment) => payment.chargeId === charge.id)
        .sort((a, b) => b.paymentDate.localeCompare(a.paymentDate));

      return {
        chargeId: charge.id,
        propertyId: property?.id ?? '',
        propertyName: property?.name ?? 'Property',
        unitId: unit.id,
        unitLabel: unit.label,
        tenantName: tenant?.fullName ?? 'Vacant',
        priorBalanceAmount: charge.priorBalanceAmount,
        expectedAmount: charge.expectedAmount,
        collectedAmount: charge.collectedAmount,
        pendingAmount: Math.max(charge.expectedAmount - charge.collectedAmount, 0),
        status: charge.status,
        dueDate: charge.dueDate,
        lastPaymentDate: charge.lastPaymentDate,
        recentPayments,
      };
    })
    .filter((item): item is LedgerRow => Boolean(item))
    .sort((a, b) => a.propertyName.localeCompare(b.propertyName) || a.unitLabel.localeCompare(b.unitLabel));
}

export function getMaintenanceRows(data: PrototypeData): MaintenanceRow[] {
  return data.maintenanceRequests
    .map((request) => {
      const property = data.properties.find((item) => item.id === request.propertyId);
      const unit = request.unitId ? data.units.find((item) => item.id === request.unitId) : null;
      const latestUpdate = data.maintenanceUpdates
        .filter((item) => item.requestId === request.id)
        .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))[0];
      const tenant = request.tenantId
        ? data.tenants.find((item) => item.id === request.tenantId)
        : null;

      return {
        id: request.id,
        propertyId: request.propertyId,
        propertyName: property?.name ?? 'Property',
        unitId: unit?.id ?? null,
        unitLabel: unit?.label ?? 'Common area',
        title: request.title,
        type: request.type,
        status: latestUpdate?.status ?? request.status,
        serviceDate: latestUpdate?.updatedAt ?? request.latestUpdateAt,
        nextActionDate:
          latestUpdate?.status === 'completed' || request.status === 'completed'
            ? null
            : latestUpdate?.updatedAt ?? request.latestUpdateAt,
        cost: latestUpdate?.cost ?? 0,
        note: latestUpdate?.note ?? request.summary,
        tenantId: request.tenantId,
        tenantName: tenant?.fullName ?? null,
        images: data.maintenanceImages
          .filter((item) => item.requestId === request.id)
          .map((item) => ({
            ...item,
            signedUrl: item.signedUrl ?? (item.bucket === 'demo-fallback' ? item.storagePath : null),
          })) as MaintenanceImage[],
      };
    })
    .sort((a, b) => b.serviceDate.localeCompare(a.serviceDate));
}

export function updateProperty(data: PrototypeData, propertyId: string, patch: { note?: string; status?: 'active' | 'inactive' }) {
  return {
    ...data,
    properties: data.properties.map((property) =>
      property.id === propertyId ? { ...property, ...patch } : property
    ),
  };
}

export function createNeighborhoodEntry(
  data: PrototypeData,
  payload: Pick<Neighborhood, 'stateCode' | 'name' | 'city' | 'note' | 'isActive'>
) {
  const neighborhoodId = `neigh-${Date.now()}`;

  return {
    ...data,
    neighborhoods: [
      {
        id: neighborhoodId,
        stateCode: payload.stateCode,
        name: payload.name,
        city: payload.city,
        note: payload.note,
        isActive: payload.isActive,
      },
      ...data.neighborhoods,
    ],
  };
}

export function updateNeighborhood(
  data: PrototypeData,
  neighborhoodId: string,
  patch: Partial<Pick<Neighborhood, 'stateCode' | 'name' | 'city' | 'note' | 'isActive'>>
) {
  return {
    ...data,
    neighborhoods: data.neighborhoods.map((neighborhood) =>
      neighborhood.id === neighborhoodId ? { ...neighborhood, ...patch } : neighborhood
    ),
  };
}

export function updateUnit(
  data: PrototypeData,
  unitId: string,
  patch: Partial<Pick<Unit, 'occupancyStatus' | 'tenantId'>>
) {
  return {
    ...data,
    units: data.units.map((unit) => (unit.id === unitId ? { ...unit, ...patch } : unit)),
  };
}

export function upsertTenantForUnit(
  data: PrototypeData,
  unitId: string,
  payload: { fullName: string; phone: string; email?: string }
) {
  const currentTenant = data.tenants.find((tenant) => tenant.unitId === unitId);

  if (currentTenant) {
    return {
      ...data,
      tenants: data.tenants.map((tenant) =>
        tenant.id === currentTenant.id
          ? {
              ...tenant,
              fullName: payload.fullName,
              phone: payload.phone,
              email: payload.email ?? tenant.email,
            }
          : tenant
      ),
    };
  }

  const newTenant: Tenant = {
    id: `tenant-${unitId}`,
    unitId,
    fullName: payload.fullName,
    phone: payload.phone,
    email: payload.email ?? `${unitId}@demo.local`,
    moveInDate: '2026-03-01',
    leaseEndDate: '2027-02-28',
    status: 'active',
  };

  return {
    ...data,
    tenants: [...data.tenants, newTenant],
    units: data.units.map((unit) => (unit.id === unitId ? { ...unit, tenantId: newTenant.id } : unit)),
  };
}

export function updateCharge(
  data: PrototypeData,
  chargeId: string,
  patch: Partial<Pick<RentCharge, 'collectedAmount' | 'status' | 'dueDate' | 'lastPaymentDate'>>
) {
  return {
    ...data,
    rentCharges: data.rentCharges.map((charge) => (charge.id === chargeId ? { ...charge, ...patch } : charge)),
  };
}

export function syncPaymentForCharge(
  data: PrototypeData,
  chargeId: string,
  payload: { amount: number; paymentDate: string }
) {
  const charge = data.rentCharges.find((item) => item.id === chargeId);

  if (!charge) {
    return data;
  }

  const unit = data.units.find((item) => item.id === charge.unitId);

  if (!unit) {
    return data;
  }

  const payment: RentPayment = {
    id: `pay-${chargeId}-${payload.paymentDate}`,
    chargeId,
    tenantId: charge.tenantId,
    propertyId: unit.propertyId,
    unitId: unit.id,
    amount: payload.amount,
    paymentDate: payload.paymentDate,
    method: 'Manual update',
    status: 'posted',
    externalReference: null,
    note: 'Updated from prototype ledger',
  };

  return {
    ...data,
    rentPayments: [
      payment,
      ...data.rentPayments.filter(
        (item) => !(item.chargeId === chargeId && item.paymentDate === payload.paymentDate && item.amount === payload.amount)
      ),
    ],
  };
}

export function updateMaintenance(
  data: PrototypeData,
  recordId: string,
  patch: Partial<Pick<MaintenanceRecord, 'status' | 'serviceDate' | 'cost' | 'note' | 'nextActionDate'>>
) {
  const request = data.maintenanceRequests.find((item) => item.id === recordId);

  if (!request) {
    return data;
  }

  const newUpdate: MaintenanceUpdate = {
    id: `mupd-${recordId}-${patch.serviceDate ?? request.latestUpdateAt}`,
    requestId: recordId,
    status: patch.status ?? request.status,
    note: patch.note ?? request.summary,
    updatedAt: patch.serviceDate ?? request.latestUpdateAt,
    updatedBy: 'admin',
    cost: patch.cost ?? 0,
  };

  return {
    ...data,
    maintenanceRequests: data.maintenanceRequests.map((record) =>
      record.id === recordId
        ? {
            ...record,
            status: patch.status ?? record.status,
            latestUpdateAt: patch.serviceDate ?? record.latestUpdateAt,
            summary: patch.note ?? record.summary,
          }
        : record
    ),
    maintenanceUpdates: [
      newUpdate,
      ...data.maintenanceUpdates.filter((item) => item.id !== newUpdate.id),
    ],
    maintenanceRecords: data.maintenanceRecords.map((record) =>
      record.id === recordId ? { ...record, ...patch } : record
    ),
  };
}

export function createPropertyEntry(
  data: PrototypeData,
  payload: {
    neighborhoodId: string;
    name: string;
    address: string;
    note: string;
    status: 'active' | 'inactive';
    imageUrl?: string;
  }
) {
  const propertyId = `prop-${Date.now()}`;
  const imageId = `img-${Date.now()}`;

  return {
    ...data,
    properties: [
      {
        id: propertyId,
        neighborhoodId: payload.neighborhoodId,
        name: payload.name,
        address: payload.address,
        note: payload.note,
        status: payload.status,
        coverImageUrl: payload.imageUrl || '',
      },
      ...data.properties,
    ],
    propertyImages: payload.imageUrl
      ? [
          {
            id: imageId,
            propertyId,
            imageUrl: payload.imageUrl,
            label: 'Cover',
          },
          ...data.propertyImages,
        ]
      : data.propertyImages,
  };
}

export function createUnitEntry(
  data: PrototypeData,
  payload: {
    propertyId: string;
    label: string;
    bedrooms: number;
    bathrooms: number;
    monthlyRent: number;
    occupancyStatus: 'occupied' | 'vacant' | 'turnover';
  }
) {
  const unitId = `unit-${Date.now()}`;
  const chargeId = `charge-${Date.now()}`;

  return {
    ...data,
    units: [
      {
        id: unitId,
        propertyId: payload.propertyId,
        label: payload.label,
        bedrooms: payload.bedrooms,
        bathrooms: payload.bathrooms,
        monthlyRent: payload.monthlyRent,
        occupancyStatus: payload.occupancyStatus,
        tenantId: null,
      },
      ...data.units,
    ],
    rentCharges: [
      {
        id: chargeId,
        tenantId: null,
        propertyId: payload.propertyId,
        unitId,
        chargeType: 'rent' as const,
        description: 'Monthly base rent',
        periodStart: '2026-03-01',
        periodEnd: '2026-03-31',
        dueDate: '2026-03-15',
        monthLabel: currentMonthLabel,
        expectedAmount: payload.monthlyRent,
        collectedAmount: 0,
        priorBalanceAmount: 0,
        status: 'pending' as const,
        lastPaymentDate: null,
      },
      ...data.rentCharges,
    ],
  };
}

export function createMaintenanceEntry(
  data: PrototypeData,
  payload: {
    propertyId: string;
    unitId: string | null;
    tenantId?: string | null;
    title: string;
    type: string;
    status: 'open' | 'in_progress' | 'completed' | 'deferred';
    serviceDate: string;
    cost: number;
    note: string;
    images?: Array<{
      uri: string;
      fileName?: string | null;
      mimeType?: string | null;
      fileSize?: number | null;
    }>;
  }
) {
  const requestId = `mreq-${Date.now()}`;
  const updateId = `mupd-${Date.now()}`;
  const summary = payload.note || 'New repair request created in demo mode.';
  const uploadedBy: 'admin' | 'tenant' = payload.tenantId ? 'tenant' : 'admin';
  const demoImages =
    payload.images?.map((image, index) => ({
      id: `mimg-${Date.now()}-${index}`,
      requestId,
      bucket: 'demo-fallback',
      storagePath: image.uri,
      fileName: image.fileName ?? `image-${index + 1}.jpg`,
      mimeType: image.mimeType ?? null,
      sizeBytes: image.fileSize ?? null,
      uploadedBy,
      createdAt: payload.serviceDate,
      signedUrl: image.uri,
    })) ?? [];

  return {
    ...data,
    maintenanceRequests: [
      {
        id: requestId,
        tenantId: payload.tenantId ?? null,
        propertyId: payload.propertyId,
        unitId: payload.unitId,
        title: payload.title,
        type: payload.type,
        priority: 'medium' as const,
        status: payload.status,
        submittedAt: payload.serviceDate,
        latestUpdateAt: payload.serviceDate,
        summary,
      },
      ...data.maintenanceRequests,
    ],
    maintenanceUpdates: [
      {
        id: updateId,
        requestId,
        status: payload.status,
        note: summary,
        updatedAt: payload.serviceDate,
        updatedBy: 'tenant' as const,
        cost: payload.cost,
      },
      ...data.maintenanceUpdates,
    ],
    maintenanceImages: [...demoImages, ...data.maintenanceImages],
    maintenanceRecords: [
      {
        id: requestId,
        propertyId: payload.propertyId,
        unitId: payload.unitId,
        title: payload.title,
        type: payload.type,
        status: payload.status,
        serviceDate: payload.serviceDate,
        nextActionDate: payload.status === 'completed' ? null : payload.serviceDate,
        cost: payload.cost,
        note: summary,
      },
      ...data.maintenanceRecords,
    ],
  };
}

export function createDocumentEntry(
  data: PrototypeData,
  payload: {
    tenantId: string;
    propertyId: string;
    unitId: string | null;
    leaseId: string | null;
    category: DocumentCategory;
    title: string;
    fileUrl?: string | null;
    mimeType?: string | null;
    sizeBytes?: number | null;
    uploadedBy?: 'admin' | 'tenant' | 'system';
    uploadedAt?: string;
  }
) {
  const uploadedAt = payload.uploadedAt ?? new Date().toISOString();
  const status: DocumentStatus = payload.fileUrl ? 'available' : 'placeholder';

  return {
    ...data,
    documents: [
      {
        id: `doc-${Date.now()}`,
        tenantId: payload.tenantId,
        propertyId: payload.propertyId,
        unitId: payload.unitId,
        leaseId: payload.leaseId,
        category: payload.category,
        title: payload.title,
        fileUrl: payload.fileUrl ?? null,
        storageBucket: payload.fileUrl ? 'demo-fallback' : null,
        storagePath: payload.fileUrl ?? null,
        mimeType: payload.mimeType ?? null,
        sizeBytes: payload.sizeBytes ?? null,
        uploadedBy: payload.uploadedBy ?? 'admin',
        signedUrl: payload.fileUrl ?? null,
        status,
        uploadedAt,
      },
      ...data.documents,
    ],
  };
}

export function createContactRequestEntry(
  data: PrototypeData,
  payload: {
    tenantId: string;
    propertyId: string;
    unitId: string;
    subject: string;
    message: string;
    channel: ContactRequest['channel'];
    category?: ContactRequest['category'];
    sentAt?: string;
  }
) {
  const sentAt = payload.sentAt ?? getTodayDateString();
  const inquiry: ContactRequest = {
    id: `creq-${Date.now()}`,
    tenantId: payload.tenantId,
    propertyId: payload.propertyId,
    unitId: payload.unitId,
    subject: payload.subject,
    message: payload.message,
    category: payload.category ?? 'general',
    channel: payload.channel,
    senderRole: 'tenant',
    status: 'sent',
    sentAt,
    adminReply: null,
    respondedAt: null,
    updatedAt: sentAt,
  };

  return {
    ...data,
    contactRequests: [inquiry, ...data.contactRequests],
    notifications: [
      {
        id: `notif-${Date.now()}`,
        tenantId: payload.tenantId,
        roleTarget: 'tenant' as const,
        type: 'message' as const,
        title: `Inquiry sent: ${payload.subject}`,
        body: 'Your message was sent to the property management team.',
        priority: 'low' as const,
        createdAt: sentAt,
        updatedAt: sentAt,
        readAt: null,
        dismissedAt: null,
        actionLabel: 'Contact admin',
        routeTarget: '/(tenant)/contact-admin',
        entityType: 'contact_request',
        entityId: inquiry.id,
      },
      ...data.notifications,
    ],
  };
}

export function replyToContactRequestEntry(
  data: PrototypeData,
  requestId: string,
  reply: string,
  options?: {
    repliedAt?: string;
  }
) {
  const currentRequest = data.contactRequests.find((item) => item.id === requestId);

  if (!currentRequest) {
    return data;
  }

  const repliedAt = options?.repliedAt ?? new Date().toISOString();
  const nextRequest: ContactRequest = {
    ...currentRequest,
    status: 'responded',
    adminReply: reply,
    respondedAt: repliedAt,
    updatedAt: repliedAt,
  };

  return {
    ...data,
    contactRequests: data.contactRequests.map((item) => (item.id === requestId ? nextRequest : item)),
    notifications: [
      {
        id: `notif-${Date.now()}`,
        tenantId: currentRequest.tenantId,
        roleTarget: 'tenant' as const,
        type: 'message' as const,
        title: `Reply received: ${currentRequest.subject}`,
        body: reply,
        priority: 'normal' as const,
        createdAt: repliedAt,
        updatedAt: repliedAt,
        readAt: null,
        dismissedAt: null,
        actionLabel: 'Contact admin',
        routeTarget: '/(tenant)/contact-admin',
        entityType: 'contact_request',
        entityId: requestId,
      },
      ...data.notifications,
    ],
  };
}
