import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getHTTPInspector, isHttpEvent } from '../http-inspector';
import { XHRInterceptor } from '../xhr-interceptor';
import { getNetworkRequestsRegistry } from '../network-requests-registry';
import { setupRequestOverride } from '../http-utils';
import { getOverridesRegistry } from '../overrides-registry';

// Mock dependencies
vi.mock('../xhr-interceptor', () => ({
  XHRInterceptor: {
    setOverrideCallback: vi.fn(),
    isInterceptorEnabled: vi.fn(),
    disableInterception: vi.fn(),
    setOpenCallback: vi.fn(),
    setSendCallback: vi.fn(),
    setRequestHeaderCallback: vi.fn(),
    setHeaderReceivedCallback: vi.fn(),
    setResponseCallback: vi.fn(),
    enableInterception: vi.fn(),
  },
}));

vi.mock('../network-requests-registry', () => ({
  getNetworkRequestsRegistry: vi.fn().mockReturnValue({
    addEntry: vi.fn(),
    getEntry: vi.fn(),
    clear: vi.fn(),
  }),
}));

vi.mock('../http-utils', () => ({
  getRequestBody: vi.fn((data) => data),
  getResponseSize: vi.fn(() => 100),
  getInitiatorFromStack: vi.fn(() => 'test-initiator'),
  setupRequestOverride: vi.fn(),
}));

vi.mock('../../utils/applyReactNativeResponseHeadersLogic', () => ({
  applyReactNativeResponseHeadersLogic: vi.fn((headers) => headers),
}));

vi.mock('../utils', () => ({
  getContentType: vi.fn(() => 'application/json'),
}));

vi.mock('../overrides-registry', () => ({
  getOverridesRegistry: vi.fn(),
}));

