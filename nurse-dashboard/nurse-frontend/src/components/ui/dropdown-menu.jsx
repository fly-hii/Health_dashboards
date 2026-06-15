import React, { useState, createContext, useContext, useRef, useEffect } from 'react';
import { cn } from '../../utils';

const DropdownMenuContext = createContext(null);

export const DropdownMenu = ({ children }) => {
  const [open, setOpen] = useState(false);
  const containerRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <DropdownMenuContext.Provider value={{ open, setOpen }}>
      <div ref={containerRef} className="relative inline-block text-left">
        {children}
      </div>
    </DropdownMenuContext.Provider>
  );
};

export const DropdownMenuTrigger = ({ children, asChild, ...props }) => {
  const { open, setOpen } = useContext(DropdownMenuContext);
  
  const handleClick = (e) => {
    setOpen(!open);
  };

  if (asChild && React.isValidElement(children)) {
    return React.cloneElement(children, {
      onClick: (e) => {
        handleClick(e);
        if (children.props.onClick) children.props.onClick(e);
      },
      ...props
    });
  }

  return (
    <button onClick={handleClick} type="button" {...props}>
      {children}
    </button>
  );
};

export const DropdownMenuContent = ({ className, children, ...props }) => {
  const { open } = useContext(DropdownMenuContext);

  if (!open) return null;

  return (
    <div
      className={cn(
        "absolute right-0 z-50 mt-2 w-56 origin-top-right rounded-md bg-white border border-border shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none py-1",
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
};

export const DropdownMenuItem = ({ className, children, onClick, ...props }) => {
  const { setOpen } = useContext(DropdownMenuContext);

  const handleItemClick = (e) => {
    if (onClick) onClick(e);
    setOpen(false);
  };

  return (
    <div
      onClick={handleItemClick}
      className={cn(
        "block px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 cursor-pointer transition-colors font-medium",
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
};
