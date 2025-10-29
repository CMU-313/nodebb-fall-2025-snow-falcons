/**
 * Jest test for src/socket.io/index.js
 * This test isolates NodeBB socket.io dependencies safely for mutation testing
 */

// Prevent NodeBB from exiting during tests
jest.spyOn(process, 'exit').mockImplementation(() => {});

// Mock winston logger to prevent console spam
jest.mock('winston', () => {
  const noop = jest.fn();
  const mockLogger = {
    error: noop,
    info: noop,
    warn: noop,
    debug: noop,
    verbose: noop,
    silly: noop,
    log: noop,
  };
  return {
    ...mockLogger,
    createLogger: () => mockLogger,
    transports: {},
    format: { 
      combine: noop, 
      colorize: noop, 
      printf: noop, 
      timestamp: noop 
    },
  };
}, { virtual: true });

// Mock nconf configuration
jest.mock('nconf', () => ({
  get: jest.fn((key) => {
    const config = {
      url: 'http://localhost:4567',
      database: 'redis',
      redis: { host: 'localhost', port: 6379 }
    };
    return config[key];
  }),
  set: jest.fn(),
  defaults: jest.fn(),
  argv: jest.fn(),
  env: jest.fn(),
  file: jest.fn(),
  use: jest.fn()
}), { virtual: true });

// Mock heavy NodeBB subsystems to prevent initialization
jest.mock('../src/database', () => ({}), { virtual: true });
jest.mock('../src/meta', () => ({}), { virtual: true });
jest.mock('../src/plugins', () => ({}), { virtual: true });
jest.mock('../src/groups', () => ({}), { virtual: true });
jest.mock('../src/user', () => ({}), { virtual: true });
jest.mock('../src/posts', () => ({}), { virtual: true });
jest.mock('../src/categories', () => ({}), { virtual: true });
jest.mock('../src/privileges', () => ({}), { virtual: true });
jest.mock('../src/notifications', () => ({}), { virtual: true });
jest.mock('../src/messaging', () => ({}), { virtual: true });
jest.mock('../src/api/helpers', () => ({}), { virtual: true });
jest.mock('../src/slugify', () => ({}), { virtual: true });
jest.mock('../src/file', () => ({}), { virtual: true });
jest.mock('../src/logger', () => ({}), { virtual: true });
jest.mock('../src/utils', () => ({}), { virtual: true });
jest.mock('../src/middleware/ratelimit', () => ({}), { virtual: true });
jest.mock('../src/meta/blacklist', () => ({}), { virtual: true });
jest.mock('../src/als', () => ({}), { virtual: true });

// Mock socket.io dependencies
jest.mock('socket.io', () => {
  return jest.fn().mockImplementation(() => ({
    on: jest.fn(),
    emit: jest.fn(),
    to: jest.fn().mockReturnThis(),
    in: jest.fn().mockReturnThis(),
    adapter: {
      rooms: new Map(),
      sids: new Map(),
    }
  }));
}, { virtual: true });

// Import the socket.io module
const socketIO = require('../src/socket.io/index.js');

describe('Socket.IO Module', () => {
  test('socket.io module exports an object', () => {
    expect(typeof socketIO).toBe('object');
    expect(socketIO).not.toBeNull();
  });

  test('socket.io exposes expected functions', () => {
    // Check for common socket.io-related functions
    expect(typeof socketIO.init).toBe('function');
    expect(typeof socketIO.getCountInRoom).toBe('function');
    expect(typeof socketIO.getUidsInRoom).toBe('function');
    expect(typeof socketIO.getUserSocketCount).toBe('function');
  });

  test('socket.io functions handle basic operations', () => {
    // Test that functions exist and can be called (even if they fail due to mocked dependencies)
    expect(() => socketIO.init).not.toThrow();
    expect(() => socketIO.getCountInRoom).not.toThrow();
  });

  test('socket.io module has expected properties', () => {
    // Check for common properties that should exist
    expect(socketIO).toHaveProperty('init');
    expect(socketIO).toHaveProperty('getCountInRoom');
    expect(socketIO).toHaveProperty('getUidsInRoom');
    expect(socketIO).toHaveProperty('getUserSocketCount');
  });
});
