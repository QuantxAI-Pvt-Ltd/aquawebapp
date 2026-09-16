'use client';

import dynamic from 'next/dynamic';
import type { Props as ApexProps } from 'react-apexcharts';
import { Skeleton } from '@/components/ui/skeleton';

const ReactApexChart = dynamic(() => import('react-apexcharts'), {
  ssr: false,
  loading: () => <Skeleton className="h-[350px] w-full rounded-xl" />,
});

interface ChartProps extends ApexProps {
  className?: string;
}

export default function ApexChart({ className, ...props }: ChartProps) {
  return (
    <div className={className}>
      <ReactApexChart {...props} />
    </div>
  );
}
