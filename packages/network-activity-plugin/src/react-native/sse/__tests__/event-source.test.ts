import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import * as eventSourceModule from '../event-source';

// Mock react-native-sse so that the real requireEventSource can run without error
vi.mock('react-native-sse', () => {
  return {
    default: class MockNativeEventSource {},
  };
});

describe('getEventSource', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('utils.requireEventSource should require the module', () => {
    // This test covers the actual implementation of requireEventSource
    const module = eventSourceModule.utils.requireEventSource();
    expect(module).toBeDefined();
    expect(module.default).toBeDefined();
  });

  it('should return EventSource from react-native-sse if available', () => {
    // Mock requireEventSource to return a mock class
    const MockEventSource = class {
      constructor(_url: string) {
        // noop
      }
    };
    vi.spyOn(eventSourceModule.utils, 'requireEventSource').mockReturnValue({
      default: MockEventSource,
    });

    const EventSource = eventSourceModule.getEventSource();
    expect(EventSource).toBe(MockEventSource);
  });

  it('should return mock EventSource if react-native-sse is missing', () => {
    // Mock requireEventSource to throw
    vi.spyOn(eventSourceModule.utils, 'requireEventSource').mockImplementation(
      () => {
        throw new Error('Module not found');
      },
    );

    const EventSource = eventSourceModule.getEventSource();

    // It should return the MOCK_EVENT_SOURCE class
    expect(EventSource).toBeDefined();

    // Verify it's the mock class (no constructor args needed)
    const instance = new (EventSource as any)();
    
    expect(instance.open).toBeDefined();
    expect(() => instance.open()).not.toThrow();

    expect(instance.close).toBeDefined();
    expect(() => instance.close()).not.toThrow();

    expect(instance.addEventListener).toBeDefined();
    expect(() => instance.addEventListener()).not.toThrow();

    expect(instance.removeEventListener).toBeDefined();
    expect(() => instance.removeEventListener()).not.toThrow();

    expect(instance.dispatch).toBeDefined();
    expect(() => instance.dispatch()).not.toThrow();

    expect(instance.removeAllEventListeners).toBeDefined();
    expect(() => instance.removeAllEventListeners()).not.toThrow();
  });
});
