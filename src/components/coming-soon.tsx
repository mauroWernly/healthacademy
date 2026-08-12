import { Card, CardContent } from "@/components/ui/card";

export function ComingSoon({ title, note }: { title: string; note: string }) {
  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold text-slate-900">{title}</h1>
      <Card>
        <CardContent className="py-8 text-center text-sm text-slate-500">{note}</CardContent>
      </Card>
    </div>
  );
}
