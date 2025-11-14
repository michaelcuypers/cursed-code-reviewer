import React from 'react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  icon?: React.ReactNode;
}

export const Input: React.FC<InputProps> = ({
  label,
  error,
  icon,
  className = '',
  ...props
}) => {
  return (
    <div className="w-full">
      {label && (
        <label className="block text-sm font-medium text-ghostly-white mb-2">
          {label}
        </label>
      )}
      <div className="relative">
        {icon && (
          <div className="absolute left-3 top-1/2 transform -translate-y-1/2 text-ghostly-white/50">
            {icon}
          </div>
        )}
        <input
          className={`
            w-full px-4 py-2 bg-cursed-black text-ghostly-white
            border-2 border-phantom-purple/30 rounded-lg
            focus:outline-none focus:ring-2 focus:ring-haunted-orange focus:border-haunted-orange
            placeholder:text-ghostly-white/40
            transition-all duration-200
            ${icon ? 'pl-10' : ''}
            ${error ? 'border-blood-red focus:ring-blood-red focus:border-blood-red' : ''}
            ${className}
          `}
          {...props}
        />
      </div>
      {error && (
        <p className="mt-1 text-sm text-blood-red">
          {error}
        </p>
      )}
    </div>
  );
};

interface TextAreaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
}

export const TextArea: React.FC<TextAreaProps> = ({
  label,
  error,
  className = '',
  ...props
}) => {
  return (
    <div className="w-full">
      {label && (
        <label className="block text-sm font-medium text-ghostly-white mb-2">
          {label}
        </label>
      )}
      <textarea
        className={`
          w-full px-4 py-2 bg-cursed-black text-ghostly-white
          border-2 border-phantom-purple/30 rounded-lg
          focus:outline-none focus:ring-2 focus:ring-haunted-orange focus:border-haunted-orange
          placeholder:text-ghostly-white/40
          transition-all duration-200
          font-mono
          ${error ? 'border-blood-red focus:ring-blood-red focus:border-blood-red' : ''}
          ${className}
        `}
        {...props}
      />
      {error && (
        <p className="mt-1 text-sm text-blood-red">
          {error}
        </p>
      )}
    </div>
  );
};
