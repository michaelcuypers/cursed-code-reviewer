import React from 'react';

interface SpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export const Spinner: React.FC<SpinnerProps> = ({ size = 'md', className = '' }) => {
  const sizeStyles = {
    sm: 'w-4 h-4 border-2',
    md: 'w-8 h-8 border-3',
    lg: 'w-12 h-12 border-4',
  };
  
  return (
    <div
      className={`
        ${sizeStyles[size]}
        border-phantom-purple border-t-transparent
        rounded-full animate-spin
        ${className}
      `}
    />
  );
};

interface LoadingOverlayProps {
  message?: string;
}

export const LoadingOverlay: React.FC<LoadingOverlayProps> = ({
  message = 'Summoning dark forces...',
}) => {
  return (
    <div className="fixed inset-0 bg-cursed-black/80 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="text-center">
        <Spinner size="lg" className="mx-auto mb-4" />
        <p className="text-ghostly-white text-lg font-creepster animate-pulse">
          {message}
        </p>
      </div>
    </div>
  );
};
