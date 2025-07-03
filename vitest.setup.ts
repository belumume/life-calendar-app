// Vitest setup file
import "@solidjs/testing-library";
import { vi } from "vitest";
import { webcrypto } from "crypto";

// Mock localStorage for tests
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
};

global.localStorage = localStorageMock;

// Provide Web Crypto API for Node.js environment
if (!global.crypto) {
  global.crypto = webcrypto as Crypto;
}

// Mock TextEncoder/TextDecoder if not available
if (!global.TextEncoder) {
  global.TextEncoder = TextEncoder;
}
if (!global.TextDecoder) {
  global.TextDecoder = TextDecoder;
}

// Mock IndexedDB for tests
import "fake-indexeddb/auto";

// Mock URL.createObjectURL and URL.revokeObjectURL
global.URL.createObjectURL = vi.fn(() => 'blob:mock-url');
global.URL.revokeObjectURL = vi.fn();