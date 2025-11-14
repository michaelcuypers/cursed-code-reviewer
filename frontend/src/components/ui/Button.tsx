import React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  children: React.ReactNode;
}

export const Button: React.FC<ButtonProps> = ({
  variant = 'primary',
  size = 'md',
  className = '',
  children,
  ...props
}) => {
  const baseStyles = 'font-medium rounded-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-haunted-orange disabled:opacity-50 disabled:cursor-not-allowed';
  
  const variantStyles = {
    primary: 'bg-phantom-purple text-ghostly-white hover:bg-shadow-purple hover:shadow-lg hover:shadow-phantom-purple/50',
    secondary: 'bg-graveyard-gray text-ghostly-white border-2 border-phantom-purple hover:bg-phantom-purple/20 hover:shadow-lg hover:shadow-phantom-purple/30',
    danger: 'bg-blood-red text-ghostly-white hover:bg-red-700 hover:shadow-lg hover:shadow-blood-red/50',
    ghost: 'bg-transparent text-ghostly-white hover:bg-graveyard-gray border border-ghostly-white/20',
  };
  
  const sizeStyles = {
    sm: 'px-3 py-1.5 text-sm',
    md: 'px-4 py-2 text-base',
    lg: 'px-6 py-3 text-lg',
  };
  
  return (
    <button
      className={`${baseStyles} ${variantStyles[variant]} ${sizeStyles[size]} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
};
