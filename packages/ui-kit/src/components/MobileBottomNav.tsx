import * as React from "react";
import { cn } from "../lib/utils";

export interface BottomNavItem {
  id: string;
  icon: string;
  label: string;
}

export interface MobileBottomNavProps extends React.HTMLAttributes<HTMLElement> {
  items: BottomNavItem[];
  activeId: string;
  onItemClick?: (id: string) => void;
}

export const MobileBottomNav = React.forwardRef<HTMLElement, MobileBottomNavProps>(
  ({ className, items, activeId, onItemClick, ...props }, ref) => {
    return (
      <nav
        ref={ref}
        className={cn(
          "fixed bottom-0 left-0 w-full z-50 bg-[#fcf9f4]/95 backdrop-blur-xl border-t border-outline-variant/10 px-6 pt-3 pb-8 shadow-[0_-4px_24px_rgba(0,0,0,0.02)]",
          className
        )}
        {...props}
      >
        <div className="max-w-2xl mx-auto flex justify-between items-center">
          {items.map((item) => {
            const isActive = item.id === activeId;
            return (
              <button
                key={item.id}
                onClick={() => onItemClick?.(item.id)}
                className={cn("flex flex-col items-center gap-1 group transition-opacity", {
                  "opacity-100": isActive,
                  "opacity-40 hover:opacity-100": !isActive,
                })}
              >
                <div
                  className={cn(
                    "w-12 h-8 flex items-center justify-center mb-0.5 transition-colors",
                    isActive ? "rounded-full bg-surface-container-highest" : ""
                  )}
                >
                  <span
                    className={cn(
                      "material-symbols-outlined text-2xl transition-all",
                      isActive ? "text-primary active-nav" : "text-on-surface"
                    )}
                    style={isActive ? { fontVariationSettings: "'FILL' 1" } : undefined}
                  >
                    {item.icon}
                  </span>
                </div>
                <span
                  className={cn(
                    "text-[11px] transition-colors",
                    isActive ? "font-bold text-primary" : "font-medium text-on-surface"
                  )}
                >
                  {item.label}
                </span>
              </button>
            );
          })}
        </div>
      </nav>
    );
  }
);
MobileBottomNav.displayName = "MobileBottomNav";
