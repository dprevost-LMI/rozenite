import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Platform } from 'react-native';
import NativeInterceptor from 'react-native/Libraries/WebSocket/WebSocketInterceptor';

import { getWebSocketInterceptor } from '../websocket-interceptor';

describe('WebSocketInterceptor', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('RN >= 0.79', () => {
    beforeEach(() => {
      Platform.constants.reactNativeVersion.minor = 79;
    });

    it('should return the native interceptor directly', () => {
      const interceptor = getWebSocketInterceptor();
      expect(interceptor).toBeDefined();
      
      // Verify it's the mock object
      expect(interceptor).toBe(NativeInterceptor);
    });
  });

  describe('RN < 0.79', () => {
    beforeEach(() => {
      Platform.constants.reactNativeVersion.minor = 78;
    });

    it('should wrap setOnMessageCallback to swap arguments', () => {
      const interceptor = getWebSocketInterceptor();
      const callback = vi.fn();
      
      interceptor.setOnMessageCallback(callback);
      
      // Verify native setter was called
      expect(NativeInterceptor.setOnMessageCallback).toHaveBeenCalled();
      
      // Get the wrapper callback passed to native
      const wrapperCallback = NativeInterceptor.setOnMessageCallback.mock.calls[0][0];
      
      // Call wrapper with swapped args (socketId, data)
      wrapperCallback(123, 'test data');
      
      // Verify original callback called with correct args (data, socketId)
      expect(callback).toHaveBeenCalledWith('test data', 123);
    });

    it('should wrap setOnCloseCallback to swap arguments', () => {
      const interceptor = getWebSocketInterceptor();
      const callback = vi.fn();
      
      interceptor.setOnCloseCallback(callback);
      
      expect(NativeInterceptor.setOnCloseCallback).toHaveBeenCalled();
      
      const wrapperCallback = NativeInterceptor.setOnCloseCallback.mock.calls[0][0];
      const error = { code: 1000, reason: 'normal' };
      
      wrapperCallback(error, 123);
      expect(callback).toHaveBeenCalledWith(123, error);
    });

    it('should wrap setOnErrorCallback to swap arguments', () => {
      const interceptor = getWebSocketInterceptor();
      const callback = vi.fn();
      
      interceptor.setOnErrorCallback(callback);
      
      expect(NativeInterceptor.setOnErrorCallback).toHaveBeenCalled();
      
      const wrapperCallback = NativeInterceptor.setOnErrorCallback.mock.calls[0][0];
      
      wrapperCallback('error message', 123);
      expect(callback).toHaveBeenCalledWith(123, 'error message');
    });
  });
});
