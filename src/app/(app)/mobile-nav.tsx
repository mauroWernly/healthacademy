"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, X } from "lucide-react";
import { cn } from "@/lib/utils";
import type { SidebarNavItem } from "./sidebar-nav";

export function MobileNav({ items }: { items: SidebarNavItem[] }) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  return (
    <div className="md:hidden">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label={open ? "Cerrar menú" : "Abrir menú"}
        aria-expanded={open}
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-border text-foreground/70 transition-colors hover:bg-foreground/[0.06]"
      >
        {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
      </button>

      {open && (
        <div className="fixed inset-0 z-40 bg-foreground/20" onClick={() => setOpen(false)}>
          <nav
            onClick={(e) => e.stopPropagation()}
            className="absolute left-0 top-0 flex h-full w-64 flex-col border-r border-border bg-surface shadow-xl"
          >
            <div className="border-b border-border/70 px-6 py-5">
              <p className="font-serif text-base font-medium leading-snug text-foreground">Instituto Superior de</p>
              <p className="font-serif text-base font-medium leading-snug text-foreground">Cosmetología Integral</p>
            </div>
            <div className="flex-1 space-y-0.5 px-3 py-4">
              {items.map((item) => {
                const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setOpen(false)}
                    aria-current={isActive ? "page" : undefined}
                    className={cn(
                      "block rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                      isActive ? "bg-accent text-accent-foreground" : "text-foreground/70 hover:bg-foreground/[0.06] hover:text-foreground"
                    )}
                  >
                    {item.label}
                  </Link>
                );
              })}
            </div>
          </nav>
        </div>
      )}
    </div>
  );
}
