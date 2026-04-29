export function getSafeRedirectPath(value: string | null, fallback = "/library") {
  if (!value || !value.startsWith("/") || value.startsWith("//")) {
    return fallback;
  }

  return value;
}
