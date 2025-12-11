import React from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';

interface AccordionSectionProps {
  title: string;
  isOpen: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}

export const AccordionSection: React.FC<AccordionSectionProps> = ({ 
  title, 
  isOpen, 
  onToggle, 
  children 
}) => (
  <div className="bg-white dark:bg-archive-dark-panel rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
    <button
      onClick={onToggle}
      className="w-full px-6 py-4 text-left flex items-center justify-between bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-inset"
    >
      <h2 className="text-base font-bold text-gray-900 dark:text-white">{title}</h2>
      {isOpen ? (
        <ChevronDown className="w-5 h-5 text-gray-500 dark:text-gray-400 transition-transform duration-200" />
      ) : (
        <ChevronRight className="w-5 h-5 text-gray-500 dark:text-gray-400 transition-transform duration-200" />
      )}
    </button>
    <div className={`transition-all duration-300 ease-in-out ${isOpen ? 'max-h-[125rem] opacity-100' : 'max-h-0 opacity-0 overflow-hidden'}`}>
      <div className="p-6">
        {children}
      </div>
    </div>
  </div>
);
