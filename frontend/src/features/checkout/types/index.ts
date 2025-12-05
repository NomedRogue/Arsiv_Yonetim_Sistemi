// Checkout feature-specific types

// Re-export shared types needed by checkout
export type {
  Checkout,
  CheckoutStatus,
  CheckoutType,
  Folder,
  Category,
} from '@/types';

// Checkout with folder data
export type CheckoutWithFolder = Checkout & { folder: Folder };

// Checkout form state
export interface CheckoutFormState {
  checkoutType: CheckoutType;
  documentDescription: string;
  personName: string;
  personSurname: string;
  personPhone: string;
  reason: string;
  /** YYYY-MM-DD */
  plannedReturnDate: string;
}
