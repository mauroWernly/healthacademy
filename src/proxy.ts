import { NextResponse } from "next/server";
import { auth } from "@/server/auth/config";

/**
 * Redirect de conveniencia para UX (evita el flash de una página protegida).
 * NO es la fuente de verdad de autorización: cada Server Action / página
 * vuelve a resolver la sesión y validar permisos server-side.
 */
export default auth((req) => {
  const isLoggedIn = !!req.auth;
  const { pathname } = req.nextUrl;
  const isPublicRoute = pathname.startsWith("/login") || pathname.startsWith("/api/auth");

  if (!isLoggedIn && !isPublicRoute) {
    const loginUrl = new URL("/login", req.nextUrl);
    loginUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(loginUrl);
  }

  if (isLoggedIn && pathname.startsWith("/login")) {
    return NextResponse.redirect(new URL("/dashboard", req.nextUrl));
  }
});

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
