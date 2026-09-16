import React from 'react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: any[]) {
  return twMerge(clsx(inputs));
}

export interface StatMetricProps {
  label: string;
  value: string | number;
  sublabel?: string;
  icon?: React.ReactNode;
  trend?: {
    value: string;
    positive?: boolean;
  };
  variant?: 'cyan' | 'teal' | 'emerald' | 'amber' | 'coral';
  className?: string;
}

const variantStyles = {
  cyan: {
    border: 'border-cyan-500/20 hover:border-cyan-500/40',
    iconBg: 'bg-cyan-500/10 text-cyan-400',
    glow: 'shadow-cyan-950/20',
  },
  teal: {
    border: 'border-teal-500/20 hover:border-teal-500/40',
    iconBg: 'bg-teal-500/10 text-teal-400',
    glow: 'shadow-teal-950/20',
  },
  emerald: {
    border: 'border-emerald-500/20 hover:border-emerald-500/40',
    iconBg: 'bg-emerald-500/10 text-emerald-400',
    glow: 'shadow-emerald-950/20',
  },
  amber: {
    border: 'border-amber-500/20 hover:border-amber-500/40',
    iconBg: 'bg-amber-500/10 text-amber-400',
    glow: 'shadow-amber-950/20',
  },
  coral: {
    border: 'border-rose-500/20 hover:border-rose-500/40',
    iconBg: 'bg-rose-500/10 text-rose-400',
    glow: 'shadow-rose-950/20',
  },
};

export const StatMetric: React.FC<StatMetricProps> = ({
  label,
  value,
  sublabel,
  icon,
  trend,
  variant = 'cyan',
  className,
}) => {
  const styles = variantStyles[variant];

  return (
    <div
      className={cn(
        'relative overflow-hidden rounded-2xl border p-5 transition-all duration-300',
        'bg-[#0c1527]/80 backdrop-blur-xl text-slate-100 shadow-xl',
        styles.border,
        styles.glow,
        className
      )}
    >
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-medium uppercase tracking-wider text-slate-400">{label}</p>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-bold tracking-tight text-white">{value}</span>
            {trend && (
              <span
                className={cn(
                  'text-xs font-semibold px-1.5 py-0.5 rounded-md',
                  trend.positive
                    ? 'text-emerald-400 bg-emerald-500/10'
                    : 'text-rose-400 bg-rose-500/10'
                )}
              >
                {trend.value}
              </span>
            )}
          </div>
          {sublabel && <p className="mt-1 text-xs text-slate-400">{sublabel}</p>}
        </div>

        {icon && (
          <div className={cn('p-2.5 rounded-xl border border-white/5', styles.iconBg)}>
            {icon}
          </div>
        )}
      </div>
    </div>
  );
};
