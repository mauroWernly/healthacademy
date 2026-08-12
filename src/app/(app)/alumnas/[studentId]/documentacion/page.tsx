import { getCachedStudentSummary } from "../data";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatDate } from "@/lib/utils";
import { auth } from "@/server/auth/config";
import { can } from "@/server/auth/permissions";
import { updateDocumentStatusAction } from "./actions";

const STATUS_TONE = { PENDIENTE: "gray", PRESENTADO: "blue", VALIDADO: "green", RECHAZADO: "red" } as const;
const STATUS_OPTIONS = ["PENDIENTE", "PRESENTADO", "VALIDADO", "RECHAZADO"] as const;

export default async function DocumentacionPage({ params }: { params: Promise<{ studentId: string }> }) {
  const { studentId } = await params;
  const session = await auth();
  const summary = await getCachedStudentSummary(studentId);
  const { student } = summary;
  const canWrite = can(session!.user.permissions, "document:write");

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
          <thead className="text-xs uppercase tracking-wide text-stone-500">
            <tr>
              <th className="py-2 pr-4">Documento</th>
              <th className="py-2 pr-4">Estado</th>
              <th className="py-2 pr-4">Cargado</th>
              <th className="py-2 pr-4">Validado</th>
              <th className="py-2 pr-4">Observaciones</th>
              {canWrite && <th className="py-2 pr-4">Actualizar</th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-stone-100">
            {student.documents.map((doc) => (
              <tr key={doc.id}>
                <td className="py-2 pr-4 font-medium text-stone-900">{doc.documentType.name}</td>
                <td className="py-2 pr-4">
                  <Badge tone={STATUS_TONE[doc.status]}>{doc.status}</Badge>
                </td>
                <td className="py-2 pr-4 text-stone-600">{doc.uploadedAt ? formatDate(doc.uploadedAt) : "—"}</td>
                <td className="py-2 pr-4 text-stone-600">{doc.validatedAt ? formatDate(doc.validatedAt) : "—"}</td>
                <td className="py-2 pr-4 text-stone-600">{doc.observations ?? "—"}</td>
                {canWrite && (
                  <td className="py-2 pr-4">
                    <form action={updateDocumentStatusAction} className="flex flex-wrap items-center gap-2">
                      <input type="hidden" name="documentId" value={doc.id} />
                      <input type="hidden" name="studentId" value={studentId} />
                      <select
                        name="status"
                        defaultValue={doc.status}
                        required
                        className="rounded-md border border-stone-300 px-2 py-1 text-xs"
                      >
                        {STATUS_OPTIONS.map((s) => (
                          <option key={s} value={s}>
                            {s}
                          </option>
                        ))}
                      </select>
                      <input
                        type="text"
                        name="observations"
                        defaultValue={doc.observations ?? ""}
                        placeholder="Observaciones"
                        className="w-40 rounded-md border border-stone-300 px-2 py-1 text-xs"
                      />
                      <Button type="submit" size="sm" variant="outline">
                        Guardar
                      </Button>
                    </form>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </CardContent>
    </Card>
  );
}
