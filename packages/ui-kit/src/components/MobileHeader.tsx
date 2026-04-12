import * as React from "react";
import { cn } from "../lib/utils";

export interface MobileHeaderProps extends React.HTMLAttributes<HTMLElement> {
  onMenuClick?: () => void;
  onSearchClick?: () => void;
  title?: string;
}

export const MobileHeader = React.forwardRef<HTMLElement, MobileHeaderProps>(
  ({ className, onMenuClick, onSearchClick, title = "记忆收件箱", ...props }, ref) => {
    return (
      <header
        ref={ref}
        className={cn(
          "fixed top-0 left-0 w-full z-50 bg-[#fcf9f4]/90 backdrop-blur-md border-b border-outline-variant/10",
          className
        )}
        {...props}
      >
        <div className="max-w-2xl mx-auto h-16 px-6 flex justify-between items-center">
          <div className="flex items-center gap-4">
            <button className="p-1 -ml-1 text-on-surface" onClick={onMenuClick}>
              <span className="material-symbols-outlined text-2xl">menu</span>
            </button>
            <h1 className="font-headline text-xl font-bold tracking-tight text-primary">{title}</h1>
          </div>
          <div className="flex items-center gap-4">
            <div className="w-2 h-2 rounded-full bg-secondary"></div>
            <button className="p-1 text-on-surface" onClick={onSearchClick}>
              <span className="material-symbols-outlined text-2xl">search</span>
            </button>
          </div>
        </div>
      </header>
    );
  }
);
MobileHeader.displayName = "MobileHeader";
