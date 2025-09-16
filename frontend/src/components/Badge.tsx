

import React from 'react';

interface BadgeProps {
  text: string;
  color: 'green' | 'blue' | 'yellow' | 'red' | 'orange' | 'gray';
}

export const Badge: React.FC<BadgeProps> = React.memo(({ text, color }) => {
  const colorClasses = {
    green: 'bg-status-green/20 text-status-green border border-status-green/30',
    blue: 'bg-status-blue/20 text-status-blue border border-status-blue/30',
    yellow: 'bg-status-yellow/20 text-status-yellow border border-status-yellow/30',
    red: 'bg-status-red/20 text-status-red border border-status-red/30',
    orange: 'bg-status-orange/20 text-status-orange border border-status-orange/30',
    gray: 'bg-gray-500/20 text-gray-500 dark:text-gray-300 border border-gray-500/30',
  };

  return (
    <span className={`px-2 py-1 text-xs font-semibold rounded-full ${colorClasses[color]}`}>
      {text}
    </span>
  );
});
