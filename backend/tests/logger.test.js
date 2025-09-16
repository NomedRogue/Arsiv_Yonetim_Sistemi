const logger = require('../logger');

describe('Logger', () => {
  let consoleSpy;

  beforeEach(() => {
    // Console methods'ları mock'la
    consoleSpy = {
      info: jest.spyOn(console, 'log').mockImplementation(),
      warn: jest.spyOn(console, 'warn').mockImplementation(),
      error: jest.spyOn(console, 'error').mockImplementation(),
    };
  });

  afterEach(() => {
    // Spy'ları temizle
    Object.values(consoleSpy).forEach(spy => spy.mockRestore());
  });

  describe('info logging', () => {
    it('should log info messages correctly', () => {
      logger.info('Test info message');
      
      expect(consoleSpy.info).toHaveBeenCalled();
      const logOutput = consoleSpy.info.mock.calls[0][0];
      expect(logOutput).toContain('info');
      expect(logOutput).toContain('Test info message');
    });

    it('should log info with metadata', () => {
      logger.info('Test message', { key: 'value' });
      
      expect(consoleSpy.info).toHaveBeenCalled();
      const logOutput = consoleSpy.info.mock.calls[0][0];
      expect(logOutput).toContain('Test message');
      // Metadata might be formatted differently based on logger implementation
      // Just check if any additional argument was passed
      expect(consoleSpy.info).toHaveBeenCalledWith(
        expect.stringContaining('Test message'),
        expect.any(Object)
      );
    });
  });

  describe('warn logging', () => {
    it('should log warning messages correctly', () => {
      logger.warn('Test warning message');
      
      expect(consoleSpy.warn).toHaveBeenCalled();
      const logOutput = consoleSpy.warn.mock.calls[0][0];
      expect(logOutput).toContain('warn');
      expect(logOutput).toContain('Test warning message');
    });
  });

  describe('error logging', () => {
    it('should log error messages correctly', () => {
      logger.error('Test error message');
      
      expect(consoleSpy.error).toHaveBeenCalled();
      const logOutput = consoleSpy.error.mock.calls[0][0];
      expect(logOutput).toContain('error');
      expect(logOutput).toContain('Test error message');
    });

    it('should log error with metadata', () => {
      logger.error('Test error', { error: new Error('test') });
      
      expect(consoleSpy.error).toHaveBeenCalled();
      const logOutput = consoleSpy.error.mock.calls[0][0];
      expect(logOutput).toContain('Test error');
    });
  });

  describe('log levels', () => {
    it('should handle different log levels', () => {
      // Test all log levels
      logger.info('info message');
      logger.warn('warn message');
      logger.error('error message');

      expect(consoleSpy.info).toHaveBeenCalledTimes(1);
      expect(consoleSpy.warn).toHaveBeenCalledTimes(1);
      expect(consoleSpy.error).toHaveBeenCalledTimes(1);
    });
  });
});