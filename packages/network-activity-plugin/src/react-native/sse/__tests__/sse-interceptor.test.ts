import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { SSEInterceptor } from '../sse-interceptor';
import { getEventSource } from '../event-source';

// Mock getEventSource
vi.mock('../event-source', () => {
  class MockEventSource {
    url: string;
    listeners: Record<string, ((...args: any[]) => any)[]> = {};

    constructor(url: string) {
      this.url = url;
    }
    open() {
      /* noop */
    }
    dispatch(type: string, event: any) {
      if (this.listeners[type]) {
        this.listeners[type].forEach((listener) => listener(event));
      }
    }
    close() {
      /* noop */
    }
    addEventListener(type: string, listener: (...args: any[]) => any) {
      if (!this.listeners[type]) {
        this.listeners[type] = [];
      }
      this.listeners[type].push(listener);
    }
    removeEventListener(type: string, listener: (...args: any[]) => any) {
      if (this.listeners[type]) {
        this.listeners[type] = this.listeners[type].filter(
          (l) => l !== listener,
        );
      }
    }
    removeAllEventListeners() {
      this.listeners = {};
    }
  }
  return {
    getEventSource: vi.fn().mockReturnValue(MockEventSource),
  };
});

describe('SSEInterceptor', () => {
  let MockEventSource: any;

  beforeEach(() => {
    MockEventSource = getEventSource();
    vi.clearAllMocks();
  });

  afterEach(() => {
    SSEInterceptor.disableInterception();
  });

  it('should enable interception', () => {
    SSEInterceptor.enableInterception();
    expect(SSEInterceptor.isInterceptorEnabled()).toBe(true);
  });

  it('should not re-enable interception if already enabled', () => {
    SSEInterceptor.enableInterception();
    const originalOpen = MockEventSource.prototype.open;

    // Try to enable again
    SSEInterceptor.enableInterception();

    // Should be the same function (not wrapped twice)
    expect(MockEventSource.prototype.open).toBe(originalOpen);
  });

  it('should disable interception', () => {
    SSEInterceptor.enableInterception();
    SSEInterceptor.disableInterception();
    expect(SSEInterceptor.isInterceptorEnabled()).toBe(false);
  });

  it('should intercept open calls', () => {
    const connectCallback = vi.fn();
    SSEInterceptor.setConnectCallback(connectCallback);
    SSEInterceptor.enableInterception();

    const eventSource = new MockEventSource('https://example.com');
    eventSource.open();

    expect(connectCallback).toHaveBeenCalledWith(
      'https://example.com',
      eventSource,
    );
  });

  it('should intercept dispatch calls for messages', () => {
    const messageCallback = vi.fn();
    SSEInterceptor.setMessageCallback(messageCallback);
    SSEInterceptor.enableInterception();

    const eventSource = new MockEventSource('https://example.com');
    const event = { type: 'message', data: 'test' };
    eventSource.dispatch('message', event);

    expect(messageCallback).toHaveBeenCalledWith(event, eventSource);
  });

  it('should intercept dispatch calls for errors', () => {
    const errorCallback = vi.fn();
    SSEInterceptor.setErrorCallback(errorCallback);
    SSEInterceptor.enableInterception();

    const eventSource = new MockEventSource('https://example.com');
    eventSource.open(); // Attach listeners
    const event = { type: 'error', message: 'test error' };
    eventSource.dispatch('error', event);

    expect(errorCallback).toHaveBeenCalledWith(event, eventSource);
  });

  it('should intercept dispatch calls for open events', () => {
    const openEventCallback = vi.fn();
    SSEInterceptor.setOpenEventCallback(openEventCallback);
    SSEInterceptor.enableInterception();

    const eventSource = new MockEventSource('https://example.com');
    eventSource.open(); // Attach listeners
    const event = { type: 'open' };
    eventSource.dispatch('open', event);

    expect(openEventCallback).toHaveBeenCalledWith(event, eventSource);
  });

  it('should intercept dispatch calls for close events', () => {
    const closeCallback = vi.fn();
    SSEInterceptor.setCloseCallback(closeCallback);
    SSEInterceptor.enableInterception();

    const eventSource = new MockEventSource('https://example.com');
    eventSource.open(); // Attach listeners
    const event = { type: 'close' };
    eventSource.dispatch('close', event);

    expect(closeCallback).toHaveBeenCalledWith(event, eventSource);
  });
});
