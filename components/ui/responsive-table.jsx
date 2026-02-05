"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * ResponsiveTable - A mobile-friendly table wrapper
 * On mobile, converts table rows to card-like display
 */
const ResponsiveTable = React.forwardRef(({ className, children, ...props }, ref) => (
  <div 
    ref={ref}
    className={cn("w-full overflow-auto", className)}
    {...props}
  >
    <table className="w-full caption-bottom text-sm">
      {children}
    </table>
  </div>
));
ResponsiveTable.displayName = "ResponsiveTable";

/**
 * MobileCard - Card display for mobile table rows
 */
const MobileCard = React.forwardRef(({ className, children, ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      "bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 p-4 mb-3 md:hidden",
      className
    )}
    {...props}
  >
    {children}
  </div>
));
MobileCard.displayName = "MobileCard";

/**
 * MobileCardRow - Row inside mobile card
 */
const MobileCardRow = React.forwardRef(({ label, value, className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      "flex items-center justify-between py-2 border-b border-slate-100 dark:border-slate-800 last:border-0",
      className
    )}
    {...props}
  >
    <span className="text-sm text-slate-500 dark:text-slate-400">{label}</span>
    <span className="text-sm font-medium text-slate-900 dark:text-white">{value}</span>
  </div>
));
MobileCardRow.displayName = "MobileCardRow";

/**
 * DesktopOnly - Content shown only on desktop
 */
const DesktopOnly = React.forwardRef(({ className, children, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("hidden md:block", className)}
    {...props}
  >
    {children}
  </div>
));
DesktopOnly.displayName = "DesktopOnly";

/**
 * MobileOnly - Content shown only on mobile
 */
const MobileOnly = React.forwardRef(({ className, children, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("block md:hidden", className)}
    {...props}
  >
    {children}
  </div>
));
MobileOnly.displayName = "MobileOnly";

export { ResponsiveTable, MobileCard, MobileCardRow, DesktopOnly, MobileOnly };
