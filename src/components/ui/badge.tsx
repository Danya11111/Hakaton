import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
  {
    variants: {
      variant: {
        default: "border-transparent bg-primary text-primary-foreground shadow",
        secondary: "border-transparent bg-secondary text-secondary-foreground",
        outline: "text-foreground",
        success:
          "border-transparent bg-emerald-500/15 text-emerald-800 ring-1 ring-emerald-500/30",
        warn: "border-transparent bg-amber-500/20 text-amber-950 ring-1 ring-amber-500/35",
        muted: "border-transparent bg-slate-500/10 text-slate-700 ring-1 ring-slate-500/20",
        /** For status chips on dark / gradient cards (e.g. integral score): light label on tinted glass. */
        statusOnDarkLeader:
          "border-transparent bg-emerald-500/35 text-emerald-50 ring-1 ring-emerald-200/50 shadow-none",
        statusOnDarkGood:
          "border-transparent bg-indigo-400/30 text-indigo-50 ring-1 ring-indigo-200/45 shadow-none",
        statusOnDarkMid:
          "border-transparent bg-amber-500/45 text-amber-50 ring-1 ring-amber-200/55 shadow-none",
        statusOnDarkLow:
          "border-transparent bg-rose-500/40 text-rose-50 ring-1 ring-rose-200/50 shadow-none",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { Badge, badgeVariants };
