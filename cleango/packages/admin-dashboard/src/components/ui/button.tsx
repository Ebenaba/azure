import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        default:
          "bg-[#2E7D32] text-white hover:bg-[#388E3C] active:bg-[#1B5E20]",
        destructive:
          "bg-red-600 text-white hover:bg-red-700 active:bg-red-800",
        outline:
          "border border-input bg-background hover:bg-gray-50 hover:text-foreground",
        secondary:
          "bg-[#1565C0] text-white hover:bg-[#1976D2] active:bg-[#0D47A1]",
        ghost: "hover:bg-gray-100 hover:text-foreground",
        link: "text-[#2E7D32] underline-offset-4 hover:underline",
        accent:
          "bg-[#F9A825] text-black hover:bg-[#F57F17] active:bg-[#E65100]",
      },
      size: {
        default: "h-10 px-4 py-2",
        sm: "h-9 rounded-md px-3",
        lg: "h-11 rounded-md px-8",
        icon: "h-10 w-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, ...props }, ref) => {
    return (
      <button
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    );
  }
);
Button.displayName = "Button";

export { Button, buttonVariants };
