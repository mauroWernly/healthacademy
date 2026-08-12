"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const TABS = [
  { href: "", label: "Resumen" },
  { href: "/datos", label: "Datos personales" },
  { href: "/documentacion", label: "Documentación" },
  { href: "/materias", label: "Materias" },
  { href: "/notas", label: "Notas" },
  { href: "/asistencia", label: "Asistencia" },
  { href: "/trabajos-practicos", label: "Trabajos prácticos" },
  { href: "/pagos", label: "Pagos" },
  { href: "/practicas", label: "Prácticas" },
  { href: "/tesina", label: "Tesina" },
  { href: "/historial", label: "Historial" },
];

export function StudentNav({ studentId }: { studentId: string }) {
  const pathname = usePathname();
  const basePath = `/alumnas/${studentId}`;

  return (
    <nav className="flex flex-wrap gap-1 border-b border-border">
      {TABS.map((tab) => {
        const href = `${basePath}${tab.href}`;
        const isActive = tab.href === "" ? pathname === basePath : pathname === href || pathname.startsWith(`${href}/`);
        return (
          <Link
            key={tab.href}
            href={href}
            aria-current={isActive ? "page" : undefined}
            className={cn(
              "-mb-px rounded-t-md px-3 py-2 text-sm font-medium transition-colors",
              isActive
                ? "border-b-2 border-accent text-accent"
                : "border-b-2 border-transparent text-foreground/60 hover:bg-foreground/[0.04] hover:text-foreground"
            )}
          >
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}
