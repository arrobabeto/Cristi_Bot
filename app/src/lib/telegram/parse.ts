export function parseMxnToCents(text: string): number | null {
  const match = text.match(/-?\d[\d,]*(?:\.\d+)?\s*k?/i);
  if (!match) return null;

  const raw = match[0].trim().toLowerCase();
  if (raw.startsWith("-")) return null;

  const isK = raw.endsWith("k");
  const numeric = raw.replace(/k$/i, "").replace(/,/g, "");
  const [intPartRaw, decPartRaw] = numeric.split(".");

  if (!intPartRaw) return null;
  const intPart = Number(intPartRaw);
  if (!Number.isInteger(intPart) || intPart < 0) return null;

  const decRaw = (decPartRaw || "").slice(0, 2).padEnd(2, "0");
  const decPart = Number(decRaw || "0");
  if (!Number.isInteger(decPart) || decPart < 0) return null;

  let cents = intPart * 100 + decPart;
  if (isK) cents *= 1000;

  return cents;
}
