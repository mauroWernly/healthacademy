import { redirect } from "next/navigation";
import { auth, signOut } from "@/server/auth/config";
import { can } from "@/server/auth/permissions";
import { Button } from "@/components/ui/button";
import { SidebarNav } from "./sidebar-nav";
import { MobileNav } from "./mobile-nav";

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
      <aside className="hidden w-64 shrink-0 flex-col border-r border-border bg-surface md:flex">
        <div className="border-b border-border/70 px-6 py-5">
          <p className="font-serif text-base font-medium leading-snug text-foreground">Instituto Superior de</p>
          <p className="font-serif text-base font-medium leading-snug text-foreground">Cosmetología Integral</p>
        </div>
        <SidebarNav items={visibleNav} />
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex items-center justify-between gap-3 border-b border-border bg-surface px-4 py-3.5 sm:px-6">
          <div className="flex min-w-0 flex-1 items-center gap-3">
            <MobileNav items={visibleNav} />
            <form action="/alumnas" method="GET" className="w-full max-w-sm">
              <input
                type="search"
                name="q"
                placeholder="Buscar por nombre, apellido, DNI o legajo..."
                className="w-full rounded-lg border border-border bg-background px-3 py-1.5 text-sm text-foreground placeholder:text-muted focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent/40"
              />
            </form>
          </div>
          <div className="flex items-center gap-4">
            <div className="hidden text-right text-sm sm:block">
              <p className="font-medium text-foreground">{session.user.name}</p>
              <p className="text-xs text-muted">{session.user.roleName}</p>
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
        <main className="flex-1 bg-background p-6 md:p-8">{children}</main>
      </div>
    </div>
  );
}
