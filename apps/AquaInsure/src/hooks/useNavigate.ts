'use client';

import { useRouter } from 'next/navigation';
import { useCallback } from 'react';

export function useNavigate() {
  const router = useRouter();

  const navigate = useCallback(
    (to: string | number, options?: { replace?: boolean }) => {
      if (typeof to === 'number') {
        if (to === -1) {
          router.back();
        } else if (to === 1) {
          router.forward();
        }
      } else {
        if (options?.replace) {
          router.replace(to);
        } else {
          router.push(to);
        }
      }
    },
    [router]
  );

  return navigate;
}

export default useNavigate;
