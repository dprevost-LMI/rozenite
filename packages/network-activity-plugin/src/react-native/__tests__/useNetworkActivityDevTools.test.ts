import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useNetworkActivityDevTools } from '../useNetworkActivityDevTools';
import type { NetworkActivityDevToolsConfig } from '../config';
import * as configModule from '../config';
import * as httpInspectorModule from '../useHttpInspector';
import * as webSocketInspectorModule from '../useWebSocketInspector';
import * as sseInspectorModule from '../useSSEInspector';
import * as httpInspector from '../http/http-inspector';
import * as websocketInspector from '../websocket/websocket-inspector';
import * as sseInspector from '../sse/sse-inspector';

// Mock all dependencies using vi.hoisted to ensure they're available during mocking
const mockUseRozeniteDevToolsClient = vi.hoisted(() => vi.fn(() => null));

// Create a shared mock return value for createNetworkInspectorsConfiguration
// so all calls (including module-level) get the same instance
const mockInspectorsConfig = vi.hoisted(() => ({
  eventsListener: {
    connect: vi.fn(),
    disconnect: vi.fn(),
    send: vi.fn(),
  },
  networkInspector: {
    http: {
      enable: vi.fn(),
      disable: vi.fn(),
      dispose: vi.fn(),
      isEnabled: vi.fn(),
      getNetworkRequestsRegistry: vi.fn(),
      on: vi.fn(),
    },
    websocket: {
      enable: vi.fn(),
      disable: vi.fn(),
      dispose: vi.fn(),
      isEnabled: vi.fn(),
      on: vi.fn(),
    },
    sse: {
      enable: vi.fn(),
      dispose: vi.fn(),
      disable: vi.fn(),
      isEnabled: vi.fn(),
      on: vi.fn(),
    },
  },
}));

vi.mock('@rozenite/plugin-bridge', () => ({
  useRozeniteDevToolsClient: mockUseRozeniteDevToolsClient,
}));

vi.mock('../config', async () => {
  const actual = await vi.importActual('../config');
  return {
    ...(actual as any),
    validateConfig: vi.fn(),
  };
});

vi.mock('../boot-recording', () => ({
  createNetworkInspectorsConfiguration: vi.fn(() => mockInspectorsConfig),
}));

vi.mock('../useHttpInspector', () => ({
  useHttpInspector: vi.fn(),
}));

vi.mock('../useWebSocketInspector', () => ({
  useWebSocketInspector: vi.fn(),
}));

vi.mock('../useSSEInspector', () => ({
  useSSEInspector: vi.fn(),
}));

vi.mock('../http/http-inspector', () => ({
  isHttpEvent: vi.fn((type: string) =>
    ['request-sent', 'response-received', 'request-completed'].includes(type),
  ),
}));

vi.mock('../websocket/websocket-inspector', () => ({
  isWebSocketEvent: vi.fn((type: string) =>
    ['websocket-opened', 'websocket-closed'].includes(type),
  ),
}));

vi.mock('../sse/sse-inspector', () => ({
  isSSEEvent: vi.fn((type: string) =>
    ['sse-opened', 'sse-closed'].includes(type),
  ),
}));

import { createMockClient } from './test-utils';

