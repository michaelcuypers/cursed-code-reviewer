import React from 'react';

interface BadgeProps {
  children: React.ReactNode;
  variant?: 'minor' | 'moderate' | 'critical' | 'success' | 'default';
  className?: string;
}

export const Badge: React.FC<BadgeProps> = ({
  children,
  variant = 'default',
  className = '',
}) => {
  const baseStyles = 'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium';
  
  const variantStyles = {
    minor: 'bg-toxic-green/20 text-toxic-green border border-toxic-green/50',
    moderate: 'bg-haunted-orange/20 text-haunted-orange border border-haunted-orange/50',
    critical: 'bg-blood-red/20 text-blood-red border border-blood-red/50 animate-pulse-slow',
    success: 'bg-toxic-green/20 text-toxic-green border border-toxic-green/50',
    default: 'bg-phantom-purple/20 text-phantom-purple border border-phantom-purple/50',
  };
  
  return (
    <span className={`${baseStyles} ${variantStyles[variant]} ${className}`}>
      {children}
    </span>
  );
};
