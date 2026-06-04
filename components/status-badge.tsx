import { StyleSheet, Text, View } from 'react-native';

import { palette } from '@/lib/theme';
import type {
  MaintenanceStatus,
  OccupancyStatus,
  PaymentRecordStatus,
  PropertyStatus,
  RentStatus,
} from '@/types/domain';

type BadgeTone = 'neutral' | 'success' | 'warning' | 'danger' | 'info';

type StatusBadgeProps = {
  label: string;
  tone?: BadgeTone;
};

export function StatusBadge({ label, tone = 'neutral' }: StatusBadgeProps) {
  return (
    <View style={[styles.badge, toneStyles[tone].container]}>
      <Text style={[styles.label, toneStyles[tone].label]}>{label}</Text>
    </View>
  );
}

export function formatStatusLabel(label: string) {
  return label
    .replace(/_/g, ' ')
    .split(' ')
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

export function formatRepairStatusLabel(status: MaintenanceStatus) {
  switch (status) {
    case 'open':
      return 'Open';
    case 'in_progress':
      return 'In process';
    case 'deferred':
      return 'Materials needed';
    case 'completed':
      return 'Completed';
    default:
      return formatStatusLabel(status);
  }
}

export function rentStatusTone(status: RentStatus): BadgeTone {
  switch (status) {
    case 'paid':
      return 'success';
    case 'partial':
      return 'warning';
    case 'overdue':
      return 'danger';
    default:
      return 'neutral';
  }
}

export function maintenanceStatusTone(status: MaintenanceStatus): BadgeTone {
  switch (status) {
    case 'completed':
      return 'success';
    case 'in_progress':
      return 'info';
    case 'open':
      return 'warning';
    default:
      return 'neutral';
  }
}

export function occupancyTone(status: OccupancyStatus): BadgeTone {
  switch (status) {
    case 'occupied':
      return 'success';
    case 'turnover':
      return 'warning';
    default:
      return 'neutral';
  }
}

export function propertyStatusTone(status: PropertyStatus): BadgeTone {
  return status === 'active' ? 'success' : 'neutral';
}

export function paymentRecordTone(status: PaymentRecordStatus): BadgeTone {
  switch (status) {
    case 'posted':
      return 'success';
    case 'processing':
      return 'warning';
    case 'failed':
      return 'danger';
    default:
      return 'neutral';
  }
}

const styles = StyleSheet.create({
  badge: {
    alignSelf: 'flex-start',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  label: {
    fontSize: 12,
    fontWeight: '700',
  },
});

const toneStyles = {
  neutral: StyleSheet.create({
    container: { backgroundColor: palette.neutralSoft },
    label: { color: palette.secondaryAccent },
  }),
  success: StyleSheet.create({
    container: { backgroundColor: palette.successSoft },
    label: { color: palette.successText },
  }),
  warning: StyleSheet.create({
    container: { backgroundColor: palette.warningSoft },
    label: { color: palette.secondaryAccent },
  }),
  danger: StyleSheet.create({
    container: { backgroundColor: palette.dangerSoft },
    label: { color: palette.danger },
  }),
  info: StyleSheet.create({
    container: { backgroundColor: palette.infoSoft },
    label: { color: palette.info },
  }),
} as const;
