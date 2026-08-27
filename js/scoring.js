// Lightweight heuristic scorer for a submission's description.
// Used as the default scorer so the app works with zero backend setup,
// and as a fallback if the optional ML REST service (ml-service/) is
// unreachable. Keeps the "automated scoring" feature fully client-side
// and deployable as a static Firebase Hosting site.

const KEYWORDS = [
  "water", "save water", "conserve", "conservation", "rainwater",
  "harvest", "harvesting", "drip irrigation", "irrigation", "leak",
  "leakage", "reuse", "recycle", "recycling", "groundwater",
  "sustainable", "sustainability", "drought", "wastage", "waste",
  "greywater", "grey water", "tap", "plumbing", "awareness",
  "community", "borewell", "well", "river", "lake", "pond",
  "tank", "storage", "drip", "sprinkler", "efficient", "efficiency"
];

export function computeSubmissionScore(description) {
  const text = (description || "").trim().toLowerCase();

  if (text.length < 5) return 10;

  // Reward relevant, on-topic keywords (capped so spamming keywords doesn't help much)
  const matches = KEYWORDS.filter(word => text.includes(word)).length;
  const keywordScore = Math.min(matches * 8, 48);

  // Reward a reasonably detailed description
  const lengthScore = Math.min(Math.floor(text.length / 6), 32);

  // Small baseline so any genuine attempt scores something
  const baseScore = 20;

  const total = baseScore + keywordScore + lengthScore;
  return Math.max(10, Math.min(100, total));
}
