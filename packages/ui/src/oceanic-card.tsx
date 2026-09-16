import React from 'react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: any[]) {
  return twMerge(clsx(inputs));
}

export interface OceanicCardProps extends React.HTMLAttributes<HTMLDivElement> {
  glow?: boolean;
  interactive?: boolean;
}

export const OceanicCard = React.forwardRef<HTMLDivElement, OceanicCardProps>(
  ({ className, glow = false, interactive = false, children, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          'relative overflow-hidden rounded-2xl border transition-all duration-300',
          'bg-[#0c1527]/80 backdrop-blur-xl border-cyan-500/20 text-slate-100 shadow-xl shadow-cyan-950/20',
          glow && 'before:absolute before:-inset-px before:rounded-2xl before:bg-gradient-to-r before:from-cyan-500/20 before:to-teal-500/10 before:pointer-events-none',
          interactive && 'hover:border-cyan-400/50 hover:shadow-cyan-500/10 hover:-translate-y-0.5 cursor-pointer',
          className
        )}
        {...props}
      >
        {children}
      </div>
    );
  }
);

OceanicCard.displayName = 'OceanicCard';
