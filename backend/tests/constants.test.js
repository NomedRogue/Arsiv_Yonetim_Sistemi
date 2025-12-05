const {
  DEFAULT_SETTINGS,
  ALL_DEPARTMENTS,
  INITIAL_STORAGE_STRUCTURE,
  RETENTION_CODES
} = require('../src/config/constants');

describe('Constants', () => {
  describe('DEFAULT_SETTINGS', () => {
    it('should have required default settings properties', () => {
      expect(DEFAULT_SETTINGS).toBeDefined();
      expect(typeof DEFAULT_SETTINGS).toBe('object');
      
      // Check for essential properties
      expect(DEFAULT_SETTINGS).toHaveProperty('yedeklemeKlasoru');
      expect(DEFAULT_SETTINGS).toHaveProperty('pdfKayitKlasoru');
      expect(DEFAULT_SETTINGS).toHaveProperty('backupFrequency');
      expect(DEFAULT_SETTINGS).toHaveProperty('backupTime');
      expect(DEFAULT_SETTINGS).toHaveProperty('maxBackupCount');
    });

    it('should have valid backup frequency values', () => {
      const validFrequencies = ['Kapalı', 'Günlük', 'Haftalık'];
      expect(validFrequencies).toContain(DEFAULT_SETTINGS.backupFrequency);
    });

    it('should have valid backup time format', () => {
      const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;
      expect(DEFAULT_SETTINGS.backupTime).toMatch(timeRegex);
    });

    it('should have numeric maxBackupCount', () => {
      expect(typeof DEFAULT_SETTINGS.maxBackupCount).toBe('number');
      expect(DEFAULT_SETTINGS.maxBackupCount).toBeGreaterThan(0);
    });
  });

  describe('ALL_DEPARTMENTS', () => {
    it('should be an array of department objects', () => {
      expect(Array.isArray(ALL_DEPARTMENTS)).toBe(true);
      expect(ALL_DEPARTMENTS.length).toBeGreaterThan(0);
    });

    it('should have departments with required properties', () => {
      ALL_DEPARTMENTS.forEach(dept => {
        expect(dept).toHaveProperty('id');
        expect(dept).toHaveProperty('name');
        expect(dept).toHaveProperty('category');
        
        expect(typeof dept.id).toBe('number');
        expect(typeof dept.name).toBe('string');
        expect(typeof dept.category).toBe('string');
      });
    });

    it('should have unique department IDs', () => {
      const ids = ALL_DEPARTMENTS.map(dept => dept.id);
      const uniqueIds = [...new Set(ids)];
      expect(ids.length).toBe(uniqueIds.length);
    });

    it('should contain expected department categories', () => {
      const categories = ALL_DEPARTMENTS.map(dept => dept.category);
      const uniqueCategories = [...new Set(categories)];
      
      expect(uniqueCategories).toContain('Tıbbi');
      expect(uniqueCategories).toContain('İdari');
    });
  });

  describe('INITIAL_STORAGE_STRUCTURE', () => {
    it('should have kompakt and stand storage types', () => {
      expect(INITIAL_STORAGE_STRUCTURE).toHaveProperty('kompakt');
      expect(INITIAL_STORAGE_STRUCTURE).toHaveProperty('stand');
      expect(Array.isArray(INITIAL_STORAGE_STRUCTURE.kompakt)).toBe(true);
      expect(Array.isArray(INITIAL_STORAGE_STRUCTURE.stand)).toBe(true);
    });

    it('should have valid kompakt unit structure', () => {
      INITIAL_STORAGE_STRUCTURE.kompakt.forEach(unit => {
        expect(unit).toHaveProperty('unit');
        expect(unit).toHaveProperty('faces');
        expect(typeof unit.unit).toBe('number');
        expect(Array.isArray(unit.faces)).toBe(true);
      });
    });

    it('should have valid kompakt face structure', () => {
      INITIAL_STORAGE_STRUCTURE.kompakt.forEach(unit => {
        unit.faces.forEach(face => {
          expect(face).toHaveProperty('name');
          expect(face).toHaveProperty('sections');
          expect(typeof face.name).toBe('string');
          expect(Array.isArray(face.sections)).toBe(true);
          face.sections.forEach(sectionObj => {
            expect(sectionObj).toHaveProperty('section');
            expect(sectionObj).toHaveProperty('shelves');
            expect(typeof sectionObj.section).toBe('number');
            expect(Array.isArray(sectionObj.shelves)).toBe(true);
          });
        });
      });
    });

    it('should have valid stand structure', () => {
      INITIAL_STORAGE_STRUCTURE.stand.forEach(standUnit => {
        expect(standUnit).toHaveProperty('stand');
        expect(standUnit).toHaveProperty('shelves');
        expect(typeof standUnit.stand).toBe('number');
        expect(Array.isArray(standUnit.shelves)).toBe(true);
      });
    });
  });

  describe('RETENTION_CODES', () => {
    it('should be an array of retention code objects', () => {
      expect(Array.isArray(RETENTION_CODES)).toBe(true);
      expect(RETENTION_CODES.length).toBeGreaterThan(0);
    });

    it('should have retention codes with required properties', () => {
      RETENTION_CODES.forEach(code => {
        expect(code).toHaveProperty('code');
        expect(code).toHaveProperty('description');
        
        expect(typeof code.code).toBe('string');
        expect(typeof code.description).toBe('string');
        expect(code.code.length).toBeGreaterThan(0);
        expect(code.description.length).toBeGreaterThan(0);
      });
    });

    it('should have unique retention codes', () => {
      const codes = RETENTION_CODES.map(item => item.code);
      const uniqueCodes = [...new Set(codes)];
      expect(codes.length).toBe(uniqueCodes.length);
    });

    it('should contain expected retention codes', () => {
      const codes = RETENTION_CODES.map(item => item.code);
      
      // Check for some expected codes
      expect(codes).toContain('A');
      expect(codes).toContain('B');
      expect(codes).toContain('C');
    });
  });

  describe('Data integrity', () => {
    it('should not have undefined or null values in critical constants', () => {
      expect(DEFAULT_SETTINGS).not.toBeNull();
      expect(DEFAULT_SETTINGS).not.toBeUndefined();
      
      expect(ALL_DEPARTMENTS).not.toBeNull();
      expect(ALL_DEPARTMENTS).not.toBeUndefined();
      
      expect(INITIAL_STORAGE_STRUCTURE).not.toBeNull();
      expect(INITIAL_STORAGE_STRUCTURE).not.toBeUndefined();
      
      expect(RETENTION_CODES).not.toBeNull();
      expect(RETENTION_CODES).not.toBeUndefined();
    });

    it('should maintain referential integrity between constants', () => {
      // Check that department categories match expected values
      const departmentCategories = ALL_DEPARTMENTS.map(d => d.category);
      departmentCategories.forEach(category => {
        expect(['Tıbbi', 'İdari']).toContain(category);
      });
    });
  });
});