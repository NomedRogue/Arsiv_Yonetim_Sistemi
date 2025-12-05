// Dashboard feature-specific types

// Re-export shared types needed by dashboard
export type {
  Category,
  CheckoutStatus,
  FolderStatus,
  Log,
  StorageType,
  Folder,
  Settings,
  StorageStructure,
  DashboardStats,
} from '@/types';

// Dashboard component props
export interface DashboardProps {
  onNavigate: (page: string, params?: any) => void;
}

// Dashboard card data structure
export interface DashboardCardData {
  title: string;
  value: number | string;
  icon: React.ComponentType<any>;
  onClick?: () => void;
}

// Monthly data point for charts
export interface MonthlyDataPoint {
  month: string;
  count: number;
}
