const { describe, it, expect, beforeAll, afterAll, beforeEach } = require('@jest/globals');
const path = require('path');
const fs = require('fs');
const os = require('os');

describe('fileHelper', () => {
  const tempDir = path.join(os.tmpdir(), `arsiv-test-${Date.now()}`);

  beforeAll(() => {
    fs.mkdirSync(tempDir, { recursive: true });
  });

  beforeEach(() => {
    // Set the env var before each test and clear module cache
    process.env.USER_DATA_PATH = tempDir;
    jest.resetModules();
  });

  afterAll(() => {
    // Clean up
    fs.rmSync(tempDir, { recursive: true, force: true });
    delete process.env.USER_DATA_PATH;
  });

  describe('getUserDataPath', () => {
    it('should return the base user data path when no segments are provided', () => {
      const { getUserDataPath } = require('../fileHelper');
      expect(getUserDataPath()).toBe(tempDir);
    });

    it('should join segments to the base user data path', () => {
      const { getUserDataPath } = require('../fileHelper');
      const expectedPath = path.join(tempDir, 'sub', 'folder');
      expect(getUserDataPath('sub', 'folder')).toBe(expectedPath);
    });
  });

  describe('ensureDirExists', () => {
    it('should create a directory if it does not exist', () => {
      const { ensureDirExists } = require('../fileHelper');
      const dirToCreate = path.join(tempDir, 'new-dir');
      expect(fs.existsSync(dirToCreate)).toBe(false);
      
      ensureDirExists(dirToCreate);
      
      expect(fs.existsSync(dirToCreate)).toBe(true);
    });

    it('should not throw an error if the directory already exists', () => {
      const { ensureDirExists } = require('../fileHelper');
      const dirToCreate = path.join(tempDir, 'existing-dir');
      fs.mkdirSync(dirToCreate);
      
      expect(() => ensureDirExists(dirToCreate)).not.toThrow();
    });

    it('should create nested directories recursively', () => {
      const { ensureDirExists } = require('../fileHelper');
      const nestedDir = path.join(tempDir, 'parent', 'child');
      expect(fs.existsSync(nestedDir)).toBe(false);
      
      ensureDirExists(nestedDir);
      
      expect(fs.existsSync(nestedDir)).toBe(true);
    });
  });
});