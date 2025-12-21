import { describe, it, expect, vi } from 'vitest';
import { getFormDataEntries } from '../getFormDataEntries';

describe('getFormDataEntries', () => {
  it('should return entries from standard FormData', () => {
    const entries = [['key', 'value']];
    const formData = {
      entries: vi.fn().mockReturnValue(entries),
    };
    expect(getFormDataEntries(formData)).toBe(entries);
  });

  it('should return parts from React Native FormData', () => {
    const parts = [['key', 'value']];
    const formData = {
      _parts: parts,
    };
    expect(getFormDataEntries(formData)).toBe(parts);
  });

  it('should return empty array if invalid input', () => {
    expect(getFormDataEntries(null)).toEqual([]);
    expect(getFormDataEntries(undefined)).toEqual([]);
    expect(getFormDataEntries('string')).toEqual([]);
    expect(getFormDataEntries({})).toEqual([]);
  });
});
