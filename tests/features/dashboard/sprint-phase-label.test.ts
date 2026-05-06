import { describe, it, expect, vi } from 'vitest';
import { resolveSprintPhaseLabel } from '@/features/dashboard/sprint-phase-label';

describe('resolveSprintPhaseLabel', () => {
  it('returns dash when status is null', () => {
    const t = vi.fn();
    expect(resolveSprintPhaseLabel(null, t)).toBe('—');
    expect(t).not.toHaveBeenCalled();
  });

  it.each([
    ['draft'],
    ['active'],
    ['review'],
    ['dispute_window'],
    ['settlement'],
    ['completed'],
    ['cancelled'],
  ])('looks up known status %s under phaseLabel namespace', (status) => {
    const t = vi.fn((key: string) => `translated:${key}`);
    expect(resolveSprintPhaseLabel(status, t)).toBe(`translated:phaseLabel.${status}`);
    expect(t).toHaveBeenCalledWith(`phaseLabel.${status}`);
  });

  it('normalizes whitespace and case before lookup', () => {
    const t = vi.fn((key: string) => `translated:${key}`);
    expect(resolveSprintPhaseLabel('  ACTIVE  ', t)).toBe('translated:phaseLabel.active');
  });

  it('falls back to phaseLabel.unknown for unrecognized statuses', () => {
    const t = vi.fn((key: string) => `translated:${key}`);
    expect(resolveSprintPhaseLabel('something_new', t)).toBe('translated:phaseLabel.unknown');
    expect(t).toHaveBeenCalledWith('phaseLabel.unknown');
  });
});
