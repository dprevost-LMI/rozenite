import { vi } from 'vitest';
import type { NetworkActivityDevToolsClient } from '../../shared/client';

/**
 * Creates a mock DevTools client for testing
 */
export const createMockClient = (): NetworkActivityDevToolsClient => {
  const messageHandlers = new Map<string, Array<(data: unknown) => void>>();

  const client: NetworkActivityDevToolsClient = {
    send: vi.fn(),
    close: vi.fn(),
    // @ts-expect-error: Partial mock
    onMessage: vi.fn((event: string, handler: (data: unknown) => void) => {
      if (!messageHandlers.has(event)) {
        messageHandlers.set(event, []);
      }
      const handlers = messageHandlers.get(event);
      if (handlers) {
        handlers.push(handler);
      }

      return {
        remove: vi.fn(() => {
          const handlers = messageHandlers.get(event);
          if (handlers) {
            const index = handlers.indexOf(handler);
            if (index > -1) {
              handlers.splice(index, 1);
            }
          }
        }),
      };
    }),
  };

  // Add method to trigger message handlers for testing
  (client as NetworkActivityDevToolsClient & {
    triggerMessage: (event: string, data?: unknown) => void;
  }).triggerMessage = (event: string, data?: unknown) => {
    const handlers = messageHandlers.get(event);
    if (handlers) {
      handlers.forEach((handler) => handler(data));
    }
  };

  return client;
};

/**
 * Creates a mock HTTP inspector
 */
export const createMockHttpInspector = () => ({
  enable: vi.fn(),
  disable: vi.fn(),
  dispose: vi.fn(),
  isEnabled: vi.fn(() => false),
  getNetworkRequestsRegistry: vi.fn(() => ({
    addEntry: vi.fn(),
    getEntry: vi.fn(),
    removeEntry: vi.fn(),
    clear: vi.fn(),
    getEntries: vi.fn(() => new Map()),
  })),
  on: vi.fn(),
});

/**
 * Creates a mock WebSocket inspector
 */
export const createMockWebSocketInspector = () => ({
  enable: vi.fn(),
  disable: vi.fn(),
  dispose: vi.fn(),
  isEnabled: vi.fn(() => false),
  on: vi.fn(),
});

/**
 * Creates a mock SSE inspector
 */
export const createMockSSEInspector = () => ({
  enable: vi.fn(),
  disable: vi.fn(),
  dispose: vi.fn(),
  isEnabled: vi.fn(() => false),
  on: vi.fn(),
});

/**
 * Creates a mock XMLHttpRequest for testing
 */
export const createMockXMLHttpRequest = () => {
  const eventListeners = new Map<string, Array<EventListener>>();

  return {
    status: 200,
    statusText: 'OK',
    responseType: '',
    response: null,
    responseText: '',
    readyState: 4,
    _url: 'https://api.example.com/test',
    _method: 'GET',
    _headers: {},
    _rozeniteRequestId: undefined,
    responseHeaders: {},
    addEventListener: vi.fn((event: string, listener: EventListener) => {
      if (!eventListeners.has(event)) {
        eventListeners.set(event, []);
      }
      const listeners = eventListeners.get(event);
      if (listeners) {
        listeners.push(listener);
      }
    }),
    getResponseHeader: vi.fn(() => null),
    triggerEvent: (event: string, data?: any) => {
      const listeners = eventListeners.get(event);
      if (listeners) {
        listeners.forEach((listener) => listener(data || ({} as Event)));
      }
    },
  };
};

/**
 * Creates mock overrides registry
 */
export const createMockOverridesRegistry = () => ({
  setOverrides: vi.fn(),
  getOverrideForUrl: vi.fn(),
  clear: vi.fn(),
});

/**
 * Wait for next tick (useful for async operations)
 */
export const waitForNextTick = () =>
  new Promise((resolve) => setTimeout(resolve, 0));
