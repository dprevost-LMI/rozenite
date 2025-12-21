import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getWebSocketInspector, isWebSocketEvent } from '../websocket-inspector';
import { getWebSocketInterceptor } from '../websocket-interceptor';

// Mock getWebSocketInterceptor
vi.mock('../websocket-interceptor', () => ({
  getWebSocketInterceptor: vi.fn().mockReturnValue({
    setConnectCallback: vi.fn(),
    setCloseCallback: vi.fn(),
    setOnMessageCallback: vi.fn(),
    setOnErrorCallback: vi.fn(),
    setSendCallback: vi.fn(),
    setOnOpenCallback: vi.fn(),
    setOnCloseCallback: vi.fn(),
    enableInterception: vi.fn(),
    disableInterception: vi.fn(),
    isInterceptorEnabled: vi.fn(),
  }),
}));

describe('WebSocketInspector', () => {
  let mockInterceptor: any;

  beforeEach(() => {
    vi.clearAllMocks();
    mockInterceptor = getWebSocketInterceptor();
  });

  it('should identify websocket events correctly', () => {
    expect(isWebSocketEvent('websocket-connect')).toBe(true);
    expect(isWebSocketEvent('websocket-open')).toBe(true);
    expect(isWebSocketEvent('websocket-close')).toBe(true);
    expect(isWebSocketEvent('websocket-message-sent')).toBe(true);
    expect(isWebSocketEvent('websocket-message-received')).toBe(true);
    expect(isWebSocketEvent('websocket-error')).toBe(true);
    expect(isWebSocketEvent('websocket-connection-status-changed')).toBe(true);
    expect(isWebSocketEvent('random-event')).toBe(false);
  });

  it('should create an inspector instance', () => {
    const inspector = getWebSocketInspector();
    expect(inspector).toBeDefined();
    expect(inspector.enable).toBeDefined();
    expect(inspector.disable).toBeDefined();
  });

  it('should enable interception when enable is called', () => {
    const inspector = getWebSocketInspector();
    vi.mocked(mockInterceptor.isInterceptorEnabled).mockReturnValue(false);

    inspector.enable();

    expect(mockInterceptor.setConnectCallback).toHaveBeenCalled();
    expect(mockInterceptor.setCloseCallback).toHaveBeenCalled();
    expect(mockInterceptor.setOnMessageCallback).toHaveBeenCalled();
    expect(mockInterceptor.setOnErrorCallback).toHaveBeenCalled();
    expect(mockInterceptor.setSendCallback).toHaveBeenCalled();
    expect(mockInterceptor.setOnOpenCallback).toHaveBeenCalled();
    expect(mockInterceptor.setOnCloseCallback).toHaveBeenCalled();
    expect(mockInterceptor.enableInterception).toHaveBeenCalled();
  });

  it('should check if enabled', () => {
    const inspector = getWebSocketInspector();
    vi.mocked(mockInterceptor.isInterceptorEnabled).mockReturnValue(true);
    expect(inspector.isEnabled()).toBe(true);

    vi.mocked(mockInterceptor.isInterceptorEnabled).mockReturnValue(false);
    expect(inspector.isEnabled()).toBe(false);
  });

  it('should disable interception when disable is called', () => {
    const inspector = getWebSocketInspector();
    inspector.disable();

    expect(mockInterceptor.disableInterception).toHaveBeenCalled();
  });

  it('should emit websocket-connect event', () => {
    const inspector = getWebSocketInspector();
    const listener = vi.fn();
    inspector.on('websocket-connect', listener);
    
    vi.mocked(mockInterceptor.isInterceptorEnabled).mockReturnValue(false);
    inspector.enable();

    const callback = vi.mocked(mockInterceptor.setConnectCallback).mock.calls[0][0];
    callback('ws://test.com', ['protocol'], ['option'], 123);

    expect(listener).toHaveBeenCalledWith(expect.objectContaining({
      type: 'websocket-connect',
      url: 'ws://test.com',
      socketId: 123,
      protocols: ['protocol'],
      options: ['option'],
    }));
  });

  it('should emit websocket-close event via setCloseCallback', () => {
    const inspector = getWebSocketInspector();
    const listener = vi.fn();
    inspector.on('websocket-close', listener);
    
    vi.mocked(mockInterceptor.isInterceptorEnabled).mockReturnValue(false);
    inspector.enable();

    // First connect to set the URL in the map
    const connectCallback = vi.mocked(mockInterceptor.setConnectCallback).mock.calls[0][0];
    connectCallback('ws://test.com', [], [], 123);

    const closeCallback = vi.mocked(mockInterceptor.setCloseCallback).mock.calls[0][0];
    closeCallback(1000, 'Normal Closure', 123);

    expect(listener).toHaveBeenCalledWith(expect.objectContaining({
      type: 'websocket-close',
      url: 'ws://test.com',
      socketId: 123,
      code: 1000,
      reason: 'Normal Closure',
    }));
  });

  it('should not emit websocket-close event via setCloseCallback if url is missing', () => {
    const inspector = getWebSocketInspector();
    const listener = vi.fn();
    inspector.on('websocket-close', listener);
    
    vi.mocked(mockInterceptor.isInterceptorEnabled).mockReturnValue(false);
    inspector.enable();

    const closeCallback = vi.mocked(mockInterceptor.setCloseCallback).mock.calls[0][0];
    closeCallback(1000, 'Normal Closure', 999); // Unknown socketId

    expect(listener).not.toHaveBeenCalled();
  });

  it('should emit websocket-message-received event', () => {
    const inspector = getWebSocketInspector();
    const listener = vi.fn();
    inspector.on('websocket-message-received', listener);
    
    vi.mocked(mockInterceptor.isInterceptorEnabled).mockReturnValue(false);
    inspector.enable();

    const connectCallback = vi.mocked(mockInterceptor.setConnectCallback).mock.calls[0][0];
    connectCallback('ws://test.com', [], [], 123);

    const messageCallback = vi.mocked(mockInterceptor.setOnMessageCallback).mock.calls[0][0];
    messageCallback('hello', 123);

    expect(listener).toHaveBeenCalledWith(expect.objectContaining({
      type: 'websocket-message-received',
      url: 'ws://test.com',
      socketId: 123,
      data: 'hello',
      messageType: 'text',
    }));
  });

  it('should emit websocket-close event with default code and reason', () => {
    const inspector = getWebSocketInspector();
    const listener = vi.fn();
    inspector.on('websocket-close', listener);
    
    vi.mocked(mockInterceptor.isInterceptorEnabled).mockReturnValue(false);
    inspector.enable();

    const connectCallback = vi.mocked(mockInterceptor.setConnectCallback).mock.calls[0][0];
    connectCallback('ws://test.com', [], [], 123);

    const closeCallback = vi.mocked(mockInterceptor.setCloseCallback).mock.calls[0][0];
    closeCallback(null, null, 123);

    expect(listener).toHaveBeenCalledWith(expect.objectContaining({
      type: 'websocket-close',
      url: 'ws://test.com',
      socketId: 123,
      code: 0,
      reason: undefined,
    }));
  });

  it('should emit websocket-message-received event with binary data', () => {
    const inspector = getWebSocketInspector();
    const listener = vi.fn();
    inspector.on('websocket-message-received', listener);
    
    vi.mocked(mockInterceptor.isInterceptorEnabled).mockReturnValue(false);
    inspector.enable();

    const connectCallback = vi.mocked(mockInterceptor.setConnectCallback).mock.calls[0][0];
    connectCallback('ws://test.com', [], [], 123);

    const messageCallback = vi.mocked(mockInterceptor.setOnMessageCallback).mock.calls[0][0];
    const binaryData = new ArrayBuffer(8);
    messageCallback(binaryData, 123);

    expect(listener).toHaveBeenCalledWith(expect.objectContaining({
      type: 'websocket-message-received',
      url: 'ws://test.com',
      socketId: 123,
      data: binaryData,
      messageType: 'binary',
    }));
  });

  it('should emit websocket-message-sent event with binary data', () => {
    const inspector = getWebSocketInspector();
    const listener = vi.fn();
    inspector.on('websocket-message-sent', listener);
    
    vi.mocked(mockInterceptor.isInterceptorEnabled).mockReturnValue(false);
    inspector.enable();

    const connectCallback = vi.mocked(mockInterceptor.setConnectCallback).mock.calls[0][0];
    connectCallback('ws://test.com', [], [], 123);

    const sendCallback = vi.mocked(mockInterceptor.setSendCallback).mock.calls[0][0];
    const binaryData = new ArrayBuffer(8);
    sendCallback(binaryData, 123);

    expect(listener).toHaveBeenCalledWith(expect.objectContaining({
      type: 'websocket-message-sent',
      url: 'ws://test.com',
      socketId: 123,
      data: binaryData,
      messageType: 'binary',
    }));
  });

  it('should not emit websocket-message-received event if url is missing', () => {
    const inspector = getWebSocketInspector();
    const listener = vi.fn();
    inspector.on('websocket-message-received', listener);
    
    vi.mocked(mockInterceptor.isInterceptorEnabled).mockReturnValue(false);
    inspector.enable();

    const messageCallback = vi.mocked(mockInterceptor.setOnMessageCallback).mock.calls[0][0];
    messageCallback('hello', 999);

    expect(listener).not.toHaveBeenCalled();
  });

  it('should emit websocket-error event', () => {
    const inspector = getWebSocketInspector();
    const listener = vi.fn();
    inspector.on('websocket-error', listener);
    
    vi.mocked(mockInterceptor.isInterceptorEnabled).mockReturnValue(false);
    inspector.enable();

    const connectCallback = vi.mocked(mockInterceptor.setConnectCallback).mock.calls[0][0];
    connectCallback('ws://test.com', [], [], 123);

    const errorCallback = vi.mocked(mockInterceptor.setOnErrorCallback).mock.calls[0][0];
    errorCallback('error message', 123);

    expect(listener).toHaveBeenCalledWith(expect.objectContaining({
      type: 'websocket-error',
      url: 'ws://test.com',
      socketId: 123,
      error: 'error message',
    }));
  });

  it('should not emit websocket-error event if url is missing', () => {
    const inspector = getWebSocketInspector();
    const listener = vi.fn();
    inspector.on('websocket-error', listener);
    
    vi.mocked(mockInterceptor.isInterceptorEnabled).mockReturnValue(false);
    inspector.enable();

    const errorCallback = vi.mocked(mockInterceptor.setOnErrorCallback).mock.calls[0][0];
    errorCallback('error message', 999);

    expect(listener).not.toHaveBeenCalled();
  });

  it('should emit websocket-message-sent event', () => {
    const inspector = getWebSocketInspector();
    const listener = vi.fn();
    inspector.on('websocket-message-sent', listener);
    
    vi.mocked(mockInterceptor.isInterceptorEnabled).mockReturnValue(false);
    inspector.enable();

    const connectCallback = vi.mocked(mockInterceptor.setConnectCallback).mock.calls[0][0];
    connectCallback('ws://test.com', [], [], 123);

    const sendCallback = vi.mocked(mockInterceptor.setSendCallback).mock.calls[0][0];
    sendCallback('sent data', 123);

    expect(listener).toHaveBeenCalledWith(expect.objectContaining({
      type: 'websocket-message-sent',
      url: 'ws://test.com',
      socketId: 123,
      data: 'sent data',
      messageType: 'text',
    }));
  });

  it('should not emit websocket-message-sent event if url is missing', () => {
    const inspector = getWebSocketInspector();
    const listener = vi.fn();
    inspector.on('websocket-message-sent', listener);
    
    vi.mocked(mockInterceptor.isInterceptorEnabled).mockReturnValue(false);
    inspector.enable();

    const sendCallback = vi.mocked(mockInterceptor.setSendCallback).mock.calls[0][0];
    sendCallback('sent data', 999);

    expect(listener).not.toHaveBeenCalled();
  });

  it('should emit websocket-open event', () => {
    const inspector = getWebSocketInspector();
    const listener = vi.fn();
    inspector.on('websocket-open', listener);
    
    vi.mocked(mockInterceptor.isInterceptorEnabled).mockReturnValue(false);
    inspector.enable();

    const connectCallback = vi.mocked(mockInterceptor.setConnectCallback).mock.calls[0][0];
    connectCallback('ws://test.com', [], [], 123);

    const openCallback = vi.mocked(mockInterceptor.setOnOpenCallback).mock.calls[0][0];
    openCallback(123);

    expect(listener).toHaveBeenCalledWith(expect.objectContaining({
      type: 'websocket-open',
      url: 'ws://test.com',
      socketId: 123,
    }));
  });

  it('should not emit websocket-open event if url is missing', () => {
    const inspector = getWebSocketInspector();
    const listener = vi.fn();
    inspector.on('websocket-open', listener);
    
    vi.mocked(mockInterceptor.isInterceptorEnabled).mockReturnValue(false);
    inspector.enable();

    const openCallback = vi.mocked(mockInterceptor.setOnOpenCallback).mock.calls[0][0];
    openCallback(999);

    expect(listener).not.toHaveBeenCalled();
  });

  it('should emit websocket-close event via setOnCloseCallback', () => {
    const inspector = getWebSocketInspector();
    const listener = vi.fn();
    inspector.on('websocket-close', listener);
    
    vi.mocked(mockInterceptor.isInterceptorEnabled).mockReturnValue(false);
    inspector.enable();

    const connectCallback = vi.mocked(mockInterceptor.setConnectCallback).mock.calls[0][0];
    connectCallback('ws://test.com', [], [], 123);

    const onCloseCallback = vi.mocked(mockInterceptor.setOnCloseCallback).mock.calls[0][0];
    onCloseCallback({ code: 1000, reason: 'Normal Closure' }, 123);

    expect(listener).toHaveBeenCalledWith(expect.objectContaining({
      type: 'websocket-close',
      url: 'ws://test.com',
      socketId: 123,
      code: 1000,
      reason: 'Normal Closure',
    }));
  });

  it('should not emit websocket-close event via setOnCloseCallback if url is missing', () => {
    const inspector = getWebSocketInspector();
    const listener = vi.fn();
    inspector.on('websocket-close', listener);
    
    vi.mocked(mockInterceptor.isInterceptorEnabled).mockReturnValue(false);
    inspector.enable();

    const onCloseCallback = vi.mocked(mockInterceptor.setOnCloseCallback).mock.calls[0][0];
    onCloseCallback({ code: 1000, reason: 'Normal Closure' }, 999);

    expect(listener).not.toHaveBeenCalled();
  });

  it('should dispose correctly', () => {
    const inspector = getWebSocketInspector();
    inspector.dispose();

    expect(mockInterceptor.disableInterception).toHaveBeenCalled();
  });
});
