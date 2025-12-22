import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

describe('XHRInterceptor', () => {
  let XHRInterceptor: any;
  let mockXHR: any;
  let openSpy: any;
  let sendSpy: any;
  let setRequestHeaderSpy: any;

  beforeEach(async () => {
    vi.resetModules();

    // Define MockXHR with methods on the prototype so XHRInterceptor can patch them
    mockXHR = class {
      readyState = 0;
      status = 0;
      responseType = '';
      response = null;
      responseText = '';
      timeout = 0;
      responseURL = '';

      HEADERS_RECEIVED = 2;
      DONE = 4;

      open(...args: any[]) {
        /* noop */
      }
      send(...args: any[]) {
        /* noop */
      }
      setRequestHeader(...args: any[]) {
        /* noop */
      }
      addEventListener(...args: any[]) {
        /* noop */
      }
      getAllResponseHeaders() {
        return '';
      }
      getResponseHeader(header: string) {
        return null;
      }
    };

    // Spy on the prototype methods
    openSpy = vi.spyOn(mockXHR.prototype, 'open');
    sendSpy = vi.spyOn(mockXHR.prototype, 'send');
    setRequestHeaderSpy = vi.spyOn(mockXHR.prototype, 'setRequestHeader');

    global.XMLHttpRequest = mockXHR as any;

    const module = await import('../xhr-interceptor');
    XHRInterceptor = module.XHRInterceptor;
  });

  afterEach(() => {
    if (XHRInterceptor) {
      XHRInterceptor.disableInterception();
    }
    vi.restoreAllMocks();
  });

  it('should enable interception', () => {
    XHRInterceptor.enableInterception();
    expect(XHRInterceptor.isInterceptorEnabled()).toBe(true);
  });

  it('should not re-enable if already enabled', () => {
    XHRInterceptor.enableInterception();
    const originalOpen = XMLHttpRequest.prototype.open;

    XHRInterceptor.enableInterception();

    expect(XMLHttpRequest.prototype.open).toBe(originalOpen);
  });

  it('should disable interception', () => {
    XHRInterceptor.enableInterception();
    XHRInterceptor.disableInterception();
    expect(XHRInterceptor.isInterceptorEnabled()).toBe(false);
  });

  it('should call openCallback if defined', () => {
    const openCallback = vi.fn();
    XHRInterceptor.setOpenCallback(openCallback);
    XHRInterceptor.enableInterception();

    const xhr = new XMLHttpRequest();
    xhr.open('GET', 'https://example.com');

    expect(openCallback).toHaveBeenCalledWith(
      'GET',
      'https://example.com',
      xhr,
    );
    expect(openSpy).toHaveBeenCalledWith('GET', 'https://example.com');
  });

  it('should not call openCallback if not defined', () => {
    XHRInterceptor.setOpenCallback(null);
    XHRInterceptor.enableInterception();

    const xhr = new XMLHttpRequest();
    xhr.open('GET', 'https://example.com');

    expect(openSpy).toHaveBeenCalledWith('GET', 'https://example.com');
  });

  it('should intercept XHR lifecycle', () => {
    const openCallback = vi.fn();
    const sendCallback = vi.fn();
    const requestHeaderCallback = vi.fn();
    const headerReceivedCallback = vi.fn();
    const responseCallback = vi.fn();
    const overrideCallback = vi.fn();

    XHRInterceptor.setOpenCallback(openCallback);
    XHRInterceptor.setSendCallback(sendCallback);
    XHRInterceptor.setRequestHeaderCallback(requestHeaderCallback);
    XHRInterceptor.setHeaderReceivedCallback(headerReceivedCallback);
    XHRInterceptor.setResponseCallback(responseCallback);
    XHRInterceptor.setOverrideCallback(overrideCallback);

    XHRInterceptor.enableInterception();

    const xhr = new XMLHttpRequest();

    // Test open
    xhr.open('GET', 'https://example.com');
    expect(openCallback).toHaveBeenCalledWith(
      'GET',
      'https://example.com',
      xhr,
    );
    expect(openSpy).toHaveBeenCalledWith('GET', 'https://example.com');

    // Test setRequestHeader
    xhr.setRequestHeader('Content-Type', 'application/json');
    expect(requestHeaderCallback).toHaveBeenCalledWith(
      'Content-Type',
      'application/json',
      xhr,
    );
    expect(setRequestHeaderSpy).toHaveBeenCalledWith(
      'Content-Type',
      'application/json',
    );

    // Test send
    // We need to capture the event listener added in send
    let readyStateListener: ((...args: any[]) => any) | undefined;
    xhr.addEventListener = vi.fn((event, listener) => {
      if (event === 'readystatechange') {
        readyStateListener = listener;
      }
    });

    xhr.send('data');
    expect(sendCallback).toHaveBeenCalledWith('data', xhr);
    expect(overrideCallback).toHaveBeenCalledWith(xhr);
    expect(sendSpy).toHaveBeenCalledWith('data');
    expect(xhr.addEventListener).toHaveBeenCalledWith(
      'readystatechange',
      expect.any(Function),
      false,
    );

    // Test readyState change (HEADERS_RECEIVED)
    expect(readyStateListener).toBeDefined();

    // Mock response headers
    xhr.readyState = 2; // HEADERS_RECEIVED
    xhr.getResponseHeader = vi.fn((header) => {
      if (header === 'Content-Type') return 'application/json; charset=utf-8';
      if (header === 'Content-Length') return '123';
      return null;
    });
    xhr.getAllResponseHeaders = vi.fn(
      () => 'Content-Type: application/json\r\nContent-Length: 123',
    );

    readyStateListener!();

    expect(headerReceivedCallback).toHaveBeenCalledWith(
      'application/json',
      123,
      'Content-Type: application/json\r\nContent-Length: 123',
      xhr,
    );

    // Test readyState change (DONE)
    xhr.readyState = 4; // DONE
    xhr.status = 200;
    xhr.timeout = 0;
    xhr.response = '{"success":true}';
    xhr.responseURL = 'https://example.com';
    xhr.responseType = 'text';

    readyStateListener!();

    expect(responseCallback).toHaveBeenCalledWith(
      200,
      0,
      '{"success":true}',
      'https://example.com',
      'text',
      xhr,
    );
  });

  it('should handle missing callbacks', () => {
    XHRInterceptor.setOpenCallback(null);
    XHRInterceptor.setSendCallback(null);
    XHRInterceptor.setRequestHeaderCallback(null);
    XHRInterceptor.setHeaderReceivedCallback(null);
    XHRInterceptor.setResponseCallback(null);
    XHRInterceptor.setOverrideCallback(null);

    XHRInterceptor.enableInterception();

    const xhr = new XMLHttpRequest();
    xhr.open('GET', 'https://example.com');
    xhr.setRequestHeader('Content-Type', 'application/json');
    xhr.send('data');

    // Should not throw
  });

  it('should not process events if interception is disabled', () => {
    const headerReceivedCallback = vi.fn();
    XHRInterceptor.setHeaderReceivedCallback(headerReceivedCallback);
    XHRInterceptor.enableInterception();

    const xhr = new XMLHttpRequest();

    let readyStateListener: ((...args: any[]) => any) | undefined;
    xhr.addEventListener = vi.fn((event, listener) => {
      if (event === 'readystatechange') {
        readyStateListener = listener;
      }
    });

    xhr.send('data');

    // Disable interception
    XHRInterceptor.disableInterception();

    // Trigger event
    xhr.readyState = 2;

    readyStateListener!();

    expect(headerReceivedCallback).not.toHaveBeenCalled();
  });

  it('should use window.XMLHttpRequest if global.XMLHttpRequest is undefined', async () => {
    vi.resetModules();
    const originalGlobalXHR = global.XMLHttpRequest;
    // @ts-expect-error - Testing fallback
    delete global.XMLHttpRequest;

    const mockWindowXHR = class {
      open() {
        /* noop */
      }
      send() {
        /* noop */
      }
      setRequestHeader() {
        /* noop */
      }
    };
    // @ts-expect-error - Testing fallback
    global.window = { XMLHttpRequest: mockWindowXHR };

    const module = await import('../xhr-interceptor');
    const Interceptor = module.XHRInterceptor;

    expect(Interceptor).toBeDefined();

    global.XMLHttpRequest = originalGlobalXHR;
    // @ts-expect-error - Testing fallback
    delete global.window;
  });
});
