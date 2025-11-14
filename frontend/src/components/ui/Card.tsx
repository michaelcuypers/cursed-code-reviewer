import React from 'react';

interface CardProps {
  children: React.ReactNode;
  className?: string;
  variant?: 'default' | 'elevated' | 'bordered';
}

export const Card: React.FC<CardProps> = ({
  children,
  className = '',
  variant = 'default',
}) => {
  const baseStyles = 'bg-graveyard-gray rounded-lg p-6';
  
  const variantStyles = {
    default: 'border border-phantom-purple/30',
    elevated: 'shadow-xl shadow-phantom-purple/20 border border-phantom-purple/50',
    bordered: 'border-2 border-phantom-purple',
  };
  
  return (
    <div className={`${baseStyles} ${variantStyles[variant]} ${className}`}>
      {children}
    </div>
  );
};

interface CardHeaderProps {
  children: React.ReactNode;
  className?: string;
}

export const CardHeader: React.FC<CardHeaderProps> = ({ children, className = '' }) => {
  return (
    <div className={`mb-4 pb-4 border-b border-phantom-purple/30 ${className}`}>
      {children}
    </div>
  );
};

interface CardTitleProps {
  children: React.ReactNode;
  className?: string;
}

export const CardTitle: React.FC<CardTitleProps> = ({ children, className = '' }) => {
  return (
    <h3 className={`text-xl font-bold text-ghostly-white font-creepster ${className}`}>
      {children}
    </h3>
  );
};

interface CardContentProps {
  children: React.ReactNode;
  className?: string;
}

export const CardContent: React.FC<CardContentProps> = ({ children, className = '' }) => {
  return (
    <div className={`text-ghostly-white ${className}`}>
      {children}
    </div>
  );
};
