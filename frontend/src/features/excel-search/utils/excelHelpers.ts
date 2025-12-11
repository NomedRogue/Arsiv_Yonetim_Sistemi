/**
 * Get status badge color based on folder status
 */
export const getStatusBadgeColor = (status: string): string => {
  switch (status) {
    case 'Arşivde':
      return 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300';
    case 'Çıkışta':
      return 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300';
    default:
      return 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300';
  }
};

/**
 * Build API URL based on environment
 */
export const getApiUrl = (): string => {
  return import.meta.env.DEV ? '/api' : 'http://localhost:3001/api';
};
