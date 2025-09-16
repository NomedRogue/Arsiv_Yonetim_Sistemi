const { initSse, sseBroadcast, sseCleanup } = require('../sse');

describe('SSE (Server-Sent Events)', () => {
  let mockApp;
  let mockResponse;
  let mockRequest;
  let routeHandler;

  beforeEach(() => {
    // Mock express app
    mockApp = {
      get: jest.fn((path, handler) => {
        routeHandler = handler;
      })
    };

    // Mock response object
    mockResponse = {
      set: jest.fn(),
      flushHeaders: jest.fn(),
      write: jest.fn(),
      end: jest.fn(),
      on: jest.fn(),
      removeAllListeners: jest.fn()
    };

    // Mock request object
    mockRequest = {
      on: jest.fn(),
      removeAllListeners: jest.fn()
    };

    // Clear any existing SSE connections
    sseCleanup();
  });

  afterEach(() => {
    sseCleanup();
  });

  describe('initSse', () => {
    it('should initialize SSE connection correctly', () => {
      initSse(mockApp);

      expect(mockApp.get).toHaveBeenCalledWith('/api/events', expect.any(Function));
      
      // Simulate the route handler being called
      routeHandler(mockRequest, mockResponse);
      
      expect(mockResponse.set).toHaveBeenCalledWith({
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache, no-transform',
        'Connection': 'keep-alive',
      });

      expect(mockResponse.flushHeaders).toHaveBeenCalled();
      expect(mockResponse.write).toHaveBeenCalled();
    });

    it('should handle request close event', () => {
      initSse(mockApp);
      routeHandler(mockRequest, mockResponse);

      expect(mockRequest.on).toHaveBeenCalledWith('close', expect.any(Function));
    });
  });

  describe('sseBroadcast', () => {
    it('should handle broadcast with no connections', () => {
      const testType = 'test';
      const testPayload = { message: 'test message' };
      
      // Should not throw error
      expect(() => sseBroadcast(testType, testPayload)).not.toThrow();
    });
  });

  describe('sseCleanup', () => {
    it('should cleanup all SSE connections', () => {
      // Should not throw
      expect(() => sseCleanup()).not.toThrow();
    });
  });
});