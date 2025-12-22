import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createNanoEvents } from 'nanoevents';
import { getSSEInspector, isSSEEvent } from '../sse-inspector';
import { SSEInterceptor } from '../sse-interceptor';

// Mock nanoevents to inspect the events object
vi.mock('nanoevents', () => ({
  createNanoEvents: vi.fn(() => {
    const emitter: any = {
      events: {},
      emit(event: string, ...args: any[]) {
        (this.events[event] || []).forEach((cb: any) => cb(...args));
      },
      on(event: string, cb: any) {
        if (!this.events[event]) this.events[event] = [];
        this.events[event].push(cb);
        return () => {
          this.events[event] = this.events[event].filter((i: any) => i !== cb);
        };
      },
    };
    return emitter;
  }),
}));

// Mock SSEInterceptor
vi.mock('../sse-interceptor', () => ({
  SSEInterceptor: {
    setConnectCallback: vi.fn(),
    setMessageCallback: vi.fn(),
    setErrorCallback: vi.fn(),
    setOpenEventCallback: vi.fn(),
    setCloseCallback: vi.fn(),
    enableInterception: vi.fn(),
    disableInterception: vi.fn(),
    isInterceptorEnabled: vi.fn(),
  },
}));

describe('SSEInspector', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should identify sse events correctly', () => {
    expect(isSSEEvent('sse-open')).toBe(true);
    expect(isSSEEvent('sse-message')).toBe(true);
    expect(isSSEEvent('sse-error')).toBe(true);
    expect(isSSEEvent('sse-close')).toBe(true);
    expect(isSSEEvent('random-event')).toBe(false);
  });

  it('should create an inspector instance', () => {
    const inspector = getSSEInspector();
    expect(inspector).toBeDefined();
    expect(inspector.enable).toBeDefined();
    expect(inspector.disable).toBeDefined();
  });

  it('should enable interception when enable is called', () => {
    const inspector = getSSEInspector();
    vi.mocked(SSEInterceptor.isInterceptorEnabled).mockReturnValue(false);

    inspector.enable();

    expect(SSEInterceptor.setOpenEventCallback).toHaveBeenCalled();
    expect(SSEInterceptor.setMessageCallback).toHaveBeenCalled();
    expect(SSEInterceptor.setErrorCallback).toHaveBeenCalled();
    expect(SSEInterceptor.setCloseCallback).toHaveBeenCalled();
    expect(SSEInterceptor.enableInterception).toHaveBeenCalled();
  });

  it('should disable interception when disable is called', () => {
    const inspector = getSSEInspector();
    inspector.disable();

    expect(SSEInterceptor.disableInterception).toHaveBeenCalled();
  });

  it('should emit sse-open event', () => {
    const inspector = getSSEInspector();
    const listener = vi.fn();
    inspector.on('sse-open', listener);

    vi.mocked(SSEInterceptor.isInterceptorEnabled).mockReturnValue(false);
    inspector.enable();

    const callback = vi.mocked(SSEInterceptor.setOpenEventCallback).mock
      .calls[0][0];
    const mockEventSource = {
      _xhr: {
        _rozeniteRequestId: '123',
        _url: 'http://test.com',
        _method: 'GET',
      },
    } as any;

    callback(new Event('open'), mockEventSource);

    expect(listener).toHaveBeenCalledWith(
      expect.objectContaining({
        requestId: '123',
        response: expect.objectContaining({
          url: 'http://test.com',
        }),
      }),
    );
  });

  it('should not emit sse-open event if requestId is missing', () => {
    const inspector = getSSEInspector();
    const listener = vi.fn();
    inspector.on('sse-open', listener);

    vi.mocked(SSEInterceptor.isInterceptorEnabled).mockReturnValue(false);
    inspector.enable();

    const callback = vi.mocked(SSEInterceptor.setOpenEventCallback).mock
      .calls[0][0];
    const mockEventSource = {
      _xhr: { _url: 'http://test.com', _method: 'GET' },
    } as any;

    callback(new Event('open'), mockEventSource);

    expect(listener).not.toHaveBeenCalled();
  });

  it('should emit sse-message event', () => {
    const inspector = getSSEInspector();
    const listener = vi.fn();
    inspector.on('sse-message', listener);

    vi.mocked(SSEInterceptor.isInterceptorEnabled).mockReturnValue(false);
    inspector.enable();

    const callback = vi.mocked(SSEInterceptor.setMessageCallback).mock
      .calls[0][0];
    const mockEventSource = {
      _xhr: { _rozeniteRequestId: '123' },
    } as any;
    const mockEvent = { type: 'message', data: 'test-data' } as any;

    callback(mockEvent, mockEventSource);

    expect(listener).toHaveBeenCalledWith(
      expect.objectContaining({
        requestId: '123',
        payload: expect.objectContaining({
          data: 'test-data',
          type: 'message',
        }),
      }),
    );
  });

  it('should emit sse-error event', () => {
    const inspector = getSSEInspector();
    const listener = vi.fn();
    inspector.on('sse-error', listener);

    vi.mocked(SSEInterceptor.isInterceptorEnabled).mockReturnValue(false);
    inspector.enable();

    const callback = vi.mocked(SSEInterceptor.setErrorCallback).mock
      .calls[0][0];
    const mockEventSource = {
      _xhr: { _rozeniteRequestId: '123' },
    } as any;
    const mockEvent = { type: 'error', message: 'error-msg' } as any;

    callback(mockEvent, mockEventSource);

    expect(listener).toHaveBeenCalledWith(
      expect.objectContaining({
        requestId: '123',
        error: expect.objectContaining({
          message: 'error-msg',
        }),
      }),
    );
  });

  it('should emit sse-close event', () => {
    const inspector = getSSEInspector();
    const listener = vi.fn();
    inspector.on('sse-close', listener);

    vi.mocked(SSEInterceptor.isInterceptorEnabled).mockReturnValue(false);
    inspector.enable();

    const callback = vi.mocked(SSEInterceptor.setCloseCallback).mock
      .calls[0][0];
    const mockEventSource = {
      _xhr: { _rozeniteRequestId: '123' },
    } as any;

    callback(new Event('close'), mockEventSource);

    expect(listener).toHaveBeenCalledWith(
      expect.objectContaining({
        requestId: '123',
      }),
    );
  });

  it('should not emit event if requestId is missing', () => {
    const inspector = getSSEInspector();
    const listener = vi.fn();
    inspector.on('sse-open', listener);

    vi.mocked(SSEInterceptor.isInterceptorEnabled).mockReturnValue(false);
    inspector.enable();

    const callback = vi.mocked(SSEInterceptor.setOpenEventCallback).mock
      .calls[0][0];
    const mockEventSource = {
      _xhr: {}, // No requestId
    } as any;

    callback(new Event('open'), mockEventSource);

    expect(listener).not.toHaveBeenCalled();
  });

  it('should not emit message event if requestId is missing', () => {
    const inspector = getSSEInspector();
    const listener = vi.fn();
    inspector.on('sse-message', listener);

    vi.mocked(SSEInterceptor.isInterceptorEnabled).mockReturnValue(false);
    inspector.enable();

    const callback = vi.mocked(SSEInterceptor.setMessageCallback).mock
      .calls[0][0];
    const mockEventSource = { _xhr: {} } as any;

    callback({ type: 'message', data: 'test' }, mockEventSource);

    expect(listener).not.toHaveBeenCalled();
  });

  it('should not emit error event if requestId is missing', () => {
    const inspector = getSSEInspector();
    const listener = vi.fn();
    inspector.on('sse-error', listener);

    vi.mocked(SSEInterceptor.isInterceptorEnabled).mockReturnValue(false);
    inspector.enable();

    const callback = vi.mocked(SSEInterceptor.setErrorCallback).mock
      .calls[0][0];
    const mockEventSource = { _xhr: {} } as any;

    callback({ type: 'error', message: 'err' }, mockEventSource);

    expect(listener).not.toHaveBeenCalled();
  });

  it('should not emit close event if requestId is missing', () => {
    const inspector = getSSEInspector();
    const listener = vi.fn();
    inspector.on('sse-close', listener);

    vi.mocked(SSEInterceptor.isInterceptorEnabled).mockReturnValue(false);
    inspector.enable();

    const callback = vi.mocked(SSEInterceptor.setCloseCallback).mock
      .calls[0][0];
    const mockEventSource = { _xhr: {} } as any;

    callback(new Event('close'), mockEventSource);

    expect(listener).not.toHaveBeenCalled();
  });

  it('should allow unsubscribing from events', () => {
    const inspector = getSSEInspector();
    const listener = vi.fn();
    const unsubscribe = inspector.on('sse-open', listener);

    expect(unsubscribe).toBeDefined();
    expect(typeof unsubscribe).toBe('function');

    unsubscribe();
  });

  it('should check if enabled', () => {
    const inspector = getSSEInspector();
    vi.mocked(SSEInterceptor.isInterceptorEnabled).mockReturnValue(true);
    expect(inspector.isEnabled()).toBe(true);

    vi.mocked(SSEInterceptor.isInterceptorEnabled).mockReturnValue(false);
    expect(inspector.isEnabled()).toBe(false);
  });

  it('should dispose correctly', () => {
    const inspector = getSSEInspector();
    inspector.dispose();
    expect(SSEInterceptor.disableInterception).toHaveBeenCalled();
  });

  it('Ensure eventEmitter.events is kept to work with hot reload when changing config flag from false to true', () => {
    const inspector = getSSEInspector();

    // Add a listener to populate events
    inspector.on('sse-open', () => {
      // noop
    });

    // Get the emitter instance from the mock
    const emitter = vi.mocked(createNanoEvents).mock.results[0].value;
    expect(emitter.events['sse-open']).toHaveLength(1);

    inspector.dispose();

    // Verify events are NOT cleared
    expect(emitter.events['sse-open']).toHaveLength(1);
  });

  it('should handle empty message data', () => {
    const inspector = getSSEInspector();
    const listener = vi.fn();
    inspector.on('sse-message', listener);

    vi.mocked(SSEInterceptor.isInterceptorEnabled).mockReturnValue(false);
    inspector.enable();

    const callback = vi.mocked(SSEInterceptor.setMessageCallback).mock
      .calls[0][0];
    const mockEventSource = { _xhr: { _rozeniteRequestId: 'req-id' } } as any;

    callback({ type: 'message', data: undefined }, mockEventSource);

    expect(listener).toHaveBeenCalledWith(
      expect.objectContaining({
        payload: expect.objectContaining({
          data: '',
        }),
      }),
    );
  });

  it('should handle timeout error', () => {
    const inspector = getSSEInspector();
    const listener = vi.fn();
    inspector.on('sse-error', listener);

    vi.mocked(SSEInterceptor.isInterceptorEnabled).mockReturnValue(false);
    inspector.enable();

    const callback = vi.mocked(SSEInterceptor.setErrorCallback).mock
      .calls[0][0];
    const mockEventSource = { _xhr: { _rozeniteRequestId: 'req-id' } } as any;

    callback({ type: 'timeout', message: 'ignored' }, mockEventSource);

    expect(listener).toHaveBeenCalledWith(
      expect.objectContaining({
        error: expect.objectContaining({
          message: 'Timeout',
        }),
      }),
    );
  });
});
