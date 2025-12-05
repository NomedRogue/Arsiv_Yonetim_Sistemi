import { Checkout } from '@/types';

/**
 * Converts unknown date value to Date object
 */
export const toDate = (d: unknown): Date => (d instanceof Date ? d : new Date(d as any));

/**
 * Determines the card color based on planned return date
 * Red: Overdue
 * Yellow: Due within 3 days
 * Default: Normal
 */
export const getCheckoutCardColor = (checkout: Checkout): string => {
  const plannedReturn = toDate(checkout.plannedReturnDate);
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const diffDays = (plannedReturn.getTime() - now.getTime()) / (1000 * 3600 * 24);

  if (diffDays < 0) return 'border-l-4 border-status-red bg-red-50 dark:bg-red-900/20';
  if (diffDays <= 3) return 'border-l-4 border-status-yellow bg-yellow-50 dark:bg-yellow-900/20';
  return 'border-l-4 border-transparent bg-white dark:bg-archive-dark-panel';
};

/**
 * Calculates days until/since return date
 * Positive: days until return
 * Negative: days overdue
 */
export const getDaysUntilReturn = (checkout: Checkout): number => {
  const plannedReturn = toDate(checkout.plannedReturnDate);
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  return Math.ceil((plannedReturn.getTime() - now.getTime()) / (1000 * 3600 * 24));
};

/**
 * Formats return status text with appropriate color
 */
export const getReturnStatusText = (daysUntil: number): { text: string; colorClass: string } => {
  if (daysUntil < 0) {
    return {
      text: `${Math.abs(daysUntil)} gün gecikmiş`,
      colorClass: 'text-status-red font-bold'
    };
  }
  if (daysUntil === 0) {
    return {
      text: 'Bugün iade edilmeli',
      colorClass: 'text-status-yellow font-bold'
    };
  }
  if (daysUntil <= 3) {
    return {
      text: `${daysUntil} gün kaldı`,
      colorClass: 'text-status-yellow font-semibold'
    };
  }
  return {
    text: `${daysUntil} gün kaldı`,
    colorClass: 'text-gray-600 dark:text-gray-400'
  };
};
