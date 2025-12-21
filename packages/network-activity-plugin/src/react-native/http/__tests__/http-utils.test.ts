import { describe, it, expect, vi } from 'vitest';
import { getRequestBody, getResponseSize, getInitiatorFromStack, setupRequestOverride, getResponseBody } from '../http-utils';
import { OverridesRegistry } from '../overrides-registry';
import { getContentType } from '../../utils';
import { getFormDataEntries } from '../../utils/getFormDataEntries';

// Mock dependencies
vi.mock('../../../utils/safeStringify', () => ({
  safeStringify: vi.fn((val) => JSON.stringify(val)),
}));

vi.mock('../../../utils/getStringSizeInBytes', () => ({
  getStringSizeInBytes: vi.fn((str) => str ? str.length : 0),
}));

vi.mock('../../../utils/typeChecks', () => ({
  isBlob: vi.fn((val) => val && val._isBlob),
  isArrayBuffer: vi.fn((val) => val && val._isArrayBuffer),
  isFormData: vi.fn((val) => val && val._isFormData),
  isNullOrUndefined: vi.fn((val) => val === null || val === undefined),
}));

vi.mock('../../utils/getBlobName', () => ({
  getBlobName: vi.fn(() => 'blob-name'),
}));

vi.mock('../../utils/getFormDataEntries', () => ({
  getFormDataEntries: vi.fn(() => [['key', 'value']]),
}));

vi.mock('../../utils', () => ({
  getContentType: vi.fn(() => 'application/json'),
}));

