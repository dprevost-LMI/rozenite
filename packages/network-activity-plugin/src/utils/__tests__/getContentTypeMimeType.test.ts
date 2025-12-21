import { describe, it, expect } from 'vitest';
import { getContentTypeMime } from '../getContentTypeMimeType';

describe('getContentTypeMime', () => {
  it('should return undefined if content-type header is missing', () => {
    expect(getContentTypeMime({})).toBeUndefined();
  });

  it('should return mime type from content-type header', () => {
    expect(getContentTypeMime({ 'content-type': 'application/json' })).toBe(
      'application/json',
    );
  });

  it('should handle case-insensitive header name', () => {
    expect(getContentTypeMime({ 'Content-Type': 'application/json' })).toBe(
      'application/json',
    );
  });

  it('should strip parameters', () => {
    expect(
      getContentTypeMime({ 'content-type': 'application/json; charset=utf-8' }),
    ).toBe('application/json');
  });

  it('should handle array value', () => {
    expect(getContentTypeMime({ 'content-type': ['application/json'] })).toBe(
      'application/json',
    );
  });
});
