const { describe, it, expect } = require('@jest/globals');

// We are testing a pure function, so we can import it directly.
const { shouldRunAutoBackup } = require('../backupScheduler');

describe('shouldRunAutoBackup', () => {
  const settingsDaily = { backupFrequency: 'Günlük', backupTime: '03:00', yedeklemeKlasoru: '/backups' };
  const settingsWeekly = { backupFrequency: 'Haftalık', backupTime: '03:00', yedeklemeKlasoru: '/backups' };
  const settingsOff = { backupFrequency: 'Kapalı', backupTime: '03:00' };

  // --- Test Scenarios ---
  it('should return false if frequency is "Kapalı"', () => {
    const now = new Date('2023-01-01T04:00:00Z');
    const state = { lastAutoIso: new Date('2022-12-31T04:00:00Z').toISOString() };
    expect(shouldRunAutoBackup(settingsOff, state, now)).toBe(false);
  });

  it('should return false if backup folder is not set', () => {
    const now = new Date('2023-01-01T04:00:00Z');
    const state = {};
    const settingsNoFolder = { ...settingsDaily, yedeklemeKlasoru: '' };
    expect(shouldRunAutoBackup(settingsNoFolder, state, now)).toBe(false);
  });

  it('should return false if it is before the scheduled time today', () => {
  const now = new Date(2023, 0, 1, 2, 0, 0); // 02:00, schedule is 03:00 (yerel saat)
  const state = { lastAutoIso: new Date(2022, 11, 31, 4, 0, 0).toISOString() };
    expect(shouldRunAutoBackup(settingsDaily, state, now)).toBe(false);
  });

  it('should return true for daily backup if last backup was yesterday and time has passed', () => {
    const now = new Date('2023-01-01T04:00:00Z'); // 04:00, schedule is 03:00
    const state = { lastAutoIso: new Date('2022-12-31T04:00:00Z').toISOString() };
    expect(shouldRunAutoBackup(settingsDaily, state, now)).toBe(true);
  });
  
  it('should return false for daily backup if it already ran today after the scheduled time', () => {
    const now = new Date('2023-01-01T05:00:00Z');
    const state = { lastAutoIso: new Date('2023-01-01T03:30:00Z').toISOString() }; // Ran at 03:30 today
    expect(shouldRunAutoBackup(settingsDaily, state, now)).toBe(false);
  });

  it('should return true for daily backup if it has never run before and time has passed', () => {
    const now = new Date('2023-01-01T04:00:00Z');
    const state = {}; // No last backup
    expect(shouldRunAutoBackup(settingsDaily, state, now)).toBe(true);
  });

  it('should return false for weekly backup if it ran less than 7 days ago', () => {
    const now = new Date('2023-01-08T04:00:00Z'); // 7 days later
    const state = { lastAutoIso: new Date('2023-01-02T04:00:00Z').toISOString() }; // Ran 6 days ago
    expect(shouldRunAutoBackup(settingsWeekly, state, now)).toBe(false);
  });
  
  it('should return true for weekly backup if it ran 7 or more days ago and time has passed', () => {
    const now = new Date('2023-01-08T04:00:00Z'); // 7 days later
    const state = { lastAutoIso: new Date('2023-01-01T04:00:00Z').toISOString() }; // Ran exactly 7 days ago
    expect(shouldRunAutoBackup(settingsWeekly, state, now)).toBe(true);
  });
  
  it('should return true for weekly backup if app was off for more than 7 days', () => {
    const now = new Date('2023-01-15T04:00:00Z'); // 14 days later
    const state = { lastAutoIso: new Date('2023-01-01T04:00:00Z').toISOString() };
    expect(shouldRunAutoBackup(settingsWeekly, state, now)).toBe(true);
  });
});