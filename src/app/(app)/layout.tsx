import { redirect } from "next/navigation";
import Link from "next/link";
import { auth, signOut } from "@/server/auth/config";
import { can } from "@/server/auth/permissions";
import { Button } from "@/components/ui/button";

const NAV_ITEMS: Array<{ href: string; label: string; permission?: Parameters<typeof can>[1] }> = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/alumnas", label: "Alumnas", permission: "student:read" },
  { href: "/materias", label: "Materias", permission: "academic:read" },
  { href: "/pagos", label: "Pagos", permission: "payment:read" },
  { href: "/practicas", label: "Prácticas", permission: "academic:read" },
  { href: "/tesinas", label: "Tesinas", permission: "academic:read" },
  { href: "/reportes", label: "Reportes", permission: "report:read" },
  { href: "/configuracion", label: "Configuración", permission: "config:write" },
];

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session?.user) {
    redirect("/login");
  }

  const permissions = session.user.permissions;
  const visibleNav = NAV_ITEMS.filter((item) => !item.permission || can(permissions, item.permission));

  return (
    <div className="flex min-h-screen">
      <aside className="hidden w-60 shrink-0 flex-col border-r border-slate-200 bg-white md:flex">
        <div className="border-b border-slate-100 px-5 py-4">
          <p className="text-sm font-semibold text-slate-900">Instituto Superior de</p>
          <p className="text-sm font-semibold text-slate-900">Cosmetología Integral</p>
        </div>
        <nav className="flex-1 space-y-0.5 px-3 py-4">
          {visibleNav.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="block rounded-md px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 hover:text-slate-900"
            >
              {item.label}
            </Link>
          ))}
        </nav>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex items-center justify-between border-b border-slate-200 bg-white px-6 py-3">
          <form action="/alumnas" method="GET" className="w-full max-w-sm">
            <input
              type="search"
              name="q"
              placeholder="Buscar por nombre, apellido, DNI o legajo..."
              className="w-full rounded-md border border-slate-300 px-3 py-1.5 text-sm focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500"
            />
          </form>
          <div className="flex items-center gap-3">
            <div className="text-right text-sm">
              <p className="font-medium text-slate-900">{session.user.name}</p>
              <p className="text-xs text-slate-500">{session.user.roleName}</p>
            </div>
            <form
              action={async () => {
                "use server";
                await signOut({ redirectTo: "/login" });
              }}
            >
              <Button type="submit" variant="outline" size="sm">
                Salir
              </Button>
            </form>
          </div>
        </header>
        <main className="flex-1 bg-slate-50 p-6">{children}</main>
      </div>
    </div>
  );
}
