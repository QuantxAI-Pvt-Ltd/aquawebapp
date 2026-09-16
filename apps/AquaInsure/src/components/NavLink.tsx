'use client';

import NextLink from "next/link";
import { usePathname } from "next/navigation";
import { forwardRef } from "react";
import { cn } from "@/lib/utils";

export interface NavLinkCompatProps extends Omit<React.AnchorHTMLAttributes<HTMLAnchorElement>, 'href'> {
  to: string;
  className?: string;
  activeClassName?: string;
  pendingClassName?: string;
}

export type NavLinkProps = NavLinkCompatProps;

const NavLink = forwardRef<HTMLAnchorElement, NavLinkCompatProps>(
  ({ className, activeClassName, to, children, ...props }, ref) => {
    const pathname = usePathname();
    const isActive = pathname === to;

    return (
      <NextLink
        ref={ref}
        href={to}
        className={cn(className, isActive && activeClassName)}
        {...props}
      >
        {children}
      </NextLink>
    );
  },
);

NavLink.displayName = "NavLink";

export { NavLink };
export default NavLink;
