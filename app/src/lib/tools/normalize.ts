export function normalizeCategoryTitleCase(input: string): string {
  const trimmed = input.trim();
  if (!trimmed) return "";

  return trimmed
    .toLowerCase()
    .split(/\s+/)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}
