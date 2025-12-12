import React from 'react';
import type { Settings } from '../types';

interface SettingInputProps {
  label: string;
  id: keyof Settings | string;
  value: string | number;
  type?: string;
  unit?: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  disabled?: boolean;
}

export const SettingInput: React.FC<SettingInputProps> = ({ 
  label, 
  id, 
  value, 
  type = 'number', 
  unit, 
  onChange, 
  disabled = false 
}) => (
  <div>
    <label htmlFor={String(id)} className="block text-xs xl:text-sm font-medium text-gray-700 dark:text-gray-300">
      {label}
    </label>
    <div className="mt-1 relative rounded-md shadow-sm">
      <input
        type={type}
        name={String(id)}
        id={String(id)}
        value={value}
        onChange={onChange}
        disabled={disabled}
        className={`block w-full p-1.5 xl:p-2 text-xs xl:text-sm border border-gray-300 rounded-md bg-white text-gray-900 dark:bg-slate-600 dark:border-gray-500 dark:text-gray-200 disabled:opacity-50 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${type === 'time' ? 'pr-3' : unit ? 'pr-12' : ''}`}
        style={type === 'time' ? { textAlign: 'left' } : undefined}
      />
      {unit && type !== 'time' && (
        <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
          <span className="text-gray-500 text-xs xl:text-sm dark:text-gray-400">{unit}</span>
        </div>
      )}
    </div>
  </div>
);
