import type { ContactRequestStatus, MaintenanceStatus, RentStatus } from '@/types/domain';

type RentSignal = {
  status: RentStatus;
  pendingAmount?: number;
  priorBalanceAmount?: number;
};

type RepairSignal = {
  status: MaintenanceStatus;
  priority?: 'low' | 'medium' | 'high';
};

type MessageSignal = {
  status: ContactRequestStatus;
  respondedAt?: string | null;
  sentAt?: string | null;
  updatedAt?: string | null;
};

type TenantScoreInput = {
  tenantStatus?: 'active' | 'pending' | 'former';
  rentRows: RentSignal[];
  repairItems: RepairSignal[];
  messages: MessageSignal[];
};

export type TenantScoreComponent = {
  label: string;
  value: number;
  max: number;
  reason: string;
};

export type TenantScoreResult = {
  score: number;
  label: string;
  helper: string;
  components: TenantScoreComponent[];
};

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

export function calculateTenantScore(input: TenantScoreInput): TenantScoreResult {
  const activeRows = input.rentRows.filter((row) => row.status !== 'paid' || (row.pendingAmount ?? 0) > 0);
  const overdueCount = input.rentRows.filter((row) => row.status === 'overdue').length;
  const partialCount = input.rentRows.filter((row) => row.status === 'partial').length;
  const pendingBalanceCount = activeRows.filter((row) => (row.pendingAmount ?? 0) + (row.priorBalanceAmount ?? 0) > 0).length;
  const openRepairs = input.repairItems.filter(
    (item) => item.status === 'open' || item.status === 'in_progress' || item.status === 'deferred'
  );
  const highPriorityRepairs = openRepairs.filter((item) => item.priority === 'high').length;
  const unansweredMessages = 0;

  const overduePenalty =
    overdueCount <= 0 ? 0 : overdueCount === 1 ? 8 : 8 + (overdueCount - 1) * 16;
  const paymentValue =
    input.rentRows.length === 0
      ? 42
      : clamp(55 - overduePenalty - partialCount * 7 - Math.max(0, pendingBalanceCount - partialCount - overdueCount) * 5, 18, 55);
  const repairValue = clamp(25 - openRepairs.length * 4 - highPriorityRepairs * 3, 10, 25);
  const communicationValue = clamp(20 - unansweredMessages * 4, 8, 20);
  const statusAdjustment = input.tenantStatus === 'former' ? -8 : input.tenantStatus === 'pending' ? -3 : 0;
  const score = clamp(Math.round(paymentValue + repairValue + communicationValue + statusAdjustment), 0, 100);

  const label = score >= 90 ? 'Excellent' : score >= 75 ? 'Stable' : score >= 60 ? 'Needs attention' : 'Follow-up needed';
  const helper =
    score >= 75
      ? 'Account is in good standing with routine follow-up only.'
      : 'Review the items below before the next tenant touchpoint.';

  return {
    score,
    label,
    helper,
    components: [
      {
        label: 'Payment behavior',
        value: paymentValue,
        max: 55,
        reason:
          input.rentRows.length === 0
            ? 'No posted rent charge is available yet.'
            : overdueCount > 0
              ? `${overdueCount} overdue rent charge${overdueCount === 1 ? '' : 's'} on record.`
              : partialCount > 0
                ? `${partialCount} partial payment${partialCount === 1 ? '' : 's'} with balance to monitor.`
                : 'No overdue rent charges on record.',
      },
      {
        label: 'Home and repair signals',
        value: repairValue,
        max: 25,
        reason:
          openRepairs.length > 0
            ? `${openRepairs.length} open or in-process repair item${openRepairs.length === 1 ? '' : 's'} needs visibility.`
            : 'No open repair issues tied to this resident.',
      },
      {
        label: 'Communication',
        value: communicationValue,
        max: 20,
        reason:
          'Messages do not lower this score in the current release.',
      },
    ],
  };
}
