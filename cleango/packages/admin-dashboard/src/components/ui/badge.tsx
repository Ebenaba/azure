import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
  {
    variants: {
      variant: {
        default:
          "border-transparent bg-[#2E7D32] text-white hover:bg-[#388E3C]",
        secondary:
          "border-transparent bg-[#1565C0] text-white hover:bg-[#1976D2]",
        success:
          "border-transparent bg-green-100 text-green-800 border-green-200",
        warning:
          "border-transparent bg-amber-100 text-amber-800 border-amber-200",
        destructive:
          "border-transparent bg-red-100 text-red-800 border-red-200",
        outline: "text-foreground border-gray-300",
        accent:
          "border-transparent bg-[#F9A825] text-black",
        purple:
          "border-transparent bg-purple-100 text-purple-800 border-purple-200",
        blue:
          "border-transparent bg-blue-100 text-blue-800 border-blue-200",
        orange:
          "border-transparent bg-orange-100 text-orange-800 border-orange-200",
        gray:
          "border-transparent bg-gray-100 text-gray-800 border-gray-200",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  );
}

export { Badge, badgeVariants };
