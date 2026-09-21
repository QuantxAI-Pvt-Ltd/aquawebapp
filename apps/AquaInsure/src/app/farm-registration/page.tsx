'use client';

import dynamic from 'next/dynamic';
import { FormSkeleton } from '@/components/ViewSkeletons';

const FarmRegistration = dynamic(
  () => import('@/views/farm/FarmRegistration'),
  {
    ssr: false,
    loading: () => <FormSkeleton />,
  }
);

export default function FarmRegistrationPage() {
  return <FarmRegistration />;
}
