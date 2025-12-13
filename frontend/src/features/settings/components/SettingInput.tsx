import React from 'react';
import type { Settings } from '../types';

interface SettingInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
  id: keyof Settings | string;
  unit?: string;
}

export const SettingInput: React.FC<SettingInputProps> = ({ 
  label, 
  id, 
  unit, 
  className,
  ...props 
}) => (
  <div>
    <label htmlFor={String(id)} className="block text-xs xl:text-sm font-medium text-gray-700 dark:text-gray-300">
      {label}
    </label>
    <div className="mt-1 relative rounded-md shadow-sm">
      <input
        name={String(id)}
        id={String(id)}
        className={`block w-full p-1.5 xl:p-2 text-xs xl:text-sm border border-gray-300 rounded-md bg-white text-gray-900 dark:bg-slate-600 dark:border-gray-500 dark:text-gray-200 disabled:opacity-50 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${props.type === 'time' ? 'pr-3' : unit ? 'pr-12' : ''} ${className || ''}`}
        style={props.type === 'time' ? { textAlign: 'left' } : undefined}
        {...props}
      />
      {unit && props.type !== 'time' && (
        <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
          <span className="text-gray-500 text-xs xl:text-sm dark:text-gray-400">{unit}</span>
        </div>
      )}
    </div>
  </div>
);
