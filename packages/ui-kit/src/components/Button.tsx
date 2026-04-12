import * as React from "react";
import { cn } from "../lib/utils";

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "success" | "outline" | "ghost" | "surface" | "icon";
  size?: "default" | "sm" | "lg" | "icon";
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "primary", size = "default", ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={cn(
          "inline-flex items-center justify-center rounded-xl font-label transition-all focus:outline-none focus:ring-2 focus:ring-primary/10 disabled:opacity-50 disabled:pointer-events-none whitespace-nowrap",
          {
            "bg-primary text-white hover:brightness-105 font-bold": variant === "primary",
            "bg-success text-white hover:brightness-105 font-bold shadow-md shadow-success/10": variant === "success",
            "border border-outline-variant/20 bg-transparent text-primary hover:bg-surface-container-high font-medium": variant === "outline",
            "bg-transparent text-on-surface-variant hover:text-primary font-medium": variant === "ghost",
            "bg-surface-container-low text-on-surface-variant hover:bg-surface-container-high font-medium": variant === "surface",
            "bg-transparent text-on-surface-variant/40 hover:text-primary material-symbols-outlined rounded-full": variant === "icon",
          },
          {
            "px-6 py-2.5 text-sm": size === "default",
            "px-5 py-2 text-xs": size === "sm",
            "px-8 py-3 text-base": size === "lg",
            "p-2": size === "icon",
          },
          className
        )}
        {...props}
      />
    );
  }
);
Button.displayName = "Button";
