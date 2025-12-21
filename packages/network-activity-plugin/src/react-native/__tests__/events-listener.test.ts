import { describe, it, expect, vi } from 'vitest';
import { createEventsListener } from '../events-listener';

type TestEventMap = {
  'test-event': { data: string };
  'other-event': { value: number };
};

describe('EventsListener', () => {
  it('should create an instance', () => {
    const listener = createEventsListener<TestEventMap>();
    expect(listener).toBeDefined();
  });

  it('should queue messages when in queuing mode', () => {
    const listener = createEventsListener<TestEventMap>();
    listener.enableQueuing();

    // We can't inspect the queue directly as it's private, 
    // but we can verify behavior when connecting later.
    listener.send('test-event', { data: 'hello' });
    
    // Should be in queue mode
    expect(listener.isInQueueMode()).toBe(true);
  });

  it('should flush queued messages when connecting', () => {
    const listener = createEventsListener<TestEventMap>();
    listener.enableQueuing();
    listener.send('test-event', { data: 'queued' });

    const sendFn = vi.fn();
    listener.connect(sendFn);

    expect(sendFn).toHaveBeenCalledWith('test-event', { data: 'queued' });
    expect(listener.isInQueueMode()).toBe(false);
  });

  it('should send messages directly when connected', () => {
    const listener = createEventsListener<TestEventMap>();
    const sendFn = vi.fn();
    listener.connect(sendFn);

    listener.send('other-event', { value: 123 });

    expect(sendFn).toHaveBeenCalledWith('other-event', { value: 123 });
  });

  it('should respect max queue size', () => {
    const listener = createEventsListener<TestEventMap>();
    listener.setMaxQueueSize(2);
    listener.enableQueuing();

    listener.send('test-event', { data: '1' });
    listener.send('test-event', { data: '2' });
    listener.send('test-event', { data: '3' }); // Should push out '1'

    const sendFn = vi.fn();
    listener.connect(sendFn);

    expect(sendFn).toHaveBeenCalledTimes(2);
    expect(sendFn).toHaveBeenCalledWith('test-event', { data: '2' });
    expect(sendFn).toHaveBeenCalledWith('test-event', { data: '3' });
    expect(sendFn).not.toHaveBeenCalledWith('test-event', { data: '1' });
  });

  it('should filter messages during flush', () => {
    const listener = createEventsListener<TestEventMap>();
    listener.enableQueuing();
    listener.send('test-event', { data: 'keep' });
    listener.send('other-event', { value: 0 }); // Should be filtered

    const sendFn = vi.fn();
    listener.connect(sendFn, (msg) => msg.type === 'test-event');

    expect(sendFn).toHaveBeenCalledTimes(1);
    expect(sendFn).toHaveBeenCalledWith('test-event', { data: 'keep' });
  });

  it('should not send if not connected and not queuing', () => {
    const listener = createEventsListener<TestEventMap>();
    // Not enabling queuing
    
    // This should do nothing
    listener.send('test-event', { data: 'lost' });

    const sendFn = vi.fn();
    listener.connect(sendFn);

    expect(sendFn).not.toHaveBeenCalled();
  });
  
  it('should handle flush when sendFunction is not set (defensive)', () => {
      const listener = createEventsListener<TestEventMap>();
      // @ts-expect-error - Accessing private method for testing defensive coding
      listener.flushQueue();
      // Should not throw
  });
});
