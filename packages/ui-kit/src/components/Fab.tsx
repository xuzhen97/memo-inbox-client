import * as React from "react";
import { cn } from "../lib/utils";

export interface FabProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  icon?: string;
}

export const Fab = React.forwardRef<HTMLButtonElement, FabProps>(
  ({ className, icon = "edit_note", ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={cn(
          "fixed bottom-28 right-6 h-14 w-14 bg-primary text-white rounded-2xl shadow-[0_8px_24px_rgba(13,34,37,0.2)] flex items-center justify-center hover:scale-105 transition-transform z-50",
          className
        )}
        {...props}
      >
        <span className="material-symbols-outlined text-2xl">{icon}</span>
      </button>
    );
  }
);
Fab.displayName = "Fab";
