interface TagChipProps {
  label: string;
}

export function TagChip({ label }: TagChipProps) {
  return (
    <span className="inline-flex max-w-full items-center rounded-[4px] border border-[#2A2D3E] bg-[#0F1117] px-2 py-1 text-xs font-medium text-[#64748B]">
      <span className="truncate">{label}</span>
    </span>
  );
}