describe('useNetworkActivityDevTools', () => {
  let mockClient: ReturnType<typeof createMockClient>;

  beforeEach(() => {
    mockClient = createMockClient();
    vi.clearAllMocks();

    // Setup the mock to return our mock client
    mockUseRozeniteDevToolsClient.mockReturnValue(mockClient);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('initialization', () => {
    it('should return the client', () => {
      const { result } = renderHook(() => useNetworkActivityDevTools());

      expect(result.current).toBe(mockClient);
    });

    it('should use default config when no config is provided', () => {
      const validateConfig = vi.mocked(configModule.validateConfig);

      renderHook(() => useNetworkActivityDevTools());

      expect(validateConfig).toHaveBeenCalled();
    });

    it('should validate config when provided', () => {
      const validateConfig = vi.mocked(configModule.validateConfig);
      const config: NetworkActivityDevToolsConfig = {
        inspectors: { http: true, websocket: false, sse: false },
      };

      renderHook(() => useNetworkActivityDevTools(config));

      expect(validateConfig).toHaveBeenCalledWith(config);
    });

    it('should not setup when client is null', () => {
      mockUseRozeniteDevToolsClient.mockReturnValue(null);
      const validateConfig = vi.mocked(configModule.validateConfig);

      renderHook(() => useNetworkActivityDevTools());

      expect(mockClient.onMessage).not.toHaveBeenCalled();
      expect(validateConfig).not.toHaveBeenCalled();
    });
  });

  describe('inspector hooks integration', () => {
    it('should call useHttpInspector with correct parameters', () => {
      const useHttpInspector = vi.mocked(httpInspectorModule.useHttpInspector);

      renderHook(() => useNetworkActivityDevTools());

      expect(useHttpInspector).toHaveBeenCalledWith(
        mockClient,
        mockInspectorsConfig.networkInspector.http,
        true, // default enabled
        false, // initial recording state
      );
    });

    it('should call useWebSocketInspector with correct parameters', () => {
      const useWebSocketInspector = vi.mocked(
        webSocketInspectorModule.useWebSocketInspector,
      );

      renderHook(() => useNetworkActivityDevTools());

      expect(useWebSocketInspector).toHaveBeenCalledWith(
        mockClient,
        mockInspectorsConfig.networkInspector.websocket,
        true, // default enabled
        false, // initial recording state
      );
    });

    it('should call useSSEInspector with correct parameters', () => {
      const useSSEInspector = vi.mocked(sseInspectorModule.useSSEInspector);

      renderHook(() => useNetworkActivityDevTools());

      expect(useSSEInspector).toHaveBeenCalledWith(
        mockClient,
        mockInspectorsConfig.networkInspector.sse,
        true, // default enabled
        false, // initial recording state
      );
    });

    it('should respect inspector config settings', () => {
      const useHttpInspector = vi.mocked(httpInspectorModule.useHttpInspector);
      const useWebSocketInspector = vi.mocked(
        webSocketInspectorModule.useWebSocketInspector,
      );
      const useSSEInspector = vi.mocked(sseInspectorModule.useSSEInspector);

      const config: NetworkActivityDevToolsConfig = {
        inspectors: {
          http: false,
          websocket: true,
          sse: false,
        },
      };

      renderHook(() => useNetworkActivityDevTools(config));

      expect(useHttpInspector).toHaveBeenCalledWith(
        expect.anything(),
        expect.anything(),
        false, // disabled
        expect.anything(),
      );
      expect(useWebSocketInspector).toHaveBeenCalledWith(
        expect.anything(),
        expect.anything(),
        true, // enabled
        expect.anything(),
      );
      expect(useSSEInspector).toHaveBeenCalledWith(
        expect.anything(),
        expect.anything(),
        false, // disabled
        expect.anything(),
      );
    });
  });

  describe('network-enable message', () => {
    it('should set recording state to true', () => {
      renderHook(() => useNetworkActivityDevTools());

      (mockClient as any).triggerMessage('network-enable');

      // We can't directly test ref value, but subsequent re-renders would use it
      expect(mockClient.onMessage).toHaveBeenCalledWith(
        'network-enable',
        expect.any(Function),
      );
    });

    it('should connect events listener with filter', () => {
      renderHook(() => useNetworkActivityDevTools());

      (mockClient as any).triggerMessage('network-enable');

      expect(mockInspectorsConfig.eventsListener.connect).toHaveBeenCalledWith(
        mockClient.send,
        expect.any(Function),
      );
    });

    it('should filter events based on inspector configuration', () => {
      const config: NetworkActivityDevToolsConfig = {
        inspectors: { http: false, websocket: true, sse: false },
      };

      renderHook(() => useNetworkActivityDevTools(config));

      (mockClient as any).triggerMessage('network-enable');

      // Get the filter function that was passed to connect
      const filterFn =
        mockInspectorsConfig.eventsListener.connect.mock.calls[0][1];

      // Test HTTP event (should be filtered out)
      const isHttpEvent = vi.mocked(httpInspector.isHttpEvent);
      isHttpEvent.mockReturnValue(true);
      expect(filterFn({ type: 'request-sent' })).toBe(false);

      // Test WebSocket event (should pass through)
      isHttpEvent.mockReturnValue(false);
      const isWebSocketEvent = vi.mocked(websocketInspector.isWebSocketEvent);
      isWebSocketEvent.mockReturnValue(true);
      expect(filterFn({ type: 'websocket-opened' })).toBe(true);

      // Test unknown event (should pass through by default)
      isWebSocketEvent.mockReturnValue(false);
      const isSSEEvent = vi.mocked(sseInspector.isSSEEvent);
      isSSEEvent.mockReturnValue(false);
      expect(filterFn({ type: 'unknown-event' })).toBe(true);
    });
  });

  describe('network-disable message', () => {
    it('should set recording state to false', () => {
      renderHook(() => useNetworkActivityDevTools());

      (mockClient as any).triggerMessage('network-disable');

      expect(mockClient.onMessage).toHaveBeenCalledWith(
        'network-disable',
        expect.any(Function),
      );
    });
  });

  describe('client UI settings', () => {
    it('should send initial UI settings', () => {
      renderHook(() => useNetworkActivityDevTools());

      expect(mockClient.send).toHaveBeenCalledWith('client-ui-settings', {
        settings: {
          showUrlAsName: false, // default value
        },
      });
    });

    it('should send custom UI settings', () => {
      const config: NetworkActivityDevToolsConfig = {
        clientUISettings: {
          showUrlAsName: true,
        },
      };

      renderHook(() => useNetworkActivityDevTools(config));

      expect(mockClient.send).toHaveBeenCalledWith('client-ui-settings', {
        settings: {
          showUrlAsName: true,
        },
      });
    });

    it('should respond to get-client-ui-settings message', () => {
      const config: NetworkActivityDevToolsConfig = {
        clientUISettings: {
          showUrlAsName: true,
        },
      };

      renderHook(() => useNetworkActivityDevTools(config));

      // Clear the initial send call
      vi.clearAllMocks();

      (mockClient as any).triggerMessage('get-client-ui-settings');

      expect(mockClient.send).toHaveBeenCalledWith('client-ui-settings', {
        settings: {
          showUrlAsName: true,
        },
      });
    });
  });

  describe('cleanup', () => {
    it('should remove all subscriptions on unmount', () => {
      const removeFn = vi.fn();
      (mockClient.onMessage as any).mockReturnValue({ remove: removeFn });

      const { unmount } = renderHook(() => useNetworkActivityDevTools());

      unmount();

      // Should have removed subscriptions for network-enable, network-disable, and get-client-ui-settings
      expect(removeFn).toHaveBeenCalled();
    });

    it('should re-setup subscriptions when dependencies change', () => {
      const config1: NetworkActivityDevToolsConfig = {
        clientUISettings: { showUrlAsName: false },
      };
      const config2: NetworkActivityDevToolsConfig = {
        clientUISettings: { showUrlAsName: true },
      };

      const { rerender } = renderHook(
        ({ config }) => useNetworkActivityDevTools(config),
        { initialProps: { config: config1 } },
      );

      const initialCallCount = mockClient.onMessage.mock.calls.length;

      rerender({ config: config2 });

      // Should have setup new subscriptions
      expect(mockClient.onMessage.mock.calls.length).toBeGreaterThan(
        initialCallCount,
      );
    });
  });

  describe('edge cases', () => {
    it('should handle partial inspector config', () => {
      const config: NetworkActivityDevToolsConfig = {
        inspectors: { http: false, sse: false },
        // websocket should default to true
      };

      const useHttpInspector = vi.mocked(httpInspectorModule.useHttpInspector);
      const useWebSocketInspector = vi.mocked(
        webSocketInspectorModule.useWebSocketInspector,
      );
      const useSSEInspector = vi.mocked(sseInspectorModule.useSSEInspector);

      renderHook(() => useNetworkActivityDevTools(config));

      expect(useHttpInspector).toHaveBeenCalledWith(
        expect.anything(),
        expect.anything(),
        false,
        expect.anything(),
      );
      expect(useWebSocketInspector).toHaveBeenCalledWith(
        expect.anything(),
        expect.anything(),
        true,
        expect.anything(),
      );
      expect(useSSEInspector).toHaveBeenCalledWith(
        expect.anything(),
        expect.anything(),
        false,
        expect.anything(),
      );
    });

    it('should handle empty config object', () => {
      const useHttpInspector = vi.mocked(httpInspectorModule.useHttpInspector);

      renderHook(() => useNetworkActivityDevTools({}));

      // All should default to enabled
      expect(useHttpInspector).toHaveBeenCalledWith(
        expect.anything(),
        expect.anything(),
        true,
        expect.anything(),
      );
    });
  });
});