describe('http-utils', () => {
  describe('getRequestBody', () => {
    it('should return null for null/undefined', () => {
      expect(getRequestBody(null)).toBeNull();
      expect(getRequestBody(undefined)).toBeUndefined();
    });

    it('should return string as is', () => {
      expect(getRequestBody('test')).toEqual({
        type: 'text',
        value: '"test"',
      });
    });

    it('should return object for JSON-like object', () => {
      const data = { key: 'value' };
      expect(getRequestBody(data)).toEqual({
        type: 'text',
        value: '{"key":"value"}',
      });
    });

    it('should return blob info for Blob', () => {
      const blob = { _isBlob: true, size: 100, type: 'image/png' };
      expect(getRequestBody(blob)).toEqual({
        type: 'binary',
        value: {
          name: 'blob-name',
          size: 100,
          type: 'image/png',
        },
      });
    });

    it('should return form data entries for FormData', () => {
      const formData = { _isFormData: true };
      vi.mocked(getFormDataEntries).mockReturnValue([['key', 'value']]);
      expect(getRequestBody(formData)).toEqual({
        type: 'form-data',
        value: {
          key: {
            type: 'text',
            value: '"value"',
          },
        },
      });
    });

    it('should return form data entries for FormData with Blob and ArrayBuffer', () => {
      const formData = { _isFormData: true };
      const blob = { _isBlob: true, size: 100, type: 'image/png' };
      const buffer = { _isArrayBuffer: true, byteLength: 50 };
      
      vi.mocked(getFormDataEntries).mockReturnValue([
        ['blobKey', blob],
        ['bufferKey', buffer],
        ['textKey', 'textValue']
      ]);

      expect(getRequestBody(formData)).toEqual({
        type: 'form-data',
        value: {
          blobKey: {
            type: 'binary',
            value: { size: 100, type: 'image/png', name: 'blob-name' },
          },
          bufferKey: {
            type: 'binary',
            value: { size: 50 },
          },
          textKey: {
            type: 'text',
            value: '"textValue"',
          },
        },
      });
    });

    it('should return array buffer info for ArrayBuffer', () => {
      const buffer = { _isArrayBuffer: true, byteLength: 50 };
      expect(getRequestBody(buffer)).toEqual({
        type: 'binary',
        value: {
          size: 50,
        },
      });
    });
  });

  describe('getResponseSize', () => {
    it('should return size from response string', () => {
      const xhr = { responseType: 'text', response: '12345', responseText: '12345' } as any;
      expect(getResponseSize(xhr)).toBe(5);
    });

    it('should return size from json response', () => {
      const xhr = { responseType: 'json', response: { key: 'value' } } as any;
      expect(getResponseSize(xhr)).toBe(15);
    });

    it('should return size from responseText', () => {
      const xhr = { responseType: '', responseText: '12345', response: '12345' } as any;
      expect(getResponseSize(xhr)).toBe(5);
    });

    it('should return 0 if no response', () => {
      const xhr = { responseType: '', response: null, responseText: null } as any;
      expect(getResponseSize(xhr)).toBe(0);
    });

    it('should return 0 for unknown response type', () => {
      const xhr = { responseType: 'unknown', response: 'something' } as any;
      expect(getResponseSize(xhr)).toBe(0);
    });

    it('should return size from blob', () => {
      const xhr = { responseType: 'blob', response: { size: 100 } } as any;
      expect(getResponseSize(xhr)).toBe(100);
    });

    it('should return size from arraybuffer', () => {
      const xhr = { responseType: 'arraybuffer', response: { byteLength: 50 } } as any;
      expect(getResponseSize(xhr)).toBe(50);
    });

    it('should return null if error occurs', () => {
      const xhr = {
        get responseType() {
          throw new Error('Access error');
        },
      } as any;
      expect(getResponseSize(xhr)).toBeNull();
    });

    it('should return 0 for unknown responseType', () => {
      const xhr = { responseType: 'document', response: {} } as any;
      expect(getResponseSize(xhr)).toBe(0);
    });
  });

  describe('getResponseBody', () => {
    it('should return responseText for text response', async () => {
      const xhr = { responseType: 'text', responseText: 'hello' } as any;
      expect(await getResponseBody(xhr)).toBe('hello');
    });

    it('should return responseText for empty responseType', async () => {
      const xhr = { responseType: '', responseText: 'hello' } as any;
      expect(await getResponseBody(xhr)).toBe('hello');
    });

    it('should return stringified JSON for json response', async () => {
      const xhr = { responseType: 'json', response: { key: 'value' } } as any;
      expect(await getResponseBody(xhr)).toBe('{"key":"value"}');
    });

    it('should return text from blob if content-type is text', async () => {
      const xhr = {
        responseType: 'blob',
        response: { size: 100 },
        getResponseHeader: (header: string) => (header === 'Content-Type' ? 'text/plain' : null),
      } as any;

      const originalFileReader = global.FileReader;
      global.FileReader = class {
        onload: any;
        result: any;
        readAsText() {
          this.result = 'hello';
          this.onload();
        }
      } as any;
      
      const result = await getResponseBody(xhr);
      expect(result).toBe('hello');

      global.FileReader = originalFileReader;
    });

    it('should return text from blob if content-type is application/json', async () => {
      const xhr = {
        responseType: 'blob',
        response: { size: 100 },
        getResponseHeader: (header: string) => (header === 'Content-Type' ? 'application/json' : null),
      } as any;

      const originalFileReader = global.FileReader;
      global.FileReader = class {
        onload: any;
        result: any;
        readAsText() {
          this.result = '{"key":"value"}';
          this.onload();
        }
      } as any;

      const result = await getResponseBody(xhr);
      expect(result).toBe('{"key":"value"}');

      global.FileReader = originalFileReader;
    });

    it('should return null if content-type is missing', async () => {
      const xhr = {
        responseType: 'blob',
        response: { size: 100 },
        getResponseHeader: vi.fn().mockReturnValue(null),
      } as any;

      const result = await getResponseBody(xhr);
      expect(result).toBeNull();
    });

    it('should return null for other types', async () => {
       const xhr = { responseType: 'arraybuffer' } as any;
       expect(await getResponseBody(xhr)).toBeNull();
    });
  });

  describe('getInitiatorFromStack', () => {
    it('should return script initiator if stack matches', () => {
      const originalError = global.Error;
      // We need 10 lines before the target line
      const mockStack = `Error
    at a (file.js:1:1)
    at b (file.js:2:2)
    at c (file.js:3:3)
    at d (file.js:4:4)
    at e (file.js:5:5)
    at f (file.js:6:6)
    at g (file.js:7:7)
    at h (file.js:8:8)
    at i (file.js:9:9)
    at target (target.js:10:10)
`;
      global.Error = class extends Error {
        stack = mockStack;
      } as any;

      const initiator = getInitiatorFromStack();
      // The code splits by newline and takes index 9 (10th line)
      // Line 0: Error
      // Line 1: at a
      // ...
      // Line 9: at i (file.js:9:9)
      
      expect(initiator).toEqual({
        type: 'script',
        url: 'file.js',
        lineNumber: 9,
        columnNumber: 9,
      });

      global.Error = originalError;
    });

    it('should return other if stack does not match', () => {
      const originalError = global.Error;
      global.Error = class extends Error {
        stack = 'Error\n at nothing';
      } as any;
      const initiator = getInitiatorFromStack();
      expect(initiator).toEqual({ type: 'other' });
      global.Error = originalError;
    });

    it('should return other if stack parsing throws', () => {
      const originalError = global.Error;
      global.Error = class extends Error {
        stack = 'Short stack'; // Less than 10 lines, will cause split[9] to be undefined, and undefined.match throws
      } as any;
      const initiator = getInitiatorFromStack();
      expect(initiator).toEqual({ type: 'other' });
      global.Error = originalError;
    });

    it('should return other if stack is missing', () => {
      const originalError = global.Error;
      global.Error = class extends Error {
        stack = undefined;
      } as any;
      const initiator = getInitiatorFromStack();
      expect(initiator).toEqual({ type: 'other' });
      global.Error = originalError;
    });

    it('should return other if stack line does not match regex', () => {
      const originalError = global.Error;
      const mockStack = `Error
    at 1
    at 2
    at 3
    at 4
    at 5
    at 6
    at 7
    at 8
    at invalid-line
`;
      global.Error = class extends Error {
        stack = mockStack;
      } as any;
      const initiator = getInitiatorFromStack();
      expect(initiator).toEqual({ type: 'other' });
      global.Error = originalError;
    });
  });

  describe('setupRequestOverride', () => {
    it('should setup override if match found', () => {
      const registry = {
        getOverrideForUrl: vi.fn().mockReturnValue({
          body: '{"mock":true}',
          status: 200,
        }),
      } as unknown as OverridesRegistry;

      const xhr = {
        _method: 'GET',
        _url: 'https://api.example.com',
        addEventListener: vi.fn(),
        getResponseHeader: vi.fn(),
        responseType: '',
      } as any;

      setupRequestOverride(registry, xhr);

      expect(registry.getOverrideForUrl).toHaveBeenCalledWith('https://api.example.com');
      expect(xhr.addEventListener).toHaveBeenCalledWith('readystatechange', expect.any(Function));
      
      // Trigger the listener
      const listener = xhr.addEventListener.mock.calls[0][1];
      
      vi.mocked(getContentType).mockReturnValue('application/json');
      
      listener();
      
      expect(xhr.responseType).toBe('json');
      expect(xhr.response).toBe('{"mock":true}');
      expect(xhr.responseText).toBe('{"mock":true}');
      expect(xhr.status).toBe(200);
    });

    it('should set responseType to text for text/plain', () => {
      const registry = {
        getOverrideForUrl: vi.fn().mockReturnValue({
          body: 'text response',
          status: 200,
        }),
      } as unknown as OverridesRegistry;

      const xhr = {
        _method: 'GET',
        _url: 'https://api.example.com',
        addEventListener: vi.fn(),
        responseType: '',
      } as any;

      setupRequestOverride(registry, xhr);
      
      const listener = xhr.addEventListener.mock.calls[0][1];
      
      vi.mocked(getContentType).mockReturnValue('text/plain');
      
      listener();
      
      expect(xhr.responseType).toBe('text');
    });

    it('should do nothing if no override found', () => {
      const registry = {
        getOverrideForUrl: vi.fn().mockReturnValue(null),
      } as unknown as OverridesRegistry;

      const xhr = {
        _method: 'GET',
        _url: 'https://api.example.com',
        addEventListener: vi.fn(),
      };

      setupRequestOverride(registry, xhr as any);

      expect(xhr.addEventListener).not.toHaveBeenCalled();
    });
  });
});
