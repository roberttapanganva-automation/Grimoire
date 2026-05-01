export function normalizeTags(input: unknown) {
  const rawTags = Array.isArray(input)
    ? input
    : typeof input === "string"
      ? input.trim() === "[]"
        ? []
        : input.split(",")
      : [];
  const seen = new Set<string>();

  return rawTags
    .filter((tag): tag is string => typeof tag === "string")
    .map((tag) =>
      tag
        .trim()
        .toLowerCase()
        .replace(/\s+/g, "-")
        .replace(/[^a-z0-9-]/g, "")
        .replace(/-+/g, "-")
        .replace(/^-|-$/g, ""),
    )
    .filter((tag) => {
      if (!tag || seen.has(tag)) {
        return false;
      }

      seen.add(tag);
      return true;
    });
}
