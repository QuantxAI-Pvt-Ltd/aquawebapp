'use client';

import dynamic from 'next/dynamic';
import { PolicyCardSkeleton } from '@/components/ViewSkeletons';

const InsuredPonds = dynamic(
  () => import('@/views/insurance/InsuredPonds'),
  {
    ssr: false,
    loading: () => <PolicyCardSkeleton />,
  }
);

export default function InsuredPondsPage() {
  return <InsuredPonds />;
}
