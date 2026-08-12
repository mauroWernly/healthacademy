import { getCachedStudentSummary } from "../data";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatDate } from "@/lib/utils";

const STATUS_TONE = { PENDIENTE: "gray", PRESENTADO: "blue", VALIDADO: "green", RECHAZADO: "red" } as const;

export default async function DocumentacionPage({ params }: { params: Promise<{ studentId: string }> }) {
  const { studentId } = await params;
  const summary = await getCachedStudentSummary(studentId);
  const { student } = summary;

  return (
    <Card>
      <CardHeader className="flex items-center justify-between">
        <CardTitle>Documentación</CardTitle>
        {summary.documentationComplete ? (
          <Badge tone="green">Documentación completa</Badge>
        ) : (
          <Badge tone="yellow">Incompleta — faltan {summary.missingDocuments.length}</Badge>
        )}
      </CardHeader>
      <CardContent className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="text-xs uppercase tracking-wide text-slate-500">
            <tr>
              <th className="py-2 pr-4">Documento</th>
              <th className="py-2 pr-4">Estado</th>
              <th className="py-2 pr-4">Cargado</th>
              <th className="py-2 pr-4">Validado</th>
              <th className="py-2 pr-4">Observaciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {student.documents.map((doc) => (
              <tr key={doc.id}>
                <td className="py-2 pr-4 font-medium text-slate-900">{doc.documentType.name}</td>
                <td className="py-2 pr-4">
                  <Badge tone={STATUS_TONE[doc.status]}>{doc.status}</Badge>
                </td>
                <td className="py-2 pr-4 text-slate-600">{doc.uploadedAt ? formatDate(doc.uploadedAt) : "—"}</td>
                <td className="py-2 pr-4 text-slate-600">{doc.validatedAt ? formatDate(doc.validatedAt) : "—"}</td>
                <td className="py-2 pr-4 text-slate-600">{doc.observations ?? "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </CardContent>
    </Card>
  );
}
