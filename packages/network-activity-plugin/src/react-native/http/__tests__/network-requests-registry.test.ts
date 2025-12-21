import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { getNetworkRequestsRegistry } from '../network-requests-registry';

describe('NetworkRequestsRegistry', () => {
  let registry: ReturnType<typeof getNetworkRequestsRegistry>;

  beforeEach(() => {
    registry = getNetworkRequestsRegistry();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should add and retrieve an entry', () => {
    const id = '123';
    const request = {} as XMLHttpRequest;
    registry.addEntry(id, request);
    expect(registry.getEntry(id)).toBe(request);
  });

  it('should return null for non-existent entry', () => {
    expect(registry.getEntry('non-existent')).toBeNull();
  });

  it('should clear the registry', () => {
    const id = '123';
    const request = {} as XMLHttpRequest;
    registry.addEntry(id, request);
    registry.clear();
    expect(registry.getEntry(id)).toBeNull();
  });

  it('should trim old entries', () => {
    const id1 = '1';
    const request1 = {} as XMLHttpRequest;
    const id2 = '2';
    const request2 = {} as XMLHttpRequest;

    // Add first entry
    registry.addEntry(id1, request1);

    // Advance time by 6 minutes (TTL is 5 minutes)
    vi.advanceTimersByTime(1000 * 60 * 6);

    // Add second entry, which should trigger trim
    registry.addEntry(id2, request2);

    expect(registry.getEntry(id1)).toBeNull();
    expect(registry.getEntry(id2)).toBe(request2);
  });

  it('should not trim recent entries', () => {
    const id1 = '1';
    const request1 = {} as XMLHttpRequest;
    const id2 = '2';
    const request2 = {} as XMLHttpRequest;

    // Add first entry
    registry.addEntry(id1, request1);

    // Advance time by 4 minutes (TTL is 5 minutes)
    vi.advanceTimersByTime(1000 * 60 * 4);

    // Add second entry
    registry.addEntry(id2, request2);

    expect(registry.getEntry(id1)).toBe(request1);
    expect(registry.getEntry(id2)).toBe(request2);
  });
});