describe('HTTPInspector', () => {
  let inspector: ReturnType<typeof getHTTPInspector>;
  let mockXHR: any;
  let eventListeners: Record<string, (...args: any[]) => any>;

  beforeEach(() => {
    vi.clearAllMocks();
    
    eventListeners = {};
    mockXHR = {
      _url: 'https://api.example.com/data',
      _method: 'GET',
      _headers: { 'Content-Type': 'application/json' },
      status: 200,
      statusText: 'OK',
      responseHeaders: { 'content-type': 'application/json' },
      response: '{"success":true}',
      responseType: 'text',
      addEventListener: vi.fn((event, handler) => {
        eventListeners[event] = handler;
      }),
      _rozeniteRequestId: undefined,
    };

    inspector = getHTTPInspector();
  });

  it('should create an inspector instance', () => {
    expect(inspector).toBeDefined();
    expect(inspector.enable).toBeDefined();
    expect(inspector.disable).toBeDefined();
    expect(inspector.getNetworkRequestsRegistry).toBeDefined();
  });

  it('should identify http events correctly', () => {
    expect(isHttpEvent('request-sent')).toBe(true);
    expect(isHttpEvent('response-received')).toBe(true);
    expect(isHttpEvent('request-completed')).toBe(true);
    expect(isHttpEvent('request-failed')).toBe(true);
    expect(isHttpEvent('request-progress')).toBe(true);
    expect(isHttpEvent('random-event')).toBe(false);
  });

  it('should enable interception when enable is called', () => {
    vi.mocked(XHRInterceptor.isInterceptorEnabled).mockReturnValue(false);

    inspector.enable();

    expect(XHRInterceptor.disableInterception).toHaveBeenCalled();
    expect(XHRInterceptor.setSendCallback).toHaveBeenCalled();
    expect(XHRInterceptor.enableInterception).toHaveBeenCalled();
  });

  it('should handle missing response headers', () => {
    const listener = vi.fn();
    inspector.on('response-received', listener);
    
    vi.mocked(XHRInterceptor.isInterceptorEnabled).mockReturnValue(false);
    inspector.enable();
    
    const sendCallback = vi.mocked(XHRInterceptor.setSendCallback).mock.calls[0][0];
    
    const xhrWithoutHeaders = { 
      ...mockXHR, 
      responseHeaders: undefined,
      addEventListener: vi.fn((event, handler) => {
        eventListeners[event] = handler;
      }),
    };
    
    sendCallback('request-body', xhrWithoutHeaders);
    
    // Trigger load event
    eventListeners['load']();
    
    expect(listener).toHaveBeenCalledWith(expect.objectContaining({
      response: expect.objectContaining({
        headers: {},
      }),
    }));
  });

  it('should handle request abort', () => {
    const listener = vi.fn();
    inspector.on('request-failed', listener);
    
    vi.mocked(XHRInterceptor.isInterceptorEnabled).mockReturnValue(false);
    inspector.enable();

    const sendCallback = vi.mocked(XHRInterceptor.setSendCallback).mock.calls[0][0];
    sendCallback('test-data', mockXHR);

    // Trigger abort
    eventListeners['abort']();

    expect(listener).toHaveBeenCalledWith(expect.objectContaining({
      type: 'XHR',
      error: 'Aborted',
      canceled: true,
    }));
  });

  it('should handle request timeout', () => {
    const listener = vi.fn();
    inspector.on('request-failed', listener);
    
    vi.mocked(XHRInterceptor.isInterceptorEnabled).mockReturnValue(false);
    inspector.enable();

    const sendCallback = vi.mocked(XHRInterceptor.setSendCallback).mock.calls[0][0];
    sendCallback('test-data', mockXHR);

    // Trigger timeout
    eventListeners['timeout']();

    expect(listener).toHaveBeenCalledWith(expect.objectContaining({
      type: 'XHR',
      error: 'Timeout',
      canceled: false,
    }));
  });

  it('should calculate TTFB on readystatechange', () => {
    vi.mocked(XHRInterceptor.isInterceptorEnabled).mockReturnValue(false);
    inspector.enable();
    
    const sendCallback = vi.mocked(XHRInterceptor.setSendCallback).mock.calls[0][0];
    
    const request = { ...mockXHR };
    request.addEventListener = vi.fn((event, handler) => {
      eventListeners[event] = handler;
    });
    
    sendCallback('data', request);
    
    // Trigger readystatechange with HEADERS_RECEIVED (2)
    request.readyState = 2;
    eventListeners['readystatechange']();
    
    const listener = vi.fn();
    inspector.on('request-completed', listener);
    eventListeners['loadend']();
    
    expect(listener).toHaveBeenCalledWith(expect.objectContaining({
      ttfb: expect.any(Number),
    }));
  });

  it('should handle request progress', () => {
    const listener = vi.fn();
    inspector.on('request-progress', listener);
    
    vi.mocked(XHRInterceptor.isInterceptorEnabled).mockReturnValue(false);
    inspector.enable();
    
    const sendCallback = vi.mocked(XHRInterceptor.setSendCallback).mock.calls[0][0];
    
    const request = { ...mockXHR };
    request.addEventListener = vi.fn((event, handler) => {
      eventListeners[event] = handler;
    });
    
    sendCallback('data', request);
    
    eventListeners['progress']({ loaded: 50, total: 100, lengthComputable: true });
    
    expect(listener).toHaveBeenCalledWith(expect.objectContaining({
      loaded: 50,
      total: 100,
      lengthComputable: true,
    }));
  });

  it('should dispose correctly', () => {
    inspector.dispose();
    expect(XHRInterceptor.disableInterception).toHaveBeenCalled();
    expect(getNetworkRequestsRegistry().clear).toHaveBeenCalled();
  });

  it('should disable interception when disable is called', () => {
    inspector.disable();
    expect(XHRInterceptor.disableInterception).toHaveBeenCalled();
    expect(getNetworkRequestsRegistry().clear).toHaveBeenCalled();
  });

  it('should check if interception is enabled', () => {
    vi.mocked(XHRInterceptor.isInterceptorEnabled).mockReturnValue(true);
    expect(inspector.isEnabled()).toBe(true);
    
    vi.mocked(XHRInterceptor.isInterceptorEnabled).mockReturnValue(false);
    expect(inspector.isEnabled()).toBe(false);
  });

  it('should dispose inspector', () => {
    inspector.dispose();
    expect(XHRInterceptor.disableInterception).toHaveBeenCalled();
    expect(getNetworkRequestsRegistry().clear).toHaveBeenCalled();
  });

  describe('Interception Logic', () => {
    let sendCallback: (...args: any[]) => any;
    let requestSentSpy: any;
    let responseReceivedSpy: any;
    let requestCompletedSpy: any;
    let requestFailedSpy: any;
    let requestProgressSpy: any;

    beforeEach(() => {
      vi.mocked(XHRInterceptor.isInterceptorEnabled).mockReturnValue(false);
      inspector.enable();
      
      // Capture the send callback
      sendCallback = vi.mocked(XHRInterceptor.setSendCallback).mock.calls[0][0];
      
      // Setup event spies
      requestSentSpy = vi.fn();
      responseReceivedSpy = vi.fn();
      requestCompletedSpy = vi.fn();
      requestFailedSpy = vi.fn();
      requestProgressSpy = vi.fn();
      
      inspector.on('request-sent', requestSentSpy);
      inspector.on('response-received', responseReceivedSpy);
      inspector.on('request-completed', requestCompletedSpy);
      inspector.on('request-failed', requestFailedSpy);
      inspector.on('request-progress', requestProgressSpy);
    });

    it('should handle request send', () => {
      sendCallback('test-body', mockXHR);

      expect(mockXHR._rozeniteRequestId).toBeDefined();
      expect(getNetworkRequestsRegistry().addEntry).toHaveBeenCalledWith(
        mockXHR._rozeniteRequestId,
        mockXHR
      );
      
      expect(requestSentSpy).toHaveBeenCalledWith(expect.objectContaining({
        requestId: mockXHR._rozeniteRequestId,
        request: expect.objectContaining({
          url: 'https://api.example.com/data',
          method: 'GET',
          postData: 'test-body',
        }),
        initiator: 'test-initiator',
      }));
    });

    it('should handle request progress', () => {
      sendCallback(null, mockXHR);
      
      const progressEvent = {
        loaded: 50,
        total: 100,
        lengthComputable: true,
      };
      
      eventListeners['progress'](progressEvent);
      
      expect(requestProgressSpy).toHaveBeenCalledWith(expect.objectContaining({
        requestId: mockXHR._rozeniteRequestId,
        loaded: 50,
        total: 100,
        lengthComputable: true,
      }));
    });

    it('should handle request load (success)', () => {
      sendCallback(null, mockXHR);
      
      // Simulate headers received to calculate TTFB
      mockXHR.readyState = 2; // HEADERS_RECEIVED
      eventListeners['readystatechange']();
      
      // Simulate load
      eventListeners['load']();
      eventListeners['loadend']();
      
      expect(responseReceivedSpy).toHaveBeenCalledWith(expect.objectContaining({
        requestId: mockXHR._rozeniteRequestId,
        response: expect.objectContaining({
          status: 200,
          statusText: 'OK',
        }),
      }));
      
      expect(requestCompletedSpy).toHaveBeenCalledWith(expect.objectContaining({
        requestId: mockXHR._rozeniteRequestId,
        size: 100,
      }));
    });

    it('should handle request error', () => {
      sendCallback(null, mockXHR);
      
      eventListeners['error']({ type: 'error' });
      
      expect(requestFailedSpy).toHaveBeenCalledWith(expect.objectContaining({
        requestId: mockXHR._rozeniteRequestId,
        error: 'Failed',
      }));
    });

    it('should handle request timeout', () => {
      sendCallback(null, mockXHR);
      
      eventListeners['timeout']({ type: 'timeout' });
      
      expect(requestFailedSpy).toHaveBeenCalledWith(expect.objectContaining({
        requestId: mockXHR._rozeniteRequestId,
        error: 'Timeout',
      }));
    });
  });
});

