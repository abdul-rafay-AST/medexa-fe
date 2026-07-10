const HALLUCINATION_RE =
  /^(?:thank(?:s| you)(?:\s+for\s+watching)?|thanks(?:\s+for\s+watching)?|please\s+subscribe|subscribe(?:\s+to\s+my\s+channel)?|subtitle(?:s)?\s+by|that'?s\s+all|bye(?:\s+bye)?|you|okay|mm[- ]?hmm|uh[- ]?huh|\.{1,3})\.?\s*$/i;

const SHORT_FILLER_RE =
  /^(?:yeah|yes|no|okay|ok|right|sure|hello|hi|hey|hmm|um|uh)\.?\s*$/i;

export function isLikelyWhisperHallucination(text: string): boolean {
  const clean = text.trim().replace(/\s+/g, " ");
  if (!clean || clean.length <= 2) return true;
  const normalized = clean.toLowerCase().replace(/\.$/, "");
  if ((normalized.match(/thank you/g) || []).length >= 2) return true;
  if ((normalized.match(/thanks/g) || []).length >= 2) return true;
  if (HALLUCINATION_RE.test(clean)) return true;
  if (clean.split(/\s+/).length <= 2 && SHORT_FILLER_RE.test(clean)) return true;
  return false;
}
