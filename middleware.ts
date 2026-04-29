import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { getSupabaseAnonKey, getSupabaseUrl } from "@/lib/supabase/env";

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({
    request,
  });

  const supabase = createServerClient(getSupabaseUrl(), getSupabaseAnonKey(), {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));

        response = NextResponse.next({
          request,
        });

        cookiesToSet.forEach(({ name, value, options }) => {
          response.cookies.set(name, value, options);
        });
      },
    },
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;
  const isLoginPage = pathname === "/login";
  const isAuthCallback = pathname.startsWith("/auth/callback");
  const isItemApi = pathname.startsWith("/api/items");
  const isCategoryApi = pathname.startsWith("/api/categories");
  const isTagApi = pathname.startsWith("/api/tags");
  const isImportApi = pathname.startsWith("/api/import");
  const isExportApi = pathname.startsWith("/api/export");
  const isLibrary = pathname === "/library" || pathname.startsWith("/library/");
  const isSettings = pathname === "/settings" || pathname.startsWith("/settings/");

  if (!user && (isItemApi || isCategoryApi || isTagApi || isImportApi || isExportApi)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!user && (isLibrary || isSettings)) {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = "/login";
    redirectUrl.searchParams.set("next", pathname);
    return NextResponse.redirect(redirectUrl);
  }

  if (user && isLoginPage) {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = "/library";
    redirectUrl.search = "";
    return NextResponse.redirect(redirectUrl);
  }

  if (isAuthCallback) {
    return response;
  }

  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};
