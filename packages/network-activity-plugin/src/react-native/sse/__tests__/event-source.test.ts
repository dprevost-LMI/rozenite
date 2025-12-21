import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getEventSource } from '../event-source';

describe('getEventSource', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('should return EventSource from react-native-sse if available', () => {
    const EventSource = getEventSource();
    expect(EventSource).toBeDefined();
  });
});
