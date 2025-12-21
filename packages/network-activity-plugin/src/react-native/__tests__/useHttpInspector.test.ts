import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useHttpInspector } from '../useHttpInspector';
import {
  createMockClient,
  createMockHttpInspector,
  createMockXMLHttpRequest,
} from './test-utils';

// Mock the dependencies
const mockOverridesRegistry = vi.hoisted(() => ({
  setOverrides: vi.fn(),
  getOverrideForUrl: vi.fn(),
  clear: vi.fn(),
}));

vi.mock('../http/http-utils', () => ({
  getResponseBody: vi.fn(async (request) => {
    if (request.responseType === 'json') {
      return JSON.stringify({ data: 'test' });
    }
    return request.responseText || 'mock response body';
  }),
}));

vi.mock('../http/overrides-registry', () => ({
  getOverridesRegistry: vi.fn(() => mockOverridesRegistry),
}));

describe('useHttpInspector', () => {
  let mockClient: ReturnType<typeof createMockClient>;
  let mockHttpInspector: ReturnType<typeof createMockHttpInspector>;

  beforeEach(() => {
    mockClient = createMockClient();
    mockHttpInspector = createMockHttpInspector();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('initialization', () => {
    it('should not setup subscriptions when client is null', () => {
      renderHook(() =>
        useHttpInspector(null, mockHttpInspector, true, false)
      );

      expect(mockClient.onMessage).not.toHaveBeenCalled();
      expect(mockHttpInspector.enable).not.toHaveBeenCalled();
    });

    it('should not setup subscriptions when isEnabled is false', () => {
      renderHook(() =>
        useHttpInspector(mockClient, mockHttpInspector, false, false)
      );

      expect(mockClient.onMessage).not.toHaveBeenCalled();
      expect(mockHttpInspector.enable).not.toHaveBeenCalled();
    });

    it('should setup subscriptions when client and isEnabled are truthy', () => {
      renderHook(() =>
        useHttpInspector(mockClient, mockHttpInspector, true, false)
      );

      expect(mockClient.onMessage).toHaveBeenCalledWith(
        'network-enable',
        expect.any(Function)
      );
      expect(mockClient.onMessage).toHaveBeenCalledWith(
        'network-disable',
        expect.any(Function)
      );
      expect(mockClient.onMessage).toHaveBeenCalledWith(
        'set-overrides',
        expect.any(Function)
      );
      expect(mockClient.onMessage).toHaveBeenCalledWith(
        'get-response-body',
        expect.any(Function)
      );
    });

    it('should enable inspector on mount when recording is enabled', () => {
      renderHook(() =>
        useHttpInspector(mockClient, mockHttpInspector, true, true)
      );

      expect(mockHttpInspector.enable).toHaveBeenCalledTimes(1);
    });

    it('should not enable inspector on mount when recording is disabled', () => {
      renderHook(() =>
        useHttpInspector(mockClient, mockHttpInspector, true, false)
      );

      expect(mockHttpInspector.enable).not.toHaveBeenCalled();
    });
  });

  describe('network-enable message', () => {
    it('should enable inspector when network-enable message is received', () => {
      renderHook(() =>
        useHttpInspector(mockClient, mockHttpInspector, true, false)
      );

      (mockClient as any).triggerMessage('network-enable');

      expect(mockHttpInspector.enable).toHaveBeenCalledTimes(1);
    });
  });

  describe('network-disable message', () => {
    it('should disable inspector when network-disable message is received', () => {
      renderHook(() =>
        useHttpInspector(mockClient, mockHttpInspector, true, false)
      );

      (mockClient as any).triggerMessage('network-disable');

      expect(mockHttpInspector.disable).toHaveBeenCalledTimes(1);
    });
  });

  describe('set-overrides message', () => {
    it('should set overrides when set-overrides message is received', async () => {
      renderHook(() =>
        useHttpInspector(mockClient, mockHttpInspector, true, false)
      );

      const testOverrides = [
        { url: 'https://api.example.com', status: 404, body: 'Not Found' },
      ];
      
      (mockClient as any).triggerMessage('set-overrides', {
        overrides: testOverrides,
      });

      expect(mockOverridesRegistry.setOverrides).toHaveBeenCalledWith(
        testOverrides
      );
    });
  });

  describe('get-response-body message', () => {
    it('should send response body when request is found', async () => {
      const mockRequest = createMockXMLHttpRequest();
      mockRequest.responseText = 'test response';

      mockHttpInspector.getNetworkRequestsRegistry.mockReturnValue({
        getEntry: vi.fn(() => mockRequest),
        addEntry: vi.fn(),
        removeEntry: vi.fn(),
        clear: vi.fn(),
        getEntries: vi.fn(() => new Map()),
      });

      renderHook(() =>
        useHttpInspector(mockClient, mockHttpInspector, true, false)
      );

      await (mockClient as any).triggerMessage('get-response-body', {
        requestId: 'test-id',
      });

      await waitFor(() => {
        expect(mockClient.send).toHaveBeenCalledWith('response-body', {
          requestId: 'test-id',
          body: 'test response',
        });
      });
    });

    it('should not send response body when request is not found', async () => {
      mockHttpInspector.getNetworkRequestsRegistry.mockReturnValue({
        getEntry: vi.fn(() => null),
        addEntry: vi.fn(),
        removeEntry: vi.fn(),
        clear: vi.fn(),
        getEntries: vi.fn(() => new Map()),
      });

      renderHook(() =>
        useHttpInspector(mockClient, mockHttpInspector, true, false)
      );

      await (mockClient as any).triggerMessage('get-response-body', {
        requestId: 'non-existent-id',
      });

      expect(mockClient.send).not.toHaveBeenCalledWith(
        'response-body',
        expect.anything()
      );
    });

    it('should handle JSON response types', async () => {
      const mockRequest = createMockXMLHttpRequest();
      mockRequest.responseType = 'json';
      (mockRequest.response as any) = { data: 'test' };

      mockHttpInspector.getNetworkRequestsRegistry.mockReturnValue({
        getEntry: vi.fn(() => mockRequest),
        addEntry: vi.fn(),
        removeEntry: vi.fn(),
        clear: vi.fn(),
        getEntries: vi.fn(() => new Map()),
      });

      renderHook(() =>
        useHttpInspector(mockClient, mockHttpInspector, true, false)
      );

      await (mockClient as any).triggerMessage('get-response-body', {
        requestId: 'test-id',
      });

      await waitFor(() => {
        expect(mockClient.send).toHaveBeenCalledWith('response-body', {
          requestId: 'test-id',
          body: '{"data":"test"}',
        });
      });
    });
  });

  describe('cleanup', () => {
    it('should dispose inspector and remove subscriptions on unmount', () => {
      const { unmount } = renderHook(() =>
        useHttpInspector(mockClient, mockHttpInspector, true, false)
      );

      const subscriptionRemove = vi.fn();
      (mockClient.onMessage as any).mockReturnValue({
        remove: subscriptionRemove,
      });

      unmount();

      expect(mockHttpInspector.dispose).toHaveBeenCalledTimes(1);
    });

    it('should cleanup when dependencies change', () => {
      const { rerender } = renderHook(
        ({ enabled }: { enabled: boolean }) =>
          useHttpInspector(mockClient, mockHttpInspector, enabled, false),
        { initialProps: { enabled: true } }
      );

      expect(mockHttpInspector.dispose).not.toHaveBeenCalled();

      // Change isEnabled to false, triggering cleanup of previous effect
      rerender({ enabled: false });

      expect(mockHttpInspector.dispose).toHaveBeenCalledTimes(1);
    });
  });

  describe('hot reload support', () => {
    it('should re-enable inspector on mount when recording was previously enabled', () => {
      renderHook(() =>
        useHttpInspector(mockClient, mockHttpInspector, true, true)
      );

      expect(mockHttpInspector.enable).toHaveBeenCalledTimes(1);
    });

    it('should handle multiple enable/disable cycles', () => {
      renderHook(() =>
        useHttpInspector(mockClient, mockHttpInspector, true, false)
      );

      (mockClient as any).triggerMessage('network-enable');
      expect(mockHttpInspector.enable).toHaveBeenCalledTimes(1);

      (mockClient as any).triggerMessage('network-disable');
      expect(mockHttpInspector.disable).toHaveBeenCalledTimes(1);

      (mockClient as any).triggerMessage('network-enable');
      expect(mockHttpInspector.enable).toHaveBeenCalledTimes(2);
    });
  });
});
