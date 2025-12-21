import { describe, it, expect } from 'vitest';
import { getContentType } from '../utils';

describe('getContentType', () => {
  it('should return content-type from headers if present', () => {
    const xhr = {
      responseHeaders: { 'content-type': 'application/xml' },
      responseType: '',
    } as any;
    expect(getContentType(xhr)).toBe('application/xml');
  });

  it('should return application/octet-stream for arraybuffer', () => {
    const xhr = {
      responseHeaders: {},
      responseType: 'arraybuffer',
    } as any;
    expect(getContentType(xhr)).toBe('application/octet-stream');
  });

  it('should return application/octet-stream for blob', () => {
    const xhr = {
      responseHeaders: {},
      responseType: 'blob',
    } as any;
    expect(getContentType(xhr)).toBe('application/octet-stream');
  });

  it('should return text/plain for text', () => {
    const xhr = {
      responseHeaders: {},
      responseType: 'text',
    } as any;
    expect(getContentType(xhr)).toBe('text/plain');
  });

  it('should return text/plain for empty string', () => {
    const xhr = {
      responseHeaders: {},
      responseType: '',
    } as any;
    expect(getContentType(xhr)).toBe('text/plain');
  });

  it('should return application/json for json', () => {
    const xhr = {
      responseHeaders: {},
      responseType: 'json',
    } as any;
    expect(getContentType(xhr)).toBe('application/json');
  });

  it('should return text/html for document', () => {
    const xhr = {
      responseHeaders: {},
      responseType: 'document',
    } as any;
    expect(getContentType(xhr)).toBe('text/html');
  });
});
