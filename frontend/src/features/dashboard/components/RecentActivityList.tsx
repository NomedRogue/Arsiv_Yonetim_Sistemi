import React from 'react';
import { Log } from '@/types';
import { getLogIcon } from '../utils/logHelpers';

const RecentActivityListInternal: React.FC<{ logs: Log[] }> = ({ logs }) => {
  return (
    <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-lg transition-colors duration-300 border border-gray-200 dark:border-slate-700">
      <h3 className="text-sm xl:text-base font-bold text-gray-800 dark:text-white mb-4 transition-colors duration-300">Son İşlemler</h3>
      <ul className="space-y-3">
        {logs.slice(0, 6).map((log) => (
          <li
            key={log.id}
            className="flex items-start text-xs xl:text-sm pb-2 border-b border-gray-200 dark:border-gray-700 last:border-b-0 transition-colors duration-300"
          >
            <div className="p-2 bg-gray-100 dark:bg-slate-700 rounded-full mr-3 mt-1 transition-colors duration-300 flex-shrink-0">
              {getLogIcon(log)}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-gray-700 dark:text-gray-300 transition-colors duration-300 break-words">{log.details}</p>
              <p className="text-[10px] xl:text-xs text-gray-500 dark:text-gray-400 transition-colors duration-300 mt-1">
                {new Date(log.timestamp).toLocaleString()}
              </p>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
};

export const RecentActivityList = React.memo(RecentActivityListInternal);
