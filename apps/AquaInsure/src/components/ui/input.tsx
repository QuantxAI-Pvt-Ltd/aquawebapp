import * as React from "react";

import { cn } from "@/lib/utils";

const Input = React.forwardRef<HTMLInputElement, React.ComponentProps<"input">>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          "flex w-full px-4 border h-12 rounded-xl text-sm border-stone-200 bg-stone-50 focus-visible:ring-teal-500/25 focus-visible:border-teal-500 placeholder:text-stone-300 flex-1",
          className
        )}
        ref={ref}
        {...props}
      />
    );
  },
);
Input.displayName = "Input";

export { Input };
