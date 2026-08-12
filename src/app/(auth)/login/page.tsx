import { LoginForm } from "./login-form";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ callbackUrl?: string }>;
}) {
  const { callbackUrl } = await searchParams;

  return (
    <div className="w-full max-w-sm rounded-xl border border-slate-200 bg-white p-8 shadow-sm">
      <div className="mb-6 text-center">
        <h1 className="text-lg font-semibold text-slate-900">Instituto Superior de Cosmetología Integral</h1>
        <p className="mt-1 text-sm text-slate-500">Sistema de gestión académica</p>
      </div>
      <LoginForm callbackUrl={callbackUrl ?? "/dashboard"} />
      <div className="mt-6 rounded-md bg-slate-50 px-3 py-2 text-xs text-slate-500">
        <p className="font-medium text-slate-600">Usuarios de demostración</p>
        <p>secretaria@cosmetologia.demo / Secretaria123!</p>
        <p>coordinacion@cosmetologia.demo / Coordinador123!</p>
        <p>admin@cosmetologia.demo / Admin123!</p>
      </div>
    </div>
  );
}
