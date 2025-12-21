import { describe, it, expect } from 'vitest';
import { getHttpHeader } from '../getHttpHeader';

describe('getHttpHeader', () => {
  it('should return undefined if header is missing', () => {
    expect(getHttpHeader({}, 'content-type')).toBeUndefined();
  });

  it('should return header value and original key', () => {
    const headers = { 'Content-Type': 'application/json' };
    expect(getHttpHeader(headers, 'content-type')).toEqual({
      value: 'application/json',
      originalKey: 'Content-Type',
    });
  });

  it('should be case insensitive', () => {
    const headers = { 'CONTENT-TYPE': 'application/json' };
    expect(getHttpHeader(headers, 'content-type')).toEqual({
      value: 'application/json',
      originalKey: 'CONTENT-TYPE',
    });
  });
});
