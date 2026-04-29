import { redirect } from "next/navigation";
import { Brain } from "lucide-react";
import { LoginForm } from "@/components/auth/LoginForm";
import { getSupabaseServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function LoginPage() {
  const supabase = getSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    redirect("/library");
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#0F1117] px-4 py-10 text-[#E2E8F0]">
      <section className="w-full max-w-[420px] rounded-[8px] border border-[#2A2D3E] bg-[#1A1D27] p-6">
        <div className="mb-7 flex items-center gap-3">
          <div className="flex size-10 items-center justify-center rounded-[6px] border border-[#2A2D3E] bg-[#0F1117] text-amber-400">
            <Brain className="size-5" aria-hidden="true" />
          </div>
          <div>
            <h1 className="text-xl font-semibold text-[#E2E8F0]">Sign in to Grimoire</h1>
            <p className="mt-1 text-sm text-[#64748B]">Private access for your second brain.</p>
          </div>
        </div>

        <LoginForm />
      </section>
    </main>
  );
}
