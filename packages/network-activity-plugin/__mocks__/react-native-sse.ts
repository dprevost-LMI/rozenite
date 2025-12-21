import { vi } from 'vitest';

export const shouldThrow = { value: false };
export const MockEventSource = vi.fn();

if (shouldThrow.value) {
  throw new Error('Cannot find module');
}

export default MockEventSource;
