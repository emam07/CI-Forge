import type { Rule, RuleContext, RuleResult } from "./types";
import { depChangeRule } from "./dep-change";
import { dockerCacheMissRule } from "./docker-cache-miss";
import { newTestFilesRule } from "./new-test-files";
import { runnerChangeRule } from "./runner-change";
import { matrixExpansionRule } from "./matrix-expansion";
import { setupBloatRule } from "./setup-bloat";

interface NamedRule {
  name: string;
  run: Rule;
}

const RULES: NamedRule[] = [
  { name: "runner-change", run: runnerChangeRule },
  { name: "matrix-expansion", run: matrixExpansionRule },
  { name: "dep-change", run: depChangeRule },
  { name: "docker-cache-miss", run: dockerCacheMissRule },
  { name: "new-test-files", run: newTestFilesRule },
  { name: "setup-bloat", run: setupBloatRule }
];

const DEFAULT_CONFIDENCE = 0.5;

export const FALLBACK: RuleResult = {
  matched: true,
  text: "cause unknown — see run logs",
  confidence: 0,
  ruleName: "fallback"
};

export async function attribute(ctx: RuleContext, topN = 3): Promise<RuleResult[]> {
  const matches: RuleResult[] = [];

  for (let i = 0; i < RULES.length; i++) {
    const { name, run } = RULES[i];
    try {
      const r = await run(ctx);
      if (r.matched) {
        matches.push({
          ...r,
          ruleName: name,
          confidence: r.confidence ?? DEFAULT_CONFIDENCE
        });
      }
    } catch (err) {
      console.error(`[rule] ${name} threw`, err);
    }
  }

  if (matches.length === 0) return [FALLBACK];

  matches.sort((a, b) => (b.confidence ?? 0) - (a.confidence ?? 0));
  return matches.slice(0, topN);
}

export type { Rule, RuleContext, RuleResult };
