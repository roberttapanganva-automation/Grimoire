import { NextResponse, type NextRequest } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const supabase = getSupabaseServerClient();
  await supabase.auth.signOut();

  return NextResponse.redirect(new URL("/login", request.url));
}
