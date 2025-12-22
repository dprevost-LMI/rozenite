import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useSSEInspector } from '../useSSEInspector';
import { createMockClient, createMockSSEInspector } from './test-utils';

describe('useSSEInspector', () => {
  let mockClient: ReturnType<typeof createMockClient>;
  let mockSSEInspector: ReturnType<typeof createMockSSEInspector>;

  beforeEach(() => {
    mockClient = createMockClient();
    mockSSEInspector = createMockSSEInspector();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('initialization', () => {
    it('should not setup subscriptions when client is null', () => {
      renderHook(() => useSSEInspector(null, mockSSEInspector, true, false));

      expect(mockClient.onMessage).not.toHaveBeenCalled();
      expect(mockSSEInspector.enable).not.toHaveBeenCalled();
    });

    it('should not setup subscriptions when isEnabled is false', () => {
      renderHook(() =>
        useSSEInspector(mockClient, mockSSEInspector, false, false),
      );

      expect(mockClient.onMessage).not.toHaveBeenCalled();
      expect(mockSSEInspector.enable).not.toHaveBeenCalled();
    });

    it('should setup subscriptions when client and isEnabled are truthy', () => {
      renderHook(() =>
        useSSEInspector(mockClient, mockSSEInspector, true, false),
      );

      expect(mockClient.onMessage).toHaveBeenCalledWith(
        'network-enable',
        expect.any(Function),
      );
      expect(mockClient.onMessage).toHaveBeenCalledWith(
        'network-disable',
        expect.any(Function),
      );
    });

    it('should enable inspector on mount when recording is enabled', () => {
      renderHook(() =>
        useSSEInspector(mockClient, mockSSEInspector, true, true),
      );

      expect(mockSSEInspector.enable).toHaveBeenCalledTimes(1);
    });

    it('should not enable inspector on mount when recording is disabled', () => {
      renderHook(() =>
        useSSEInspector(mockClient, mockSSEInspector, true, false),
      );

      expect(mockSSEInspector.enable).not.toHaveBeenCalled();
    });
  });

  describe('network-enable message', () => {
    it('should enable inspector when network-enable message is received', () => {
      renderHook(() =>
        useSSEInspector(mockClient, mockSSEInspector, true, false),
      );

      (mockClient as any).triggerMessage('network-enable');

      expect(mockSSEInspector.enable).toHaveBeenCalledTimes(1);
    });

    it('should handle multiple enable calls', () => {
      renderHook(() =>
        useSSEInspector(mockClient, mockSSEInspector, true, false),
      );

      (mockClient as any).triggerMessage('network-enable');
      (mockClient as any).triggerMessage('network-enable');
      (mockClient as any).triggerMessage('network-enable');

      expect(mockSSEInspector.enable).toHaveBeenCalledTimes(3);
    });
  });

  describe('network-disable message', () => {
    it('should disable inspector when network-disable message is received', () => {
      renderHook(() =>
        useSSEInspector(mockClient, mockSSEInspector, true, false),
      );

      (mockClient as any).triggerMessage('network-disable');

      expect(mockSSEInspector.disable).toHaveBeenCalledTimes(1);
    });

    it('should handle multiple disable calls', () => {
      renderHook(() =>
        useSSEInspector(mockClient, mockSSEInspector, true, false),
      );

      (mockClient as any).triggerMessage('network-disable');
      (mockClient as any).triggerMessage('network-disable');

      expect(mockSSEInspector.disable).toHaveBeenCalledTimes(2);
    });
  });

  describe('cleanup', () => {
    it('should dispose inspector and remove subscriptions on unmount', () => {
      const { unmount } = renderHook(() =>
        useSSEInspector(mockClient, mockSSEInspector, true, false),
      );

      unmount();

      expect(mockSSEInspector.dispose).toHaveBeenCalledTimes(1);
    });

    it('should cleanup when dependencies change', () => {
      const { rerender } = renderHook(
        ({ enabled }: { enabled: boolean }) =>
          useSSEInspector(mockClient, mockSSEInspector, enabled, false),
        { initialProps: { enabled: true } },
      );

      expect(mockSSEInspector.dispose).not.toHaveBeenCalled();

      // Change isEnabled to false, triggering cleanup of previous effect
      rerender({ enabled: false });

      expect(mockSSEInspector.dispose).toHaveBeenCalledTimes(1);
    });

    it('should cleanup when client changes', () => {
      const newMockClient = createMockClient();

      const { rerender } = renderHook(
        ({ client }: { client: ReturnType<typeof createMockClient> }) =>
          useSSEInspector(client, mockSSEInspector, true, false),
        { initialProps: { client: mockClient } },
      );

      expect(mockSSEInspector.dispose).not.toHaveBeenCalled();

      // Change client, triggering cleanup of previous effect
      rerender({ client: newMockClient });

      expect(mockSSEInspector.dispose).toHaveBeenCalledTimes(1);
    });
  });

  describe('hot reload support', () => {
    it('should re-enable inspector on mount when recording was previously enabled', () => {
      renderHook(() =>
        useSSEInspector(mockClient, mockSSEInspector, true, true),
      );

      expect(mockSSEInspector.enable).toHaveBeenCalledTimes(1);
    });

    it('should handle enable/disable cycles correctly', () => {
      renderHook(() =>
        useSSEInspector(mockClient, mockSSEInspector, true, false),
      );

      // Simulate enable/disable cycle
      (mockClient as any).triggerMessage('network-enable');
      expect(mockSSEInspector.enable).toHaveBeenCalledTimes(1);

      (mockClient as any).triggerMessage('network-disable');
      expect(mockSSEInspector.disable).toHaveBeenCalledTimes(1);

      (mockClient as any).triggerMessage('network-enable');
      expect(mockSSEInspector.enable).toHaveBeenCalledTimes(2);
    });
  });

  describe('edge cases', () => {
    it('should handle inspector changing between renders', () => {
      const newMockSSEInspector = createMockSSEInspector();

      const { rerender } = renderHook(
        ({
          inspector,
        }: {
          inspector: ReturnType<typeof createMockSSEInspector>;
        }) => useSSEInspector(mockClient, inspector, true, false),
        { initialProps: { inspector: mockSSEInspector } },
      );

      expect(mockSSEInspector.dispose).not.toHaveBeenCalled();

      rerender({ inspector: newMockSSEInspector });

      // Old inspector should be disposed
      expect(mockSSEInspector.dispose).toHaveBeenCalledTimes(1);
      // New inspector should not be disposed
      expect(newMockSSEInspector.dispose).not.toHaveBeenCalled();
    });

    it('should handle recording state changing between renders', () => {
      const { rerender } = renderHook(
        ({ recording }: { recording: boolean }) =>
          useSSEInspector(mockClient, mockSSEInspector, true, recording),
        { initialProps: { recording: false } },
      );

      expect(mockSSEInspector.enable).not.toHaveBeenCalled();

      // Change recording state to true
      rerender({ recording: true });

      // Inspector should be enabled when effect re-runs
      expect(mockSSEInspector.enable).toHaveBeenCalledTimes(1);
    });

    it('should not interfere when both client and isEnabled become falsy', () => {
      const { rerender } = renderHook(
        ({
          client,
          enabled,
        }: {
          client: ReturnType<typeof createMockClient> | null;
          enabled: boolean;
        }) => useSSEInspector(client, mockSSEInspector, enabled, false),
        { initialProps: { client: mockClient, enabled: true } },
      );

      // First dispose from changing to disabled
      rerender({ client: mockClient, enabled: false });
      expect(mockSSEInspector.dispose).toHaveBeenCalledTimes(1);

      // No additional dispose when client becomes null (effect doesn't run)
      rerender({ client: null, enabled: false });
      expect(mockSSEInspector.dispose).toHaveBeenCalledTimes(1);
    });
  });
});
