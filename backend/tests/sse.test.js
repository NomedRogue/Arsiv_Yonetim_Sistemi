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
      setHeader: jest.fn(),
      flushHeaders: jest.fn(),
      write: jest.fn(),
      end: jest.fn(),
      on: jest.fn(),
      removeAllListeners: jest.fn(),
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis()
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
    it('should initialize SSE connection correctly', async () => {
      initSse(mockApp);

      expect(mockApp.get).toHaveBeenCalledWith('/api/events', expect.any(Function));
      
      // Simulate the route handler being called (it's async now)
      await routeHandler(mockRequest, mockResponse);
      
      expect(mockResponse.setHeader).toHaveBeenCalledWith('Content-Type', 'text/event-stream');
      expect(mockResponse.write).toHaveBeenCalled();
    });

    it('should handle request close event', async () => {
      initSse(mockApp);
      await routeHandler(mockRequest, mockResponse);

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