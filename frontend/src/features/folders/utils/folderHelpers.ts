/**
 * Folder Feature Utility Functions
 * Helper functions for folder operations, formatting, and color mapping
 */

import type { Folder, Location, StorageType, FolderStatus, Category } from '../types';

/**
 * Badge color type (matches Badge component prop)
 */
export type BadgeColor = 'green' | 'yellow' | 'red' | 'blue' | 'orange' | 'gray';

// ============================================================================
// FORMATTING UTILITIES
// ============================================================================

/**
 * Format location object to human-readable string
 * @param location - Location object (can be partial)
 * @returns Formatted location string
 * 
 * @example
 * formatLocation({ storageType: 'Kompakt', unit: 1, face: 'A', section: 2, shelf: 3 })
 * // Returns: "Ünite 1 - A - 2.Bölüm - 3.Raf"
 * 
 * formatLocation({ storageType: 'Stand', stand: 5, shelf: 2 })
 * // Returns: "Stand 5 - 2.Raf"
 */
export const formatLocation = (location: Partial<Location> | Location): string => {
  if (!location || !location.storageType) {
    return 'Konumsuz';
  }
  
  if (location.storageType === 'Kompakt') {
    const { unit, face, section, shelf } = location;
    if (!unit || !face || !section || !shelf) {
      return 'Kompakt (Eksik Bilgi)';
    }
    return `Ünite ${unit} - ${face} - ${section}.Bölüm - ${shelf}.Raf`;
  }
  
  if (location.storageType === 'Stand') {
    const { stand, shelf } = location;
    if (!stand || !shelf) {
      return 'Stand (Eksik Bilgi)';
    }
    return `Stand ${stand} - ${shelf}.Raf`;
  }
  
  return 'Bilinmeyen Lokasyon Tipi';
};

/**
 * Format folder details for logging purposes
 * @param folder - Folder object
 * @param departmentName - Department name
 * @returns Formatted log string with all folder details
 * 
 * @example
 * getFolderLogDetails(folder, "Kardiyoloji")
 * // Returns: "[Kardiyoloji] "Hasta Kayıtları" (Kod: 2024-001, Yıl: 2024, Sayı: 150, Klinik: Kardiyoloji, Lokasyon: Ünite 1 - A - 2.Bölüm - 3.Raf)"
 */
export const getFolderLogDetails = (folder: Folder, departmentName: string): string => {
  const parts = [
    `[${departmentName}]`,
    `"${folder.subject}"`,
    `(Kod: ${folder.fileCode},`,
    `Yıl: ${folder.fileYear},`,
    `Sayı: ${folder.fileCount},`,
  ];
  
  if (folder.clinic) {
    parts.push(`Klinik: ${folder.clinic},`);
  }
  
  parts.push(`Lokasyon: ${formatLocation(folder.location)})`);
  return parts.join(' ');
};

// ============================================================================
// COLOR MAPPING UTILITIES
// ============================================================================

/**
 * Get badge color for folder status
 * Maps FolderStatus enum to Badge color prop
 * 
 * @param status - Folder status
 * @returns Badge color
 * 
 * @example
 * getStatusColor('Arşivde') // Returns: 'green'
 * getStatusColor('Çıkışta') // Returns: 'yellow'
 * getStatusColor('İmha')    // Returns: 'red'
 */
export const getStatusColor = (status: FolderStatus | string): BadgeColor => {
  switch (status) {
    case 'Arşivde':
      return 'green';
    case 'Çıkışta':
      return 'yellow';
    case 'İmha':
      return 'red';
    default:
      return 'gray';
  }
};

/**
 * Get badge color for folder category
 * Maps Category enum to Badge color prop
 * 
 * @param category - Folder category
 * @returns Badge color
 * 
 * @example
 * getCategoryColor('Tıbbi')  // Returns: 'green'
 * getCategoryColor('İdari')  // Returns: 'blue'
 */
export const getCategoryColor = (category: Category | string): BadgeColor => {
  switch (category) {
    case 'Tıbbi':
      return 'green';
    case 'İdari':
      return 'blue';
    default:
      return 'gray';
  }
};

// ============================================================================
// API UTILITIES
// ============================================================================

/**
 * Get API URL for the given path
 * Handles dev vs production environment differences
 * 
 * In development: Uses Vite proxy (/api -> http://localhost:3001/api)
 * In production: Direct backend URL
 * 
 * @param path - API endpoint path (with or without leading slash)
 * @returns Full API URL
 * 
 * @example
 * getApiUrl('/folders') 
 * // Dev:  '/api/folders'
 * // Prod: 'http://localhost:3001/api/folders'
 */
export const getApiUrl = (path: string): string => {
  const baseUrl = import.meta.env.DEV ? '/api' : 'http://localhost:3001/api';
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  return `${baseUrl}${normalizedPath}`;
};

/**
 * Simple API path helper (for use with fetch)
 * In dev mode, uses Vite proxy
 * 
 * @param path - API endpoint path
 * @returns API path
 * 
 * @example
 * api('/folders') // Returns: '/api/folders'
 */
export const api = (path: string): string => {
  return `/api${path.startsWith('/') ? '' : '/'}${path}`;
};

// ============================================================================
// VALIDATION UTILITIES
// ============================================================================

/**
 * Check if location is complete based on storage type
 * @param location - Location object
 * @returns true if location has all required fields
 */
export const isLocationComplete = (location: Partial<Location>): boolean => {
  if (!location.storageType) return false;
  
  if (location.storageType === 'Kompakt') {
    return !!(location.unit && location.face && location.section && location.shelf);
  }
  
  if (location.storageType === 'Stand') {
    return !!(location.stand && location.shelf);
  }
  
  return false;
};

/**
 * Validate file code format
 * @param fileCode - File code string
 * @returns true if valid
 */
export const isValidFileCode = (fileCode: string): boolean => {
  return fileCode.trim().length > 0 && fileCode.length <= 100;
};

/**
 * Validate file year
 * @param year - Year number
 * @returns true if valid (between 1900 and 2100)
 */
export const isValidFileYear = (year: number): boolean => {
  return year >= 1900 && year <= 2100;
};
