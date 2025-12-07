import React from 'react';

interface FilePathInputProps {
  label: string;
  id: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onBrowseClick: () => void;
}

export const FilePathInput: React.FC<FilePathInputProps> = ({ 
  label, 
  id, 
  value, 
  onChange, 
  onBrowseClick 
}) => (
  <div>
    <label htmlFor={id} className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
      {label}
    </label>
    <div className="flex rounded-md shadow-sm">
      <input
        type="text"
        name={id}
        id={id}
        value={value}
        onChange={onChange}
        className="flex-1 block p-2 sm:text-sm border border-gray-300 rounded-l-md bg-white text-gray-900 dark:bg-slate-600 dark:border-gray-500 dark:text-gray-200 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
      />
      <button
        type="button"
        onClick={onBrowseClick}
        className="inline-flex items-center px-4 py-2 border border-l-0 border-gray-300 dark:border-gray-500 rounded-r-md bg-teal-600 hover:bg-teal-700 text-white text-sm font-medium transition-colors"
      >
        <span>Gözat...</span>
      </button>
    </div>
  </div>
);
