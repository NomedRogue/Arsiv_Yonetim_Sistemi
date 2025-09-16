import React from 'react';
import { Log } from '@/types';
import { 
  FileText, Settings, Save, Trash2, ShieldAlert, ShieldCheck, 
  FolderPlus, Edit, FileOutput, RotateCcw, BookX, 
  FolderCog, FolderMinus, HardDrive, HardDriveDownload
} from 'lucide-react';

const getLogIcon = (log: Log): React.ReactNode => {
    const iconProps = { size: 16 };
    // Log tipine göre ikon ve renk belirleme
    switch (log.type) {
        case 'settings_update':
            return <Settings {...iconProps} className="text-gray-500 dark:text-gray-400" />;
        case 'backup':
            return <Save {...iconProps} className="text-blue-500" />;
        case 'backup_cleanup':
            return <HardDrive {...iconProps} className="text-yellow-500" />;
        case 'backup_delete':
            return <HardDriveDownload {...iconProps} className="text-rose-500" />;
        case 'backup_error':
            return <ShieldAlert {...iconProps} className="text-red-500" />;
        case 'restore':
            return <ShieldCheck {...iconProps} className="text-green-500" />;
        case 'create':
            return <FolderPlus {...iconProps} className="text-green-500" />;
        case 'update':
            return <Edit {...iconProps} className="text-blue-500" />;
        case 'delete':
            return <FolderMinus {...iconProps} className="text-red-500" />;
        case 'checkout':
        case 'checkout_update':
            return <FileOutput {...iconProps} className="text-orange-500" />;
        case 'return':
            return <RotateCcw {...iconProps} className="text-teal-500" />;
        case 'dispose':
            return <BookX {...iconProps} className="text-purple-500" />;
        case 'department_add':
        case 'department_update':
        case 'department_delete':
        case 'location_add':
        case 'location_update':
        case 'location_delete':
            return <FolderCog {...iconProps} className="text-indigo-500" />;
        default:
            return <FileText {...iconProps} className="text-gray-500 dark:text-gray-400" />;
    }
};

const RecentActivityListInternal: React.FC<{ logs: Log[] }> = ({ logs }) => {
  return (
    <div className="bg-white dark:bg-archive-dark-panel p-6 rounded-xl shadow-lg transition-colors duration-300">
      <h3 className="text-lg font-bold text-gray-800 dark:text-white mb-4 transition-colors duration-300">Son İşlemler</h3>
      <ul className="space-y-3">
        {logs.slice(0, 5).map((log) => (
          <li
            key={log.id}
            className="flex items-start text-sm pb-2 border-b border-gray-200 dark:border-gray-700 last:border-b-0 transition-colors duration-300"
          >
            <div className="p-2 bg-gray-100 dark:bg-slate-700 rounded-full mr-3 mt-1 transition-colors duration-300">
              {getLogIcon(log)}
            </div>
            <div>
              <p className="text-gray-700 dark:text-gray-300 transition-colors duration-300">{log.details}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400 transition-colors duration-300">
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