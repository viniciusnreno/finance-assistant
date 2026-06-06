"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const links = [
  { href: "/dashboard", label: "Visão Geral", exact: true },
  { href: "/dashboard/transactions", label: "Transações", exact: false },
];

export function NavLinks() {
  const pathname = usePathname();

  return (
    <nav className="hidden sm:flex items-center gap-1">
      {links.map(({ href, label, exact }) => {
        const isActive = exact ? pathname === href : pathname.startsWith(href);
        return (
          <Link
            key={href}
            href={href}
            className={cn(
              "px-3 py-1.5 rounded-md text-sm transition-colors",
              isActive
                ? "text-foreground bg-accent font-medium"
                : "text-muted-foreground hover:text-foreground hover:bg-accent",
            )}
          >
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
