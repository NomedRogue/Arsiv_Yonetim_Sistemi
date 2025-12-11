import React from 'react';
import { Sun, Moon, PanelLeft, User } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';

interface HeaderProps {
  pageTitle: string;
  theme: 'light' | 'dark';
  toggleTheme: () => void;
  toggleSidebar: () => void;
}

export const Header: React.FC<HeaderProps> = ({ pageTitle, theme, toggleTheme, toggleSidebar }) => {
  const { user } = useAuth();

  return (
    <header className="layout-header bg-white dark:bg-slate-800 px-4 flex justify-between items-center shadow-md sticky top-0 z-20 transition-colors duration-300 border-b border-gray-200 dark:border-slate-700" style={{ height: '56px' }}>
      <div className="flex items-center">
        <button onClick={toggleSidebar} className="text-gray-600 dark:text-gray-300 mr-3 p-1.5 rounded-md hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors duration-300 group" title="Menüyü Aç/Kapat">
          <PanelLeft className="w-5 h-5 group-hover:scale-105 transition-transform" />
        </button>
        <h1 className="text-lg font-bold text-gray-800 dark:text-archive-dark-text transition-colors duration-300">{pageTitle}</h1>
      </div>
      <div className="flex items-center space-x-4">
        {/* User Info */}
        {user && (
            <div className="flex items-center gap-2 px-3 py-1.5 bg-gray-50 dark:bg-slate-700/50 rounded-full border border-gray-100 dark:border-slate-600">
                <div className="w-6 h-6 rounded-full bg-teal-100 dark:bg-teal-900 flex items-center justify-center">
                    <User className="w-3.5 h-3.5 text-teal-700 dark:text-teal-400" />
                </div>
                <span className="text-sm font-medium text-gray-700 dark:text-gray-200 hidden sm:block">
                    {user.username}
                </span>
            </div>
        )}

        {/* Theme Toggle Button */}
        <button
          onClick={toggleTheme}
          className="p-2 rounded-full bg-archive-secondary hover:bg-teal-100 dark:bg-slate-600 dark:hover:bg-slate-500 text-archive-primary dark:text-yellow-300 transition-colors duration-300 shadow-sm"
          title={theme === 'light' ? 'Koyu Mod' : 'Açık Mod'}
        >
          {theme === 'light' ? <Moon style={{ width: '1.25em', height: '1.25em' }} /> : <Sun style={{ width: '1.25em', height: '1.25em' }} />}
        </button>
      </div>
    </header>
  );
};
