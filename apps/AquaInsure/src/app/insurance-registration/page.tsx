'use client';

import dynamic from 'next/dynamic';
import { FormSkeleton } from '@/components/ViewSkeletons';

const InsuranceRegistration = dynamic(
  () => import('@/views/insurance/InsuranceRegistration'),
  {
    ssr: false,
    loading: () => <FormSkeleton />,
  }
);

export default function InsuranceRegistrationPage() {
  return <InsuranceRegistration />;
}
