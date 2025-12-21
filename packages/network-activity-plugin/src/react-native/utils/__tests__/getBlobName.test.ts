import { describe, it, expect } from 'vitest';
import { getBlobName } from '../getBlobName';

describe('getBlobName', () => {
  it('should return name from blob property', () => {
    const blob = { name: 'test.png' };
    expect(getBlobName(blob)).toBe('test.png');
  });

  it('should return name from blob.data property', () => {
    const blob = { data: { name: 'test.png' } };
    expect(getBlobName(blob)).toBe('test.png');
  });

  it('should return undefined if no name found', () => {
    expect(getBlobName({})).toBeUndefined();
    expect(getBlobName({ data: {} })).toBeUndefined();
    expect(getBlobName(null)).toBeUndefined();
    expect(getBlobName(undefined)).toBeUndefined();
  });
});
