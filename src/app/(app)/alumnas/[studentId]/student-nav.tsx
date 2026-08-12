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
    <nav className="flex flex-wrap gap-1 border-b border-slate-200">
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
                ? "border-b-2 border-slate-900 text-slate-900"
                : "border-b-2 border-transparent text-slate-600 hover:bg-slate-100 hover:text-slate-900"
            )}
          >
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}
