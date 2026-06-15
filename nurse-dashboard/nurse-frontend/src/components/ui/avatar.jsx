import React, { useState } from 'react';
import { cn } from '../../utils';

export const Avatar = React.forwardRef(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("relative flex h-10 w-10 shrink-0 overflow-hidden rounded-full border border-border", className)}
    {...props}
  />
));
Avatar.displayName = "Avatar";

export const AvatarImage = React.forwardRef(({ className, src, onError, ...props }, ref) => {
  const [failed, setFailed] = useState(false);

  if (failed || !src) return null;

  return (
    <img
      ref={ref}
      src={src}
      onError={(e) => {
        setFailed(true);
        if (onError) onError(e);
      }}
      className={cn("aspect-square h-full w-full object-cover", className)}
      {...props}
    />
  );
});
AvatarImage.displayName = "AvatarImage";

export const AvatarFallback = React.forwardRef(({ className, children, ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      "flex h-full w-full items-center justify-center rounded-full bg-gradient-to-br from-teal-50 to-teal-100 text-sm font-bold text-[#0EA5A4] select-none",
      className
    )}
    {...props}
  >
    {children}
  </div>
));
AvatarFallback.displayName = "AvatarFallback";