describe('isHttpEvent', () => {
  it('should return true for valid HTTP events', () => {
    expect(isHttpEvent('request-sent')).toBe(true);
    expect(isHttpEvent('response-received')).toBe(true);
  });

  it('should return false for invalid HTTP events', () => {
    expect(isHttpEvent('invalid-event')).toBe(false);
  });

  it('should return network requests registry', () => {
    const inspector = getHTTPInspector();
    const registry = inspector.getNetworkRequestsRegistry();
    expect(registry).toBeDefined();
  });

  it('should allow unsubscribing from events', () => {
    const inspector = getHTTPInspector();
    const listener = vi.fn();
    const unsubscribe = inspector.on('request-sent', listener);
    
    expect(unsubscribe).toBeDefined();
    expect(typeof unsubscribe).toBe('function');
    
    unsubscribe();
  });

  it('should dispose correctly', () => {
    const inspector = getHTTPInspector();
    inspector.dispose();
    
    expect(XHRInterceptor.disableInterception).toHaveBeenCalled();
    expect(getNetworkRequestsRegistry().clear).toHaveBeenCalled();
  });
});

describe('Override Callback', () => {
  it('should setup request override when callback is triggered', () => {
    vi.clearAllMocks();
    getHTTPInspector();
    
    const overrideCallback = vi.mocked(XHRInterceptor.setOverrideCallback).mock.calls[0][0];
    const mockRequest = {} as any;
    
    overrideCallback(mockRequest);
    
    expect(setupRequestOverride).toHaveBeenCalledWith(getOverridesRegistry(), mockRequest);
  });
});
