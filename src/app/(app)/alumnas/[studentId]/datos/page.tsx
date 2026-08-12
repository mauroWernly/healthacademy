import Link from "next/link";
import { getCachedStudentSummary } from "../data";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { formatDate } from "@/lib/utils";
import { auth } from "@/server/auth/config";
import { can } from "@/server/auth/permissions";
import { updateStudentDataAction } from "./actions";

function Field({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div>
      <p className="text-xs uppercase tracking-wide text-stone-400">{label}</p>
      <p className="text-sm text-stone-900">{value || "—"}</p>
    </div>
  );
}

const inputClass = "w-full rounded-md border border-stone-300 px-3 py-1.5 text-sm";

function EditField({
  label,
  name,
  type = "text",
  defaultValue,
}: {
  label: string;
  name: string;
  type?: string;
  defaultValue: string | null | undefined;
}) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-xs uppercase tracking-wide text-stone-400">{label}</label>
      <input type={type} name={name} defaultValue={defaultValue ?? ""} className={inputClass} />
    </div>
  );
}

export default async function DatosPersonalesPage({
  params,
  searchParams,
}: {
  params: Promise<{ studentId: string }>;
  searchParams: Promise<{ editar?: string }>;
}) {
  const { studentId } = await params;
  const { editar } = await searchParams;
  const session = await auth();
  const { student } = await getCachedStudentSummary(studentId);
  const canWrite = can(session!.user.permissions, "student:write");
  const isEditing = canWrite && editar === "1";

  if (!isEditing) {
    return (
      <Card>
        <CardHeader className="flex items-center justify-between">
          <CardTitle>Datos personales</CardTitle>
          {canWrite && (
            <Link href={`/alumnas/${studentId}/datos?editar=1`}>
              <Button size="sm" variant="outline">
                Editar
              </Button>
            </Link>
          )}
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Field label="Nombre" value={student.firstName} />
          <Field label="Apellido" value={student.lastName} />
          <Field label="DNI" value={student.dni} />
          <Field label="Fecha de nacimiento" value={student.birthDate ? formatDate(student.birthDate) : null} />
          <Field label="Lugar de nacimiento" value={student.birthPlace} />
          <Field label="Nacionalidad" value={student.nationality} />
          <Field label="Domicilio" value={student.address} />
          <Field label="Localidad" value={student.city} />
          <Field label="Provincia" value={student.province} />
          <Field label="Teléfono" value={student.phone} />
          <Field label="Email" value={student.email} />
          <Field label="Contacto de emergencia" value={student.emergencyContactName} />
          <Field label="Teléfono de emergencia" value={student.emergencyContactPhone} />
          <div className="sm:col-span-2 lg:col-span-3">
            <Field label="Observaciones" value={student.notes} />
          </div>
        </CardContent>
      </Card>
    );
  }

  const birthDateValue = student.birthDate ? new Date(student.birthDate).toISOString().slice(0, 10) : "";

  return (
    <Card>
      <CardHeader>
        <CardTitle>Editar datos personales</CardTitle>
      </CardHeader>
      <CardContent>
        <form action={updateStudentDataAction} className="space-y-6">
          <input type="hidden" name="studentId" value={studentId} />
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <EditField label="Nombre *" name="firstName" defaultValue={student.firstName} />
            <EditField label="Apellido *" name="lastName" defaultValue={student.lastName} />
            <EditField label="DNI *" name="dni" defaultValue={student.dni} />
            <EditField label="Fecha de nacimiento" name="birthDate" type="date" defaultValue={birthDateValue} />
            <EditField label="Lugar de nacimiento" name="birthPlace" defaultValue={student.birthPlace} />
            <EditField label="Nacionalidad" name="nationality" defaultValue={student.nationality} />
            <EditField label="Domicilio" name="address" defaultValue={student.address} />
            <EditField label="Localidad" name="city" defaultValue={student.city} />
            <EditField label="Provincia" name="province" defaultValue={student.province} />
            <EditField label="Teléfono" name="phone" type="tel" defaultValue={student.phone} />
            <EditField label="Email" name="email" type="email" defaultValue={student.email} />
            <EditField label="Contacto de emergencia" name="emergencyContactName" defaultValue={student.emergencyContactName} />
            <EditField label="Teléfono de emergencia" name="emergencyContactPhone" type="tel" defaultValue={student.emergencyContactPhone} />
          </div>
          <div>
            <label className="text-xs uppercase tracking-wide text-stone-400">Observaciones</label>
            <textarea name="notes" rows={3} defaultValue={student.notes ?? ""} className={`${inputClass} mt-1`} />
          </div>
          <div className="flex justify-end gap-2 border-t border-stone-100 pt-4">
            <Link href={`/alumnas/${studentId}/datos`}>
              <Button type="button" variant="outline">
                Cancelar
              </Button>
            </Link>
            <Button type="submit">Guardar cambios</Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
