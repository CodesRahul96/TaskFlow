import React from 'react';

/**
 * Professional Loader Component
 * @param {('spinner'|'dots'|'overlay'|'skeleton')} variant - The visual style of the loader.
 * @param {string} className - Additional CSS classes.
 * @param {string} size - Size override for spinner/dots.
 */
export default function Loader({ variant = 'spinner', className = '', size = 'md', children }) {
  const sizeClasses = {
    xs: 'w-3 h-3',
    sm: 'w-4 h-4',
    md: 'w-6 h-6',
    lg: 'w-10 h-10',
    xl: 'w-16 h-16'
  };

  const selectedSize = sizeClasses[size] || sizeClasses.md;

  if (variant === 'spinner') {
    return (
      <div className={`inline-block ${selectedSize} border-2 border-white/20 border-t-white rounded-full animate-spin ${className}`} />
    );
  }

  if (variant === 'dots') {
    return (
      <div className={`flex items-center gap-1 ${className}`}>
        <div className="w-1.5 h-1.5 bg-current rounded-full animate-pulsate [animation-delay:-0.3s]" />
        <div className="w-1.5 h-1.5 bg-current rounded-full animate-pulsate [animation-delay:-0.15s]" />
        <div className="w-1.5 h-1.5 bg-current rounded-full animate-pulsate" />
      </div>
    );
  }

  if (variant === 'overlay') {
    return (
      <div className={`absolute inset-0 z-50 flex items-center justify-center glass rounded-xl animate-fade-in ${className}`}>
        <div className="flex flex-col items-center gap-3">
          <Loader variant="spinner" size="lg" className="border-t-accent-primary" />
          {children && <span className="text-sm font-medium text-text-secondary">{children}</span>}
        </div>
      </div>
    );
  }

  if (variant === 'skeleton') {
    return (
      <div className={`skeleton ${className}`}>
        {children}
      </div>
    );
  }

  return null;
}
