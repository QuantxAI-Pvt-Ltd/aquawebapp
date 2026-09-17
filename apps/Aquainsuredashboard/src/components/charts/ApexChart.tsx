'use client';

import dynamic from 'next/dynamic';
import { useTheme } from 'next-themes';
import type { Props as ApexProps } from 'react-apexcharts';
import { Skeleton } from '@/components/ui/skeleton';

const ReactApexChart = dynamic(() => import('react-apexcharts'), {
  ssr: false,
  loading: () => <Skeleton className="h-[350px] w-full rounded-xl" />,
});

interface ChartProps extends ApexProps {
  className?: string;
}

export default function ApexChart({ className, options, ...props }: ChartProps) {
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === 'dark';

  const mergedOptions = {
    ...options,
    theme: {
      mode: isDark ? ('dark' as const) : ('light' as const),
      ...options?.theme,
    },
    grid: {
      borderColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)',
      strokeDashArray: 4,
      ...options?.grid,
    },
    xaxis: {
      ...options?.xaxis,
      labels: {
        style: {
          colors: isDark ? '#888888' : '#64748b',
          fontSize: '11px',
        },
        ...options?.xaxis?.labels,
      },
    },
    yaxis: Array.isArray(options?.yaxis)
      ? options.yaxis
      : {
          ...options?.yaxis,
          labels: {
            style: {
              colors: isDark ? '#888888' : '#64748b',
              fontSize: '11px',
            },
            ...options?.yaxis?.labels,
          },
        },
  };

  return (
    <div className={className}>
      <ReactApexChart options={mergedOptions} {...props} />
    </div>
  );
}
