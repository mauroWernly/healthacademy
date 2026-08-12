import { getCachedStudentSummary } from "../data";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatDate } from "@/lib/utils";

function Field({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div>
      <p className="text-xs uppercase tracking-wide text-slate-400">{label}</p>
      <p className="text-sm text-slate-900">{value || "—"}</p>
    </div>
  );
}

export default async function DatosPersonalesPage({ params }: { params: Promise<{ studentId: string }> }) {
  const { studentId } = await params;
  const { student } = await getCachedStudentSummary(studentId);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Datos personales</CardTitle>
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
