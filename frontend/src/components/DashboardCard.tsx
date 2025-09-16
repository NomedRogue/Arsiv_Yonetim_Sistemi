import React from 'react';
import { LucideProps } from 'lucide-react';

interface DashboardCardProps {
  title: string;
  value: string | number;
  icon: React.ComponentType<LucideProps>;
  color: string;
}

export const DashboardCard: React.FC<DashboardCardProps> = React.memo(({ title, value, icon: Icon, color }) => {
  return (
    <div className="relative bg-white dark:bg-archive-dark-panel p-6 rounded-xl shadow-lg flex items-center transition hover:scale-105 duration-300 hover:z-10">
      <div className={`p-4 rounded-full transition-colors duration-300`} style={{ backgroundColor: `${color}20` }}>
        <Icon size={32} style={{ color }} />
      </div>
      <div className="ml-4">
        <p className="text-sm text-gray-500 dark:text-gray-400 transition-colors duration-300">{title}</p>
        <p className="text-2xl font-bold text-gray-800 dark:text-white transition-colors duration-300">{value}</p>
      </div>
    </div>
  );
});
