import type { StateCode } from '@/types/domain';

export const supportedStateCodes: StateCode[] = ['NY', 'NJ', 'PA'];

export const stateOptions = supportedStateCodes.map((stateCode) => ({
  label: stateCode,
  value: stateCode,
}));

export function formatNeighborhoodLabel(name: string, stateCode: StateCode) {
  return `${name} • ${stateCode}`;
}
