'use client';

import dynamic from 'next/dynamic';

const FarmerRegistration = dynamic(
  () => import('@/pages/farmer/FarmerRegistration'),
  {
    ssr: false,
    loading: () => (
      <div className="min-h-[100dvh] bg-stone-50 flex items-center justify-center">
        <div className="w-8 h-8 rounded-full border-2 border-teal-600 border-t-transparent animate-spin" />
      </div>
    ),
  }
);

export default function FarmerRegistrationPage() {
  return <FarmerRegistration />;
}
