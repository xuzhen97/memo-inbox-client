import * as React from "react";
import { cn } from "../lib/utils";

export interface TagProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: "solid" | "subtle";
  children: React.ReactNode;
}

export const Tag = React.forwardRef<HTMLSpanElement, TagProps>(
  ({ className, variant = "subtle", children, ...props }, ref) => {
    return (
      <span
        ref={ref}
        className={cn(
          "inline-flex items-center justify-center font-bold",
          {
            "px-2 py-1 bg-success/10 text-success text-[10px] rounded-md uppercase tracking-tighter": variant === "subtle",
            "px-3 py-1.5 bg-surface-container-high/50 hover:bg-surface-container-high rounded-lg text-xs font-label text-primary transition-all": variant === "solid",
          },
          className
        )}
        {...props}
      >
        {children}
      </span>
    );
  }
);
Tag.displayName = "Tag";
