'use client';

import dynamic from 'next/dynamic';
import { FormSkeleton } from '@/components/ViewSkeletons';

const FarmerRegistration = dynamic(
  () => import('@/views/farmer/FarmerRegistration'),
  {
    ssr: false,
    loading: () => <FormSkeleton />,
  }
);

export default function FarmerRegistrationPage() {
  return <FarmerRegistration />;
}
