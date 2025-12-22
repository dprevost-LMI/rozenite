/// <reference types="vitest" />
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

const FULL_COVERAGE_THRESHOLD = {
  lines: 100,
  functions: 100,
  branches: 100,
  statements: 100,
};

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: [
      {
        find: 'react-native/Libraries/WebSocket/WebSocketInterceptor',
        replacement: path.resolve(
          __dirname,
          '__mocks__/react-native/Libraries/WebSocket/WebSocketInterceptor.ts',
        ),
      },
      {
        find: 'react-native',
        replacement: path.resolve(__dirname, '__mocks__/react-native/index.ts'),
      },
    ],
  },
  test: {
    globals: true,
    environment: 'happy-dom',
    setupFiles: ['./src/react-native/__tests__/setup.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        'dist/',
        '**/*.config.{js,ts}',
        '**/*.d.ts',
        '**/types.ts',
        '**/__tests__/**',
        '**/__mocks__/**',
      ],
      thresholds: {
        lines: 4,
        functions: 26,
        branches: 55,
        statements: 4,
        'src/react-native/**': FULL_COVERAGE_THRESHOLD,
      },
    },
    server: {
      deps: {
        inline: ['react-native', 'react-native-sse'],
      },
    },
  },
});
