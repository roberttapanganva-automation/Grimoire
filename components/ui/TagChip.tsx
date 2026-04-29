interface TagChipProps {
  label: string;
  isActive?: boolean;
  onClick?: () => void;
}

export function TagChip({ label, isActive = false, onClick }: TagChipProps) {
  const className = `inline-flex max-w-full items-center rounded-[4px] border px-2 py-1 text-xs font-medium transition-colors duration-150 focus:outline-none focus:ring-1 focus:ring-amber-400 ${
    isActive
      ? "border-[#F59E0B] bg-[#F59E0B]/10 text-[#FBBF24]"
      : "border-[#2A2D3E] bg-[#0F1117] text-[#64748B] hover:bg-[#21243A]"
  }`;

  if (onClick) {
    return (
      <button type="button" onClick={onClick} className={className}>
        <span className="truncate">{label}</span>
      </button>
    );
  }

  return (
    <span className={className}>
      <span className="truncate">{label}</span>
    </span>
  );
}
