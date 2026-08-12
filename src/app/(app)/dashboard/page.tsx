import Link from "next/link";
import { auth } from "@/server/auth/config";
import { getDashboardData } from "@/server/services/dashboard.service";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

const ALERT_ICON: Record<string, string> = { red: "🔴", orange: "🟠", yellow: "🟡" };

export default async function DashboardPage() {
  const session = await auth();
  const data = await getDashboardData(session!.user.institutionId);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-serif text-2xl font-medium tracking-tight text-stone-900">Dashboard</h1>
        <p className="text-sm text-stone-500">Centro de control administrativo — problemas, alertas y acción.</p>
      </div>

      {data.alerts.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Alertas</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {data.alerts.map((alert, i) => (
              <Link
                key={i}
                href={alert.href}
                className="flex items-center gap-2 rounded-md px-2 py-1.5 text-sm text-stone-700 hover:bg-stone-50"
              >
                <span>{ALERT_ICON[alert.level]}</span>
                <span>{alert.message}</span>
              </Link>
            ))}
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {data.indicators.map((indicator) => (
          <Link key={indicator.label} href={indicator.href}>
            <Card className="h-full transition-shadow hover:shadow-md">
              <CardContent className="py-5">
                <p className="text-3xl font-semibold text-stone-900">{indicator.value}</p>
                <p className="mt-1 text-sm text-stone-500">{indicator.label}</p>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      {data.alerts.length === 0 && (
        <Badge tone="green">No hay alertas activas — todo está bajo control.</Badge>
      )}
    </div>
  );
}
