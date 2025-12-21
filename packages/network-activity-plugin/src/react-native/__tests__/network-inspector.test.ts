import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NetworkInspector, getNetworkInspector } from '../network-inspector';
import { HTTP_EVENTS } from '../http/http-inspector';
import { SSE_EVENTS } from '../sse/sse-inspector';
import { WEBSOCKET_EVENTS } from '../websocket/websocket-inspector';

const mockHttpInspector = {
  on: vi.fn(),
  enable: vi.fn(),
  disable: vi.fn(),
  dispose: vi.fn(),
};

const mockSseInspector = {
  on: vi.fn(),
  enable: vi.fn(),
  disable: vi.fn(),
  dispose: vi.fn(),
};

const mockWebsocketInspector = {
  on: vi.fn(),
  enable: vi.fn(),
  disable: vi.fn(),
  dispose: vi.fn(),
};

vi.mock('../http/http-inspector', () => ({
  getHTTPInspector: () => mockHttpInspector,
  HTTP_EVENTS: ['request-sent', 'response-received', 'request-completed'],
}));

vi.mock('../sse/sse-inspector', () => ({
  getSSEInspector: () => mockSseInspector,
  SSE_EVENTS: ['sse-opened', 'sse-closed'],
}));

vi.mock('../websocket/websocket-inspector', () => ({
  getWebSocketInspector: () => mockWebsocketInspector,
  WEBSOCKET_EVENTS: ['websocket-opened', 'websocket-closed'],
}));

describe('NetworkInspector', () => {
  let networkInspector: NetworkInspector;

  beforeEach(() => {
    vi.clearAllMocks();
    // Reset the singleton if possible, or just create a new instance if we exported the class
    // Since we exported the class, we can instantiate it directly for testing
    networkInspector = new NetworkInspector();
  });

  it('should initialize inspectors', () => {
    expect(networkInspector.http).toBe(mockHttpInspector);
    expect(networkInspector.sse).toBe(mockSseInspector);
    expect(networkInspector.websocket).toBe(mockWebsocketInspector);
  });

  describe('setup', () => {
    it('should subscribe to all events', () => {
      const mockEventsListener = {
        send: vi.fn(),
      };

      networkInspector.setup(mockEventsListener as any);

      // Check HTTP subscriptions
      expect(mockHttpInspector.on).toHaveBeenCalledTimes(3); // 3 HTTP events
      expect(mockHttpInspector.on).toHaveBeenCalledWith(
        'request-sent',
        expect.any(Function),
      );

      // Check SSE subscriptions
      expect(mockSseInspector.on).toHaveBeenCalledTimes(2); // 2 SSE events

      // Check WebSocket subscriptions
      expect(mockWebsocketInspector.on).toHaveBeenCalledTimes(2); // 2 WebSocket events
    });

    it('should forward events to listener', () => {
      const mockEventsListener = {
        send: vi.fn(),
      };

      networkInspector.setup(mockEventsListener as any);

      // Simulate HTTP event
      const httpCallback = mockHttpInspector.on.mock.calls.find(
        (call) => call[0] === 'request-sent',
      )[1];
      const httpData = { id: '1', type: 'request-sent' };
      httpCallback(httpData);
      expect(mockEventsListener.send).toHaveBeenCalledWith(
        'request-sent',
        httpData,
      );

      // Simulate SSE event
      const sseCallback = mockSseInspector.on.mock.calls.find(
        (call) => call[0] === 'sse-opened',
      )[1];
      const sseData = { id: '2', type: 'sse-opened' };
      sseCallback(sseData);
      expect(mockEventsListener.send).toHaveBeenCalledWith(
        'sse-opened',
        sseData,
      );

      // Simulate WebSocket event
      const wsCallback = mockWebsocketInspector.on.mock.calls.find(
        (call) => call[0] === 'websocket-opened',
      )[1];
      const wsData = { id: '3', type: 'websocket-opened' };
      wsCallback(wsData);
      expect(mockEventsListener.send).toHaveBeenCalledWith(
        'websocket-opened',
        wsData,
      );
    });
  });

  describe('enable', () => {
    it('should enable all inspectors by default', () => {
      networkInspector.enable();
      expect(mockHttpInspector.enable).toHaveBeenCalled();
      expect(mockSseInspector.enable).toHaveBeenCalled();
      expect(mockWebsocketInspector.enable).toHaveBeenCalled();
    });

    it('should enable specific inspectors based on config', () => {
      networkInspector.enable({ http: true, sse: false, websocket: false });
      expect(mockHttpInspector.enable).toHaveBeenCalled();
      expect(mockSseInspector.enable).not.toHaveBeenCalled();
      expect(mockWebsocketInspector.enable).not.toHaveBeenCalled();
    });
  });

  describe('disable', () => {
    it('should disable all inspectors', () => {
      networkInspector.disable();
      expect(mockHttpInspector.disable).toHaveBeenCalled();
      expect(mockSseInspector.disable).toHaveBeenCalled();
      expect(mockWebsocketInspector.disable).toHaveBeenCalled();
    });
  });

  describe('dispose', () => {
    it('should dispose all inspectors', () => {
      networkInspector.dispose();
      expect(mockHttpInspector.dispose).toHaveBeenCalled();
      expect(mockSseInspector.dispose).toHaveBeenCalled();
      expect(mockWebsocketInspector.dispose).toHaveBeenCalled();
    });
  });

  describe('getNetworkInspector', () => {
    it('should return a singleton instance', () => {
      const instance1 = getNetworkInspector();
      const instance2 = getNetworkInspector();
      expect(instance1).toBe(instance2);
      expect(instance1).toBeInstanceOf(NetworkInspector);
    });
  });
});
