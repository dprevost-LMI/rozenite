import { vi } from 'vitest';

export default {
  setConnectCallback: vi.fn(),
  setCloseCallback: vi.fn(),
  setSendCallback: vi.fn(),
  setOnOpenCallback: vi.fn(),
  setOnMessageCallback: vi.fn(),
  setOnErrorCallback: vi.fn(),
  setOnCloseCallback: vi.fn(),
  isInterceptorEnabled: vi.fn(),
  enableInterception: vi.fn(),
  disableInterception: vi.fn(),
};
