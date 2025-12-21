import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { validateConfig } from '../config';

// Mock dependencies before importing the module under test
const mockEventsListener = {
  setMaxQueueSize: vi.fn(),
  enableQueuing: vi.fn(),
};

const mockNetworkInspector = {
  setup: vi.fn(),
  enable: vi.fn(),
};

vi.mock('../events-listener', () => ({
  createEventsListener: vi.fn(() => mockEventsListener),
}));

vi.mock('../network-inspector', () => ({
  getNetworkInspector: vi.fn(() => mockNetworkInspector),
}));

vi.mock('../config', async () => {
  const actual = await vi.importActual('../config');
  return {
    ...actual,
    validateConfig: vi.fn(actual.validateConfig),
  };
});

describe('withOnBootNetworkActivityRecording', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
  });

  it('should create configuration with default options', async () => {
    const { createNetworkInspectorsConfiguration } = await import(
      '../boot-recording'
    );

    const config = createNetworkInspectorsConfiguration();

    expect(config.eventsListener).toBe(mockEventsListener);
    expect(config.networkInspector).toBe(mockNetworkInspector);

    expect(mockEventsListener.setMaxQueueSize).toHaveBeenCalledWith(200);
    expect(mockNetworkInspector.setup).toHaveBeenCalledWith(mockEventsListener);

    // Default is boot recording enabled
    expect(mockEventsListener.enableQueuing).toHaveBeenCalled();
    expect(mockNetworkInspector.enable).toHaveBeenCalledWith({
      http: true,
      websocket: true,
      sse: true,
    });
  });

  it('should respect custom options', async () => {
    const { createNetworkInspectorsConfiguration } = await import(
      '../boot-recording'
    );

    const options = {
      enableBootRecording: true,
      maxQueueSize: 500,
      inspectors: { http: false, sse: false, websocket: true },
    };

    createNetworkInspectorsConfiguration(options);

    expect(mockEventsListener.setMaxQueueSize).toHaveBeenCalledWith(500);
    expect(mockNetworkInspector.enable).toHaveBeenCalledWith({
      http: false,
      sse: false,
      websocket: true,
    });
  });

  it('should not enable recording if enableBootRecording is false', async () => {
    const { createNetworkInspectorsConfiguration } = await import(
      '../boot-recording'
    );

    createNetworkInspectorsConfiguration({ enableBootRecording: false });

    expect(mockEventsListener.enableQueuing).not.toHaveBeenCalled();
    expect(mockNetworkInspector.enable).not.toHaveBeenCalled();
  });

  it('should return existing configuration if called multiple times', async () => {
    const { createNetworkInspectorsConfiguration } = await import(
      '../boot-recording'
    );

    const config1 = createNetworkInspectorsConfiguration();
    const config2 = createNetworkInspectorsConfiguration();

    expect(config1).toBe(config2);
    expect(mockNetworkInspector.setup).toHaveBeenCalledTimes(1);
  });

  it('withOnBootNetworkActivityRecording should call createNetworkInspectorsConfiguration', async () => {
    const {
      withOnBootNetworkActivityRecording,
      createNetworkInspectorsConfiguration,
    } = await import('../boot-recording');

    // Since createNetworkInspectorsConfiguration is in the same module, we can't spy on it easily if it's called directly.
    // But we can check the side effects.

    withOnBootNetworkActivityRecording({ maxQueueSize: 123 });

    expect(mockEventsListener.setMaxQueueSize).toHaveBeenCalledWith(123);
  });

  it('should validate configuration', async () => {
    const { createNetworkInspectorsConfiguration } = await import(
      '../boot-recording'
    );

    // This should throw because SSE requires HTTP
    expect(() =>
      createNetworkInspectorsConfiguration({
        inspectors: { http: false, sse: true },
      }),
    ).toThrow('SSE inspector requires HTTP inspector to be enabled.');
  });
});
