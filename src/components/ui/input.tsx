import * as React from "react";

import { cn } from "@/lib/utils";

const Input = React.forwardRef<HTMLInputElement, React.ComponentProps<"input">>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          "flex h-10 w-full rounded-[10px] border border-[rgba(210,170,185,0.25)] bg-[#F3F3F5] px-3.5 py-2 text-[12.5px] transition-all duration-200 ease-out file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-text-subtle focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-[#B8516B]/10 focus-visible:border-[#B8516B]/40 disabled:cursor-not-allowed disabled:opacity-50 text-[#1A0E14]",
          className
        )}
        ref={ref}
        {...props}
      />
    );
  }
);
Input.displayName = "Input";

export { Input };
