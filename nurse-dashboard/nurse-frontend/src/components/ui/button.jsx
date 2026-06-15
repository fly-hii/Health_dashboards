import React from 'react';
import { cn } from '../../utils';

export const Button = React.forwardRef(({ className, variant = 'default', size = 'default', ...props }, ref) => {
  return (
    <button
      ref={ref}
      className={cn(
        "inline-flex items-center justify-center rounded-sm font-medium transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 disabled:opacity-50 disabled:pointer-events-none",
        {
          // variants
          'bg-primary text-white hover:bg-primary-dark shadow-sm': variant === 'default',
          'border border-border bg-white text-slate-700 hover:bg-slate-50': variant === 'outline',
          'hover:bg-slate-50 text-slate-600 hover:text-slate-900': variant === 'ghost',
          'underline-offset-4 hover:underline text-primary': variant === 'link',
          // sizes
          'h-10 py-2 px-4 text-sm': size === 'default',
          'h-9 px-3 rounded text-xs': size === 'sm',
          'h-11 px-8 rounded text-base': size === 'lg',
        },
        className
      )}
      {...props}
    />
  );
});
Button.displayName = "Button";
