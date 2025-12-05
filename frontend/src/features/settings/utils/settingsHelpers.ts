import type { Settings } from '../types';
import { DEFAULT_SETTINGS } from '@/constants';

/**
 * Get backup frequency from settings with fallback to default
 */
export const getBackupFrequency = (settings: Settings): Settings['backupFrequency'] => {
  return (settings.backupFrequency ?? DEFAULT_SETTINGS.backupFrequency) as Settings['backupFrequency'];
};

/**
 * Get backup time from settings with fallback to default
 */
export const getBackupTime = (settings: Settings): string => {
  return settings.backupTime ?? DEFAULT_SETTINGS.backupTime;
};

/**
 * Get backup retention count from settings with fallback to default
 */
export const getBackupRetention = (settings: Settings): number => {
  return Number(settings.backupRetention ?? DEFAULT_SETTINGS.backupRetention);
};

/**
 * Format file size in bytes to MB
 */
export const formatFileSize = (sizeInBytes: number): string => {
  return (sizeInBytes / (1024 * 1024)).toFixed(2);
};

/**
 * Check if backup frequency is active
 */
export const isBackupActive = (frequency: Settings['backupFrequency']): boolean => {
  return frequency !== 'Kapalı';
};
