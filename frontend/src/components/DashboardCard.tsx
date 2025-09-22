import React from 'react';
import { LucideProps } from 'lucide-react';

interface DashboardCardProps {
  title: string;
  value: string | number;
  icon: React.ComponentType<LucideProps>;
  color: string;
  className?: string;
}

export const DashboardCard: React.FC<DashboardCardProps> = ({ title, value, icon: Icon, color, className }) => {
  return (
    <div 
      className={`dashboard-card bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 will-change-transform ${className || ''}`}
      style={{ containerType: 'inline-size' }}
    >
      <div className="dashboard-card-content p-4">
        <div className="flex items-center justify-between">
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-gray-600 dark:text-gray-300 truncate">{title}</p>
            <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1 leading-tight">{value}</p>
          </div>
          <div 
            className="icon-container flex-shrink-0 ml-3"
            style={{ color }}
          >
            <Icon className="dashboard-icon w-8 h-8" />
          </div>
        </div>
      </div>
    </div>
  );
};
