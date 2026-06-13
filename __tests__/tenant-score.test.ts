import { calculateTenantScore } from '@/lib/tenant-score';

describe('calculateTenantScore', () => {
  it('returns a strong score when rent is current and repairs are closed', () => {
    const result = calculateTenantScore({
      tenantStatus: 'active',
      rentRows: [
        {
          status: 'paid',
          pendingAmount: 0,
          priorBalanceAmount: 0,
        },
      ],
      repairItems: [
        {
          status: 'completed',
          priority: 'low',
        },
      ],
      messages: [],
    });

    expect(result.score).toBeGreaterThanOrEqual(90);
    expect(result.label).toBe('Excellent');
    expect(result.components[0].reason).toContain('No overdue rent charges');
  });

  it('penalizes overdue rent and open high-priority repairs', () => {
    const result = calculateTenantScore({
      tenantStatus: 'active',
      rentRows: [
        {
          status: 'overdue',
          pendingAmount: 1850,
          priorBalanceAmount: 0,
        },
      ],
      repairItems: [
        {
          status: 'open',
          priority: 'high',
        },
      ],
      messages: [],
    });

    expect(result.score).toBeLessThan(90);
    expect(result.label).toBe('Stable');
    expect(result.components[0].reason).toContain('overdue rent charge');
    expect(result.components[1].reason).toContain('open or in-process repair item');
  });

  it('applies a lighter adjustment for pending tenants than former tenants', () => {
    const pending = calculateTenantScore({
      tenantStatus: 'pending',
      rentRows: [],
      repairItems: [],
      messages: [],
    });

    const former = calculateTenantScore({
      tenantStatus: 'former',
      rentRows: [],
      repairItems: [],
      messages: [],
    });

    expect(pending.score).toBeGreaterThan(former.score);
  });
});
