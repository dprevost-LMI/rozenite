import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useWebSocketInspector } from '../useWebSocketInspector';
import { createMockClient, createMockWebSocketInspector } from './test-utils';

describe('useWebSocketInspector', () => {
  let mockClient: ReturnType<typeof createMockClient>;
  let mockWebSocketInspector: ReturnType<typeof createMockWebSocketInspector>;

  beforeEach(() => {
    mockClient = createMockClient();
    mockWebSocketInspector = createMockWebSocketInspector();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('initialization', () => {
    it('should not setup subscriptions when client is null', () => {
      renderHook(() =>
        useWebSocketInspector(null, mockWebSocketInspector, true, false)
      );

      expect(mockClient.onMessage).not.toHaveBeenCalled();
      expect(mockWebSocketInspector.enable).not.toHaveBeenCalled();
    });

    it('should not setup subscriptions when isEnabled is false', () => {
      renderHook(() =>
        useWebSocketInspector(mockClient, mockWebSocketInspector, false, false)
      );

      expect(mockClient.onMessage).not.toHaveBeenCalled();
      expect(mockWebSocketInspector.enable).not.toHaveBeenCalled();
    });

    it('should setup subscriptions when client and isEnabled are truthy', () => {
      renderHook(() =>
        useWebSocketInspector(mockClient, mockWebSocketInspector, true, false)
      );

      expect(mockClient.onMessage).toHaveBeenCalledWith(
        'network-enable',
        expect.any(Function)
      );
      expect(mockClient.onMessage).toHaveBeenCalledWith(
        'network-disable',
        expect.any(Function)
      );
    });

    it('should enable inspector on mount when recording is enabled', () => {
      renderHook(() =>
        useWebSocketInspector(mockClient, mockWebSocketInspector, true, true)
      );

      expect(mockWebSocketInspector.enable).toHaveBeenCalledTimes(1);
    });

    it('should not enable inspector on mount when recording is disabled', () => {
      renderHook(() =>
        useWebSocketInspector(mockClient, mockWebSocketInspector, true, false)
      );

      expect(mockWebSocketInspector.enable).not.toHaveBeenCalled();
    });
  });

  describe('network-enable message', () => {
    it('should enable inspector when network-enable message is received', () => {
      renderHook(() =>
        useWebSocketInspector(mockClient, mockWebSocketInspector, true, false)
      );

      (mockClient as any).triggerMessage('network-enable');

      expect(mockWebSocketInspector.enable).toHaveBeenCalledTimes(1);
    });

    it('should handle multiple enable calls', () => {
      renderHook(() =>
        useWebSocketInspector(mockClient, mockWebSocketInspector, true, false)
      );

      (mockClient as any).triggerMessage('network-enable');
      (mockClient as any).triggerMessage('network-enable');
      (mockClient as any).triggerMessage('network-enable');

      expect(mockWebSocketInspector.enable).toHaveBeenCalledTimes(3);
    });
  });

  describe('network-disable message', () => {
    it('should disable inspector when network-disable message is received', () => {
      renderHook(() =>
        useWebSocketInspector(mockClient, mockWebSocketInspector, true, false)
      );

      (mockClient as any).triggerMessage('network-disable');

      expect(mockWebSocketInspector.disable).toHaveBeenCalledTimes(1);
    });

    it('should handle multiple disable calls', () => {
      renderHook(() =>
        useWebSocketInspector(mockClient, mockWebSocketInspector, true, false)
      );

      (mockClient as any).triggerMessage('network-disable');
      (mockClient as any).triggerMessage('network-disable');

      expect(mockWebSocketInspector.disable).toHaveBeenCalledTimes(2);
    });
  });

  describe('cleanup', () => {
    it('should dispose inspector and remove subscriptions on unmount', () => {
      const { unmount } = renderHook(() =>
        useWebSocketInspector(mockClient, mockWebSocketInspector, true, false)
      );

      unmount();

      expect(mockWebSocketInspector.dispose).toHaveBeenCalledTimes(1);
    });

    it('should cleanup when dependencies change', () => {
      const { rerender } = renderHook(
        ({ enabled }: { enabled: boolean }) =>
          useWebSocketInspector(
            mockClient,
            mockWebSocketInspector,
            enabled,
            false
          ),
        { initialProps: { enabled: true } }
      );

      expect(mockWebSocketInspector.dispose).not.toHaveBeenCalled();

      // Change isEnabled to false, triggering cleanup of previous effect
      rerender({ enabled: false });

      expect(mockWebSocketInspector.dispose).toHaveBeenCalledTimes(1);
    });

    it('should cleanup when client changes', () => {
      const newMockClient = createMockClient();

      const { rerender } = renderHook(
        ({ client }: { client: ReturnType<typeof createMockClient> }) =>
          useWebSocketInspector(client, mockWebSocketInspector, true, false),
        { initialProps: { client: mockClient } }
      );

      expect(mockWebSocketInspector.dispose).not.toHaveBeenCalled();

      // Change client, triggering cleanup of previous effect
      rerender({ client: newMockClient });

      expect(mockWebSocketInspector.dispose).toHaveBeenCalledTimes(1);
    });
  });

  describe('hot reload support', () => {
    it('should re-enable inspector on mount when recording was previously enabled', () => {
      renderHook(() =>
        useWebSocketInspector(mockClient, mockWebSocketInspector, true, true)
      );

      expect(mockWebSocketInspector.enable).toHaveBeenCalledTimes(1);
    });

    it('should handle enable/disable cycles correctly', () => {
      renderHook(() =>
        useWebSocketInspector(mockClient, mockWebSocketInspector, true, false)
      );

      // Simulate enable/disable cycle
      (mockClient as any).triggerMessage('network-enable');
      expect(mockWebSocketInspector.enable).toHaveBeenCalledTimes(1);

      (mockClient as any).triggerMessage('network-disable');
      expect(mockWebSocketInspector.disable).toHaveBeenCalledTimes(1);

      (mockClient as any).triggerMessage('network-enable');
      expect(mockWebSocketInspector.enable).toHaveBeenCalledTimes(2);
    });
  });

  describe('edge cases', () => {
    it('should handle inspector changing between renders', () => {
      const newMockWebSocketInspector = createMockWebSocketInspector();

      const { rerender } = renderHook(
        ({ inspector }: { inspector: ReturnType<typeof createMockWebSocketInspector> }) =>
          useWebSocketInspector(mockClient, inspector, true, false),
        { initialProps: { inspector: mockWebSocketInspector } }
      );

      expect(mockWebSocketInspector.dispose).not.toHaveBeenCalled();

      rerender({ inspector: newMockWebSocketInspector });

      // Old inspector should be disposed
      expect(mockWebSocketInspector.dispose).toHaveBeenCalledTimes(1);
      // New inspector should not be disposed
      expect(newMockWebSocketInspector.dispose).not.toHaveBeenCalled();
    });

    it('should handle recording state changing between renders', () => {
      const { rerender } = renderHook(
        ({ recording }: { recording: boolean }) =>
          useWebSocketInspector(
            mockClient,
            mockWebSocketInspector,
            true,
            recording
          ),
        { initialProps: { recording: false } }
      );

      expect(mockWebSocketInspector.enable).not.toHaveBeenCalled();

      // Change recording state to true
      rerender({ recording: true });

      // Inspector should be enabled when effect re-runs
      expect(mockWebSocketInspector.enable).toHaveBeenCalledTimes(1);
    });
  });
});
