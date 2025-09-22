import React from 'react';
import { Sun, Moon, Menu } from 'lucide-react';

interface HeaderProps {
  pageTitle: string;
  theme: 'light' | 'dark';
  toggleTheme: () => void;
  toggleSidebar: () => void;
}

export const Header: React.FC<HeaderProps> = ({ pageTitle, theme, toggleTheme, toggleSidebar }) => {
  return (
    <header className="bg-white dark:bg-slate-800 p-4 flex justify-between items-center shadow-md sticky top-0 z-20 h-[69px] transition-colors duration-300 border-b border-gray-200 dark:border-slate-700">
      <div className="flex items-center">
        <button onClick={toggleSidebar} className="text-gray-600 dark:text-gray-300 mr-4 p-2 rounded-full hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors duration-300">
          <Menu size={24} />
        </button>
        <h1 className="text-xl font-bold text-gray-800 dark:text-archive-dark-text transition-colors duration-300">{pageTitle}</h1>
      </div>
      <div className="flex items-center space-x-2">
        {/* Theme Toggle Button */}
        <button
          onClick={toggleTheme}
          className="p-2 rounded-full bg-archive-secondary hover:bg-blue-200 dark:bg-slate-600 dark:hover:bg-slate-500 text-archive-primary dark:text-yellow-300 transition-colors duration-300"
        >
          {theme === 'light' ? <Moon size={20} /> : <Sun size={20} />}
        </button>
      </div>
    </header>
  );
};
