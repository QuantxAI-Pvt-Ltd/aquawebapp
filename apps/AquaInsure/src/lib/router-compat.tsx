'use client';
import './polyfills';

import React, { useCallback, useMemo } from 'react';
import { useRouter, usePathname, useParams as useNextParams, useSearchParams } from 'next/navigation';
import NextLink from 'next/link';

export function useNavigate() {
  const router = useRouter();

  return useCallback(
    (to: string | number, options?: { replace?: boolean }) => {
      if (typeof to === 'number') {
        if (to === -1) router.back();
        else if (to === 1) router.forward();
      } else {
        if (options?.replace) router.replace(to);
        else router.push(to);
      }
    },
    [router]
  );
}

export function useLocation() {
  const pathname = usePathname() || '/';
  let search = '';
  try {
    const searchParams = useSearchParams();
    search = searchParams?.toString() ? `?${searchParams.toString()}` : '';
  } catch {
    // static export fallback
    search = '';
  }

  return useMemo(
    () => ({
      pathname,
      search,
      hash: '',
      state: null,
      key: 'default',
    }),
    [pathname, search]
  );
}

export function useParams<T extends Record<string, string | string[]> = Record<string, string>>() {
  return (useNextParams() || {}) as T;
}

export interface LinkProps extends Omit<React.AnchorHTMLAttributes<HTMLAnchorElement>, 'href'> {
  to: string;
  replace?: boolean;
}

export const Link = React.forwardRef<HTMLAnchorElement, LinkProps>(
  ({ to, replace, children, ...props }, ref) => {
    return (
      <NextLink href={to} replace={replace} ref={ref} {...props}>
        {children}
      </NextLink>
    );
  }
);
Link.displayName = 'Link';

export const NavLink = Link;
export type NavLinkProps = LinkProps;

export function BrowserRouter({ children }: { children?: React.ReactNode; basename?: string }) {
  return <>{children}</>;
}

export function Routes({ children }: { children?: React.ReactNode }) {
  return <>{children}</>;
}

export function Route(_props: { path?: string; element?: React.ReactNode; index?: boolean }) {
  return null;
}
