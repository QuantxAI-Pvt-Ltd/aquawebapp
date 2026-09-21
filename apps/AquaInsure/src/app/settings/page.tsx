'use client';

import dynamic from 'next/dynamic';

const SettingsPage = dynamic(() => import('@/views/settings/SettingsPage'), { ssr: false });

export default function Settings() {
  return <SettingsPage />;
}
