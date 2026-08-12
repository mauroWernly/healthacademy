import { auth } from "@/server/auth/config";
import { getInstitutionConfig } from "@/server/services/config.service";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { updateInstitutionConfigAction } from "./actions";

function Field({ label, name, defaultValue, step = "1" }: { label: string; name: string; defaultValue: number; step?: string }) {
  return (
    <div className="space-y-1">
      <label htmlFor={name} className="text-sm font-medium text-slate-700">
        {label}
      </label>
      <input
        id={name}
        name={name}
        type="number"
        step={step}
        defaultValue={defaultValue}
        required
        className="w-full rounded-md border border-slate-300 px-3 py-1.5 text-sm"
      />
    </div>
  );
}

export default async function ConfiguracionPage() {
  const session = await auth();
  const config = await getInstitutionConfig(session!.user.institutionId);

  return (
    <div className="max-w-2xl space-y-4">
      <div>
        <h1 className="text-xl font-semibold text-slate-900">Configuración institucional</h1>
        <p className="text-sm text-slate-500">
          Estas reglas se leen en tiempo real desde acá — nunca están hardcodeadas en el código (sección 46/47/70).
        </p>
      </div>

      <form action={updateInstitutionConfigAction} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Reglas académicas</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Asistencia mínima (%)" name="minAttendancePercent" defaultValue={config.minAttendancePercent} step="0.1" />
            <Field label="Nota mínima para promoción directa" name="minPartialGradeForPromotion" defaultValue={config.minPartialGradeForPromotion} step="0.1" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Reglas financieras</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Importe de cuota ($)" name="tuitionAmount" defaultValue={config.tuitionAmount} />
            <Field label="Día de vencimiento" name="tuitionDueDay" defaultValue={config.tuitionDueDay} />
            <Field label="Importe de recargo ($)" name="surchargeAmount" defaultValue={config.surchargeAmount} />
            <Field label="Día crítico (posible suspensión)" name="criticalDay" defaultValue={config.criticalDay} />
            <label className="flex items-center gap-2 text-sm text-slate-700 sm:col-span-2">
              <input type="checkbox" name="autoSuspendOnCriticalDay" defaultChecked={config.autoSuspendOnCriticalDay} />
              Suspender automáticamente al llegar al día crítico sin pago
            </label>
          </CardContent>
        </Card>

        <Button type="submit">Guardar configuración</Button>
      </form>
    </div>
  );
}
