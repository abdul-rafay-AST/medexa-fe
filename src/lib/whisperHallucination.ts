const HALLUCINATION_RE =
  /^(?:thank(?:s| you)(?:\s+for\s+watching)?|thanks(?:\s+for\s+watching)?|please\s+subscribe|subtitle(?:s)?\s+by|that'?s\s+all|bye|you)\.?\s*$/i;

export function isLikelyWhisperHallucination(text: string): boolean {
  const clean = text.trim().replace(/\s+/g, " ");
  if (!clean) return true;
  const normalized = clean.toLowerCase().replace(/\.$/, "");
  if ((normalized.match(/thank you/g) || []).length >= 2) return true;
  if ((normalized.match(/thanks/g) || []).length >= 2) return true;
  return HALLUCINATION_RE.test(clean);
}
