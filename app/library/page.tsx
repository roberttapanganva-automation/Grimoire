export default function LibraryPage() {
  return (
    <main className="min-h-screen bg-[#0F1117] px-6 py-10 font-sans text-[#E2E8F0]">
      <section className="mx-auto max-w-4xl rounded-[6px] border border-[#2A2D3E] bg-[#1A1D27] p-6">
        <p className="mb-3 font-mono text-xs font-medium uppercase tracking-wider text-[#F59E0B]">Grimoire</p>
        <h1 className="text-2xl font-semibold">Second Brain Library</h1>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-[#64748B]">
          Foundation is ready. The full library interface will be built here after the base app shell, fonts, Tailwind theme, and route structure are confirmed.
        </p>
        <button
          type="button"
          className="mt-6 rounded-[4px] bg-[#F59E0B] px-4 py-2 text-sm font-semibold text-[#0F1117] transition-colors duration-150 hover:bg-[#FBBF24] focus:outline-none focus:ring-1 focus:ring-amber-400"
        >
          New Item
        </button>
      </section>
    </main>
  );
}
