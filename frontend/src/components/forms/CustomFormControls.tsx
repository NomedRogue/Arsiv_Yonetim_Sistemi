import React from 'react';

type CustomInputProps = React.ComponentProps<'input'> & {
  label: string;
};

export const CustomInput = ({ label, className, ...props }: CustomInputProps) => (
  <div className={className}>
    <label
      htmlFor={props.id || props.name}
      className="block mb-2 text-sm font-medium"
    >
      {label}
    </label>
    <input
      {...props}
      id={props.id || props.name}
      className="bg-white border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5 dark:bg-slate-600 dark:border-gray-500 dark:placeholder-gray-400 dark:text-white transition-colors duration-300"
    />
  </div>
);

type CustomSelectProps = React.ComponentProps<'select'> & {
  label: string;
};

export const CustomSelect = ({ label, children, ...props }: CustomSelectProps) => (
  <div>
    <label
      htmlFor={props.id || props.name}
      className="block mb-2 text-sm font-medium"
    >
      {label}
    </label>
    <select
      {...props}
      id={props.id || props.name}
      className="bg-white border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5 dark:bg-slate-600 dark:border-gray-500 dark:placeholder-gray-400 dark:text-white disabled:opacity-50 transition-colors duration-300"
    >
      {children}
    </select>
  </div>
);
