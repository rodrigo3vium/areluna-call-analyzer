import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { LoaderCircle } from "lucide-react";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "btn-primary inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-pill ring-offset-background transition-all duration-300 ease-standard focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-60 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 [&_svg]:[stroke-width:1.6]",
  {
    variants: {
      variant: {
        primary: "bg-primary-800 text-primary-foreground hover:shadow-gold-glow",
        secondary:
          "border border-border bg-transparent text-primary-900 hover:bg-primary-800 hover:text-primary-foreground",
        ghost: "bg-transparent text-primary-900 hover:bg-sand",
        soft: "bg-sand text-foreground hover:bg-gold-200",
        link: "text-primary-700 underline-offset-4 hover:underline",
        // aliases legados (mantêm call sites shadcn compilando)
        default: "bg-primary-800 text-primary-foreground hover:shadow-gold-glow",
        destructive: "bg-error text-error-foreground hover:bg-error/90",
        outline:
          "border border-border bg-transparent text-primary-900 hover:bg-primary-800 hover:text-primary-foreground",
      },
      size: {
        sm: "px-4 py-2 text-[11px]",
        md: "px-7 py-3 text-[12px]",
        lg: "px-10 py-4 text-[13px]",
        icon: "h-10 w-10",
        // alias legado
        default: "px-7 py-3 text-[12px]",
      },
    },
    defaultVariants: {
      variant: "primary",
      size: "md",
    },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>, VariantProps<typeof buttonVariants> {
  asChild?: boolean;
  loading?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    { className, variant, size, asChild = false, loading = false, disabled, children, ...props },
    ref,
  ) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        disabled={disabled || loading}
        {...props}
      >
        {loading ? (
          <>
            <LoaderCircle className="animate-spin" />
            {children}
          </>
        ) : (
          children
        )}
      </Comp>
    );
  },
);
Button.displayName = "Button";

export { Button, buttonVariants };
