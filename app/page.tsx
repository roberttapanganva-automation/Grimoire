import { Brain, Search } from "lucide-react";

export default function Home() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[#0F1117] px-6 text-[#E2E8F0]">
      <section className="card-base w-full max-w-xl p-8">
        <div className="mb-6 flex items-center gap-3">
          <div className="flex size-10 items-center justify-center rounded-[6px] border border-[#2A2D3E] bg-[#21243A] text-[#F59E0B]">
            <Brain className="size-5" aria-hidden="true" />
          </div>
          <div>
            <h1 className="text-xl font-semibold">Second Brain</h1>
            <p className="text-sm text-[#64748B]">Design foundation ready.</p>
          </div>
        </div>
        <label className="block text-sm font-medium text-[#E2E8F0]" htmlFor="search">
          Search preview
        </label>
        <div className="mt-2 flex items-center gap-2 rounded-[4px] border border-[#2A2D3E] bg-[#0F1117] px-3 py-2 transition-colors duration-150 focus-within:border-[#F59E0B] focus-within:ring-1 focus-within:ring-amber-400">
          <Search className="size-4 text-[#64748B]" aria-hidden="true" />
          <input
            id="search"
            className="w-full bg-transparent font-mono text-sm text-[#E2E8F0] outline-none placeholder:text-[#374151]"
            placeholder="prompts, notes, commands..."
            type="search"
          />
        </div>
      </section>
    </main>
  );
}
